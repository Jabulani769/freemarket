'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'

interface Props {
  disputeId: string
  currentStatus: string
}

export function DisputeActions({ disputeId, currentStatus }: Props) {
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  if (['resolved_buyer', 'resolved_vendor', 'closed'].includes(currentStatus)) {
    return null
  }

  async function handleResolve(outcome: 'resolved_buyer' | 'resolved_vendor') {
    setLoading(true)

    // If resolved in buyer's favor, trigger refund via PayChangu
    if (outcome === 'resolved_buyer') {
      const { data: disputeOrder } = await supabase
        .from('disputes')
        .select('orders(paychangu_reference)')
        .eq('id', disputeId)
        .single() as { data: { orders?: { paychangu_reference?: string }[] } | null }

      const reference = disputeOrder?.orders?.[0]?.paychangu_reference
      if (reference) {
        try {
          await fetch('/api/paychangu/refund', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reference }),
          })
        } catch (e) {
          console.error('Refund failed:', e)
        }
      }
    }

    const { data: disputeData } = await supabase
      .from('disputes')
      .select('order_id')
      .eq('id', disputeId)
      .single()

    await supabase
      .from('disputes')
      .update({
        status: outcome,
        resolution_notes: resolutionNotes,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', disputeId)

    if (disputeData) {
      const orderStatus = outcome === 'resolved_buyer' ? 'refunded' : 'released'
      await supabase
        .from('orders')
        .update({ status: orderStatus })
        .eq('id', disputeData.order_id)

      // Write ledger entry for refunds
      if (outcome === 'resolved_buyer') {
        await supabase.from('platform_ledger').insert({
          order_id: disputeData.order_id,
          event_type: 'refund_issued',
          amount: 0,
          description: `Refund processed for disputed order ${disputeData.order_id}`,
        })
      }

      // Send notifications
      const { data: order } = await supabase
        .from('orders')
        .select('buyer_id')
        .eq('id', disputeData.order_id)
        .single()

      if (order?.buyer_id) {
        const { data: buyerProfile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', order.buyer_id)
          .single() as { data: { email: string } | null }

        const { data: orderItems } = await supabase
          .from('order_items')
          .select('vendor_id')
          .eq('order_id', disputeData.order_id) as { data: { vendor_id: string }[] | null }

        const vendorIds = orderItems ? [...new Set(orderItems.map((oi) => oi.vendor_id))] : []

        for (const vendorId of vendorIds) {
          const { data: vendor } = await supabase
            .from('vendor_profiles')
            .select('user_id')
            .eq('id', vendorId)
            .single() as { data: { user_id: string } | null }
          if (vendor?.user_id) {
            const { data: vendorProfile } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', vendor.user_id)
              .single() as { data: { email: string } | null }

            if (buyerProfile?.email) {
              fetch('/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'dispute_resolved',
                  order_id: disputeData.order_id,
                  buyer_email: buyerProfile.email,
                  vendor_email: vendorProfile?.email,
                }),
              }).catch(() => {})
            }
          }
        }
      }
    }

    setLoading(false)
    router.refresh()
  }

  return (
    <div className="mt-4 space-y-3 border-t pt-4">
      <div className="space-y-1">
        <Label className="text-xs">Resolution notes</Label>
        <Input value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} placeholder="Add notes..." />
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => handleResolve('resolved_buyer')} disabled={loading}>
          Resolve in buyer&apos;s favor (refund)
        </Button>
        <Button size="sm" onClick={() => handleResolve('resolved_vendor')} disabled={loading}>
          Resolve in vendor&apos;s favor (release)
        </Button>
      </div>
    </div>
  )
}