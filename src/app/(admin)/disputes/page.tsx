import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/utils/dates'
import { DisputeActions } from './dispute-actions'

const statusVariant: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  open: 'destructive',
  under_review: 'warning',
  resolved_buyer: 'secondary',
  resolved_vendor: 'secondary',
  closed: 'default',
}

export default async function AdminDisputesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/products')

  const { data: disputes } = await supabase
    .from('disputes')
    .select('*, orders(buyer_id), profiles!raised_by(full_name)')
    .order('created_at', { ascending: false })

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Disputes</h1>

      {(!disputes || disputes.length === 0) ? (
        <div className="py-12 text-center text-muted-foreground">
          <p>No disputes</p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map((dispute) => (
            <Card key={dispute.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariant[dispute.status] || 'default'}>{dispute.status}</Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(dispute.created_at)}</span>
                    </div>
                    <p className="mt-2 text-sm font-medium">Raised by: {dispute.profiles?.full_name || 'Unknown'}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{dispute.reason}</p>
                    {dispute.resolution_notes && (
                      <p className="mt-2 text-sm italic text-muted-foreground">
                        Resolution: {dispute.resolution_notes}
                      </p>
                    )}
                  </div>
                </div>
                <DisputeActions disputeId={dispute.id} currentStatus={dispute.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
