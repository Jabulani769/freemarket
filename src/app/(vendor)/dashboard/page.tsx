import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, ShoppingBag, TrendingUp, DollarSign } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/commission'

export default async function VendorDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: vendorProfile } = await supabase
    .from('vendor_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!vendorProfile) redirect('/onboarding')

  const { data: products } = await supabase
    .from('products')
    .select('id', { count: 'exact' })
    .eq('vendor_id', vendorProfile.id)

  const { data: orders } = await supabase
    .from('order_items')
    .select('id, order_id', { count: 'exact' })
    .eq('vendor_id', vendorProfile.id)

  const productCount = products?.length || 0
  const orderCount = orders?.length || 0

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold">Freemarket</Link>
            <span className="text-sm text-muted-foreground">Vendor Dashboard</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/vendor/products/new"><Button>New product</Button></Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">{vendorProfile.shop_name}</h1>
          <p className="text-muted-foreground">Vendor dashboard</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{productCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Orders</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{orderCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">MK {formatCurrency(vendorProfile.balance)}</p>
              <p className="text-xs text-muted-foreground">
                Pending: MK {formatCurrency(vendorProfile.pending_balance)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">MK {formatCurrency(Number(vendorProfile.balance) + Number(vendorProfile.pending_balance))}</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <Link href="/vendor/products">
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle>Manage Products</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Add, edit, or pause your product listings</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/vendor/orders">
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle>View Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Manage incoming orders and communicate with buyers</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/vendor/earnings">
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle>Earnings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">View your balance, pending payouts, and transaction history</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
