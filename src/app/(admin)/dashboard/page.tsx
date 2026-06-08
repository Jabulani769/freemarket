import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/commission'
import { DollarSign, ShoppingBag, Store, AlertTriangle } from 'lucide-react'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/products')

  const { data: revenueData } = await supabase
    .from('platform_ledger')
    .select('amount')
    .eq('event_type', 'commission_earned')

  const totalRevenue = revenueData?.reduce((sum, r) => sum + Number(r.amount), 0) || 0

  const { count: vendorCount } = await supabase
    .from('vendor_profiles')
    .select('*', { count: 'exact', head: true })

  const { count: disputeCount } = await supabase
    .from('disputes')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'open')

  const { count: productCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold">Admin Dashboard</h1>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">MK {formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
            <ShoppingBag className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{productCount || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Vendors</CardTitle>
            <Store className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{vendorCount || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Disputes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{disputeCount || 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <a href="/admin/disputes" className="block">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader><CardTitle>Manage Disputes</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">Review and resolve open disputes</p></CardContent>
          </Card>
        </a>
        <a href="/admin/vendors" className="block">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader><CardTitle>Vendor Verification</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">Review and verify vendor identity documents</p></CardContent>
          </Card>
        </a>
        <a href="/admin/ledger" className="block">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader><CardTitle>Platform Ledger</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">View financial activity and transaction history</p></CardContent>
          </Card>
        </a>
      </div>
    </div>
  )
}
