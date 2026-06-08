// Supabase Edge Function - Send email notifications
// Deno environment

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!

interface NotificationPayload {
  type: 'payment_received' | 'order_confirmed' | 'dispute_raised' | 'payout_released' | 'dispute_resolved'
  order_id: string
  buyer_email?: string
  vendor_email?: string
  vendor_id?: string
  admin_email?: string
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.log(`[Email] Would send to ${to}: ${subject}`)
    return
  }

  const response = await fetch('https://api.resend.com/v1/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'Freemarket <noreply@freemarket.mw>',
      to: [to],
      subject,
      html,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error(`Email send failed: ${error}`)
  }
}

serve(async (req: Request) => {
  try {
    const payload: NotificationPayload = await req.json()

    switch (payload.type) {
      case 'payment_received':
        if (payload.buyer_email) {
          await sendEmail(
            payload.buyer_email,
            `Order #${payload.order_id.slice(0, 8)} Confirmed`,
            `<p>Your payment for order #${payload.order_id.slice(0, 8)} has been received. You will receive another notification when the vendor confirms the order.</p>`
          )
        }
        if (payload.vendor_email) {
          await sendEmail(
            payload.vendor_email,
            `New Order #${payload.order_id.slice(0, 8)}`,
            `<p>You have received a new order #${payload.order_id.slice(0, 8)}. Please check your vendor dashboard to manage this order.</p>`
          )
        }
        break

      case 'dispute_raised':
        if (payload.admin_email || payload.vendor_id) {
          // In production, you'd query admin emails from a config table
          await sendEmail(
            'admin@freemarket.mw',
            `Dispute Raised for Order #${payload.order_id.slice(0, 8)}`,
            `<p>A dispute has been raised for order #${payload.order_id.slice(0, 8)}. Please review in the admin dashboard.</p>`
          )
          if (payload.vendor_email) {
            await sendEmail(
              payload.vendor_email,
              `Dispute Raised for Your Order #${payload.order_id.slice(0, 8)}`,
              `<p>A buyer has raised a dispute for your order #${payload.order_id.slice(0, 8)}. Please check the admin dashboard for resolution.</p>`
            )
          }
        }
        break

      case 'dispute_resolved':
        if (payload.buyer_email) {
          await sendEmail(
            payload.buyer_email,
            `Dispute Resolved for Order #${payload.order_id.slice(0, 8)}`,
            `<p>Your dispute for order #${payload.order_id.slice(0, 8)} has been resolved. Check your order details for the outcome.</p>`
          )
        }
        if (payload.vendor_email) {
          await sendEmail(
            payload.vendor_email,
            `Dispute Resolved for Order #${payload.order_id.slice(0, 8)}`,
            `<p>Dispute for your order #${payload.order_id.slice(0, 8)} has been resolved. Check the order details for the outcome.</p>`
          )
        }
        break

      case 'payout_released':
        if (payload.vendor_email) {
          await sendEmail(
            payload.vendor_email,
            `Payout Released for Order #${payload.order_id.slice(0, 8)}`,
            `<p>Your payout for order #${payload.order_id.slice(0, 8)} has been released. Check your earnings for the updated balance.</p>`
          )
        }
        break
    }

    return new Response(JSON.stringify({ message: 'Notification sent' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Notification error:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})