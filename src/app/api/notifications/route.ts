import { NextResponse } from 'next/server'

interface NotificationPayload {
  type: 'payment_received' | 'order_confirmed' | 'dispute_raised' | 'payout_released' | 'dispute_resolved'
  order_id: string
  buyer_email?: string
  vendor_email?: string
}

async function sendEmail(to: string, subject: string, html: string) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    console.log(`[Email] Would send to ${to}: ${subject}`)
    return
  }

  const response = await fetch('https://api.resend.com/v1/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: 'Freemarket <noreply@freemarket.mw>',
      to: [to],
      subject,
      html,
    }),
  })

  if (!response.ok) {
    console.error(`Email send failed for ${to}`)
  }
}

export async function POST(request: Request) {
  try {
    const payload: NotificationPayload = await request.json()

    switch (payload.type) {
      case 'payment_received':
        if (payload.buyer_email) {
          await sendEmail(
            payload.buyer_email,
            `Order #${payload.order_id.slice(0, 8)} Confirmed`,
            `<p>Your payment for order #${payload.order_id.slice(0, 8)} has been received.</p>`
          )
        }
        if (payload.vendor_email) {
          await sendEmail(
            payload.vendor_email,
            `New Order #${payload.order_id.slice(0, 8)}`,
            `<p>You have received a new order #${payload.order_id.slice(0, 8)}. Check your vendor dashboard.</p>`
          )
        }
        break

      case 'dispute_raised':
        if (payload.vendor_email) {
          await sendEmail(
            payload.vendor_email,
            `Dispute Raised for Order #${payload.order_id.slice(0, 8)}`,
            `<p>A buyer has raised a dispute for your order #${payload.order_id.slice(0, 8)}.</p>`
          )
        }
        await sendEmail(
          'admin@freemarket.mw',
          `Dispute Raised for Order #${payload.order_id.slice(0, 8)}`,
          `<p>A dispute has been raised for order #${payload.order_id.slice(0, 8)}.</p>`
        )
        break

      case 'dispute_resolved':
        if (payload.buyer_email) {
          await sendEmail(
            payload.buyer_email,
            `Dispute Resolved for Order #${payload.order_id.slice(0, 8)}`,
            `<p>Your dispute for order #${payload.order_id.slice(0, 8)} has been resolved.</p>`
          )
        }
        break

      case 'payout_released':
        if (payload.vendor_email) {
          await sendEmail(
            payload.vendor_email,
            `Payout Released for Order #${payload.order_id.slice(0, 8)}`,
            `<p>Your payout for order #${payload.order_id.slice(0, 8)} has been released.</p>`
          )
        }
        break
    }

    return NextResponse.json({ message: 'Notification sent' })
  } catch (error) {
    console.error('Notification error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}