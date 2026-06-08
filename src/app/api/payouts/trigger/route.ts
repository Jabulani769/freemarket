import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendPayout } from '@/lib/paychangu/client'

interface PayoutRow {
  id: string
  vendor_id: string
  order_id: string
  amount: number
  status: string
  scheduled_at: string
  vendor_profiles: { bank_account_number: string; bank_name: string; user_id: string }[]
  orders: { paychangu_reference: string; status: string }[]
}

export async function POST(request: Request) {
  try {
    const supabase = await createAdminClient()

    // Verify admin auth
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Find scheduled payouts that are ready
    const { data: allPayouts } = await supabase
      .from('payouts')
      .select('*, vendor_profiles!inner(bank_account_number, bank_name, user_id), orders!inner(id, paychangu_reference, status)')
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString()) as { data: PayoutRow[] | null }

    const payouts = (allPayouts || []).filter((p) => p.orders?.[0]?.status !== 'disputed')

    if (!payouts || payouts.length === 0) {
      return NextResponse.json({ message: 'No payouts to process' })
    }

    const results: { id: string; status: string; message?: string }[] = []

    for (const payout of payouts) {
      // Mark as processing
      await supabase
        .from('payouts')
        .update({ status: 'processing' })
        .eq('id', payout.id)

      // Process via PayChangu
      const paychanguRef = `PO-${payout.id}-${Date.now()}`
      const result = await sendPayout({
        amount: Number(payout.amount),
        reference: paychanguRef,
        bank_code: payout.vendor_profiles?.[0]?.bank_name || '',
        account_number: payout.vendor_profiles?.[0]?.bank_account_number || '',
        account_name: '',
      })

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
        const vendor = await supabase
          .from('vendor_profiles')
          .select('balance, pending_balance')
          .eq('id', payout.vendor_id)
          .single()

        if (vendor.data) {
          const newPending = Number(vendor.data.pending_balance) - Number(payout.amount)
          const newBalance = Number(vendor.data.balance) + Number(payout.amount)
          await supabase
            .from('vendor_profiles')
            .update({
              pending_balance: Math.max(0, newPending),
              balance: newBalance,
            })
            .eq('id', payout.vendor_id)
        }

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

    return NextResponse.json({
      message: `Processed ${results.length} payouts`,
      results,
    })
  } catch (error) {
    console.error('Payout trigger error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}