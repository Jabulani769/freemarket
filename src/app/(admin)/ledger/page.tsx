import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/commission'
import { formatDateTime } from '@/lib/utils/dates'

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ event_type?: string; page?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/products')

  const page = parseInt(params.page || '1')
  const pageSize = 20

  let query = supabase
    .from('platform_ledger')
    .select('*', { count: 'exact' })

  if (params.event_type) {
    query = query.eq('event_type', params.event_type)
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data: entries, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  const totalPages = Math.ceil((count || 0) / pageSize)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Platform Ledger</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Financial Events</CardTitle>
            <div className="flex gap-2">
              <a href="/admin/ledger" className={`text-sm ${!params.event_type ? 'font-semibold' : 'text-muted-foreground hover:text-foreground'}`}>All</a>
              <a href="/admin/ledger?event_type=payment_received" className={`text-sm ${params.event_type === 'payment_received' ? 'font-semibold' : 'text-muted-foreground hover:text-foreground'}`}>Payments</a>
              <a href="/admin/ledger?event_type=commission_earned" className={`text-sm ${params.event_type === 'commission_earned' ? 'font-semibold' : 'text-muted-foreground hover:text-foreground'}`}>Commission</a>
              <a href="/admin/ledger?event_type=payout_released" className={`text-sm ${params.event_type === 'payout_released' ? 'font-semibold' : 'text-muted-foreground hover:text-foreground'}`}>Payouts</a>
              <a href="/admin/ledger?event_type=refund_issued" className={`text-sm ${params.event_type === 'refund_issued' ? 'font-semibold' : 'text-muted-foreground hover:text-foreground'}`}>Refunds</a>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(!entries || entries.length === 0) ? (
            <p className="text-sm text-muted-foreground">No ledger entries</p>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <Badge variant="outline" className="text-xs">{entry.event_type}</Badge>
                    <p className="mt-1 text-sm text-muted-foreground">{entry.description}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(entry.created_at)}</p>
                  </div>
                  <p className="font-medium">MK {formatCurrency(entry.amount)}</p>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              {page > 1 && (
                <a href={`/admin/ledger?page=${page - 1}${params.event_type ? `&event_type=${params.event_type}` : ''}`} className="text-sm text-primary hover:underline">
                  Previous
                </a>
              )}
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              {page < totalPages && (
                <a href={`/admin/ledger?page=${page + 1}${params.event_type ? `&event_type=${params.event_type}` : ''}`} className="text-sm text-primary hover:underline">
                  Next
                </a>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
