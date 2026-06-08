// Supabase Edge Function - Runs on cron schedule
// Deno environment

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const PAYCHANGU_SECRET_KEY = Deno.env.get('PAYCHANGU_SECRET_KEY')!

serve(async (_req: Request) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Find scheduled payouts that are ready
    const { data: payouts, error: fetchError } = await supabase
      .from('payouts')
      .select('*, vendor_profiles!inner(id, bank_account_number, bank_name, balance, pending_balance), orders!inner(paychangu_reference, status)')
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString())
      .not('orders.status', 'eq', 'disputed')

    if (fetchError || !payouts || payouts.length === 0) {
      return new Response(JSON.stringify({ message: 'No payouts to process' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const results: any[] = []

    for (const payout of payouts) {
      // Mark as processing
      await supabase
        .from('payouts')
        .update({ status: 'processing' })
        .eq('id', payout.id)

      const paychanguRef = `PO-${payout.id}-${Date.now()}`

      // Call PayChangu payout API
      const payoutResponse = await fetch('https://api.paychangu.com/v1/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PAYCHANGU_SECRET_KEY}`,
        },
        body: JSON.stringify({
          amount: Number(payout.amount),
          currency: 'MWK',
          tx_ref: paychanguRef,
          bank_code: payout.vendor_profiles?.bank_name || '',
          account_number: payout.vendor_profiles?.bank_account_number || '',
          account_name: '',
        }),
      })

      const result = await payoutResponse.json()

      if (result.status === 'success') {
        // Update payout
        await supabase
          .from('payouts')
          .update({
            status: 'paid',
            paychangu_reference: paychanguRef,
            paid_at: new Date().toISOString(),
          })
          .eq('id', payout.id)

        // Update vendor balances
        const newPending = Math.max(0, Number(payout.vendor_profiles.pending_balance) - Number(payout.amount))
        const newBalance = Number(payout.vendor_profiles.balance) + Number(payout.amount)

        await supabase
          .from('vendor_profiles')
          .update({
            pending_balance: newPending,
            balance: newBalance,
          })
          .eq('id', payout.vendor_id)

        // Write ledger entry
        await supabase.from('platform_ledger').insert({
          order_id: payout.order_id,
          event_type: 'payout_released',
          amount: payout.amount,
          description: `Payout released for order ${payout.order_id}`,
        })

        results.push({ id: payout.id, status: 'paid' })
      } else {
        await supabase
          .from('payouts')
          .update({ status: 'failed' })
          .eq('id', payout.id)

        results.push({ id: payout.id, status: 'failed', message: result.message })
      }
    }

    return new Response(
      JSON.stringify({ message: `Processed ${results.length} payouts`, results }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Payout processing error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
