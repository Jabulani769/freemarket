import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { initiatePayment } from '@/lib/paychangu/client'
import Decimal from 'decimal.js'

interface VariantData {
  stock_quantity: number
  price_override: number | null
  product_id: string
  products: { base_price: number; vendor_id: string }[]
}

interface CheckoutItem {
  productId: string
  variantId: string
  quantity: number
}

export async function POST(request: Request) {
  try {
    const supabase = await createAdminClient()

    // Verify auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { items, phone } = body as { items: CheckoutItem[]; phone: string }

    if (!items || !Array.isArray(items) || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate all items against database
    let subtotal = new Decimal(0)
    const validatedItems: any[] = []

    for (const item of items) {
      const { data: variant } = await supabase
        .from('product_variants')
        .select('stock_quantity, price_override, product_id, products!inner(base_price, vendor_id)')
        .eq('id', item.variantId)
        .single() as { data: VariantData | null }

      if (!variant || variant.stock_quantity < item.quantity) {
        return NextResponse.json({ error: `Item ${item.variantId} is out of stock or unavailable` }, { status: 400 })
      }

      const price = variant.price_override ?? variant.products[0].base_price
      subtotal = subtotal.add(new Decimal(price).mul(item.quantity))
      validatedItems.push({
        ...item,
        vendorId: variant.products[0].vendor_id,
        price,
      })
    }

    // Update profile
    await supabase.from('profiles').update({ phone }).eq('id', user.id)

    // Create order
    const commission = subtotal.mul(0.05)
    const vendorPayout = subtotal.minus(commission)

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        buyer_id: user.id,
        subtotal: Number(subtotal.toFixed(2)),
        platform_commission: Number(commission.toFixed(2)),
        vendor_payout: Number(vendorPayout.toFixed(2)),
      })
      .select()
      .single()

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 400 })
    }

    // Create order items
    const orderItems = validatedItems.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      variant_id: item.variantId,
      vendor_id: item.vendorId,
      quantity: item.quantity,
      unit_price: item.price,
      subtotal: Number(new Decimal(item.price).mul(item.quantity).toFixed(2)),
    }))

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems)

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 400 })
    }

    // Initiate payment
    const reference = `FM-${order.id}-${Date.now()}`
    const total = Number(subtotal.mul(1.05).toFixed(2))

    const payment = await initiatePayment({
      amount: total,
      reference,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/paychangu`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/orders/success?order_id=${order.id}`,
      customer: {
        email: user.email!,
        name: user.user_metadata?.full_name,
      },
    })

    if (payment.status !== 'success') {
      return NextResponse.json({ error: payment.message }, { status: 400 })
    }

    // Update order with reference
    await supabase
      .from('orders')
      .update({ paychangu_reference: reference })
      .eq('id', order.id)

    return NextResponse.json({
      orderId: order.id,
      checkout_url: payment.data?.checkout_url,
      reference,
    })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}