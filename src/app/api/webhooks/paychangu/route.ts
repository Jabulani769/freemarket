import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyWebhookSignature } from '@/lib/paychangu/client'
import { calculateCommission, calculatePayout } from '@/lib/utils/commission'
import { holdReleaseDate } from '@/lib/utils/dates'
import Decimal from 'decimal.js'

interface WebhookPayload {
  tx_ref: string
  status: string
}

interface OrderItem {
  vendor_id: string
  variant_id: string
  quantity: number
  subtotal: number
}

interface OrderWithItems {
  id: string
  buyer_id: string
  payment_status: string
  subtotal: number
  order_items: OrderItem[]
}

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const signature = request.headers.get('paychangu-signature') || ''

    // Verify webhook signature
    const secret = process.env.PAYCHANGU_WEBHOOK_SECRET!
    if (!verifyWebhookSignature(body, signature, secret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload = JSON.parse(body) as WebhookPayload
    const { tx_ref, status } = payload

    if (status !== 'successful') {
      return NextResponse.json({ message: 'Payment not successful' })
    }

    const supabase = await createAdminClient()

    // Find order by paychangu reference
    const { data: order } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('paychangu_reference', tx_ref)
      .single() as { data: OrderWithItems | null }

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.payment_status === 'paid') {
      return NextResponse.json({ message: 'Already processed' })
    }

    const now = new Date()
    const releaseDate = holdReleaseDate(now)

    // Update order
    await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        paid_at: now.toISOString(),
        hold_release_at: releaseDate.toISOString(),
        status: 'in_hold',
      })
      .eq('id', order.id)

    // Write platform ledger entries
    const subtotalDec = new Decimal(order.subtotal)
    const commissionDec = calculateCommission(subtotalDec)

    await supabase.from('platform_ledger').insert([
      {
        order_id: order.id,
        event_type: 'payment_received',
        amount: order.subtotal,
        description: `Payment received for order ${order.id}`,
      },
      {
        order_id: order.id,
        event_type: 'commission_earned',
        amount: Number(commissionDec.toFixed(2)),
        description: `Platform commission (5%) for order ${order.id}`,
      },
    ])

    // Create payouts for each vendor in the order
    const vendorItems: Record<string, OrderItem[]> = {}
    order.order_items.forEach((item) => {
      if (!vendorItems[item.vendor_id]) vendorItems[item.vendor_id] = []
      vendorItems[item.vendor_id].push(item)
    })

    for (const [vendorId, items] of Object.entries(vendorItems)) {
      const vendorSubtotal = items.reduce((sum, item) => sum + Number(item.subtotal), 0)
      const vendorPayout = calculatePayout(new Decimal(vendorSubtotal))

      await supabase.from('payouts').insert({
        vendor_id: vendorId,
        order_id: order.id,
        amount: Number(vendorPayout.toFixed(2)),
        status: 'scheduled',
        scheduled_at: releaseDate.toISOString(),
      })

      // Add to vendor pending balance
      const { data: vendor } = await supabase
        .from('vendor_profiles')
        .select('pending_balance')
        .eq('id', vendorId)
        .single() as { data: { pending_balance: number } | null }

      if (vendor) {
        const newPending = Number(vendor.pending_balance) + Number(vendorPayout.toFixed(2))
        await supabase
          .from('vendor_profiles')
          .update({ pending_balance: newPending })
          .eq('id', vendorId)
      }
    }

    // Decrement stock quantities
    for (const item of order.order_items) {
      const { data: variant } = await supabase
        .from('product_variants')
        .select('stock_quantity')
        .eq('id', item.variant_id)
        .single() as { data: { stock_quantity: number } | null }

      if (variant) {
        const newStock = Math.max(0, variant.stock_quantity - item.quantity)
        await supabase
          .from('product_variants')
          .update({ stock_quantity: newStock })
          .eq('id', item.variant_id)
      }
    }

    // Send notifications
    const { data: buyerProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', order.buyer_id)
      .single() as { data: { email: string } | null }

    const buyerEmail = buyerProfile?.email

    for (const item of order.order_items) {
      const { data: vendor } = await supabase
        .from('vendor_profiles')
        .select('user_id')
        .eq('id', item.vendor_id)
        .single() as { data: { user_id: string } | null }
      if (vendor?.user_id) {
        const { data: vendorProfile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', vendor.user_id)
          .single() as { data: { email: string } | null }
        if (vendorProfile?.email) {
          fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'payment_received',
              order_id: order.id,
              buyer_email: buyerEmail,
              vendor_email: vendorProfile.email,
            }),
          }).catch(() => {})
        }
      }
    }

    return NextResponse.json({ message: 'Payment processed successfully' })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}