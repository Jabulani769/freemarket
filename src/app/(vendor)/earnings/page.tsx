import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/commission'
import { formatDate } from '@/lib/utils/dates'
import { DollarSign, Clock, ArrowUpRight } from 'lucide-react'

export default async function EarningsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: vendorProfile } = await supabase
    .from('vendor_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!vendorProfile) redirect('/onboarding')

  const { data: payouts } = await supabase
    .from('payouts')
    .select('*')
    .eq('vendor_id', vendorProfile.id)
    .order('scheduled_at', { ascending: false })

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Earnings</h1>

      <div className="mb-8 grid gap-6 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">MK {formatCurrency(vendorProfile.balance)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">MK {formatCurrency(vendorProfile.pending_balance)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              MK {formatCurrency(Number(vendorProfile.balance) + Number(vendorProfile.pending_balance))}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
        </CardHeader>
        <CardContent>
          {(!payouts || payouts.length === 0) ? (
            <p className="text-sm text-muted-foreground">No payouts yet</p>
          ) : (
            <div className="space-y-3">
              {payouts.map((payout) => (
                <div key={payout.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div>
                    <p className="text-sm font-medium">MK {formatCurrency(payout.amount)}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(payout.scheduled_at)}</p>
                  </div>
                  <Badge
                    variant={payout.status === 'paid' ? 'success' : payout.status === 'processing' ? 'warning' : payout.status === 'failed' ? 'destructive' : 'secondary'}
                  >
                    {payout.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
