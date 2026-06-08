import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { initiatePayment } from '@/lib/paychangu/client'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { orderId, amount, customerEmail, customerName } = body

    if (!orderId || !amount || !customerEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const reference = `FM-${orderId}-${Date.now()}`

    const payment = await initiatePayment({
      amount,
      reference,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/paychangu`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/orders/success?order_id=${orderId}`,
      customer: {
        email: customerEmail,
        name: customerName,
      },
    })

    if (payment.status !== 'success') {
      return NextResponse.json({ error: payment.message }, { status: 400 })
    }

    // Update order with paychangu reference
    await supabase
      .from('orders')
      .update({ paychangu_reference: reference })
      .eq('id', orderId)

    return NextResponse.json({
      checkout_url: payment.data?.checkout_url,
      reference,
    })
  } catch (error) {
    console.error('Payment initiation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
