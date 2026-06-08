import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/commission'
import { formatDate } from '@/lib/utils/dates'

const statusVariant: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  pending: 'warning',
  paid: 'default',
  in_hold: 'warning',
  released: 'success',
  disputed: 'destructive',
  refunded: 'secondary',
  cancelled: 'secondary',
}

export default async function BuyerOrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: orders } = await supabase
    .from('orders')
    .select('*, order_items(product_id, title:products(title), quantity, unit_price, subtotal)')
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-xl font-bold">Freemarket</Link>
          <nav className="flex items-center gap-4">
            <Link href="/products"><Badge variant="outline">Products</Badge></Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-bold">My Orders</h1>

        {(!orders || orders.length === 0) ? (
          <div className="py-12 text-center text-muted-foreground">
            <p>No orders yet</p>
            <Link href="/products" className="mt-4 inline-block text-primary hover:underline">Browse products</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(order.created_at)}
                      </p>
                      <p className="mt-1 font-medium">
                        Order #{order.id.slice(0, 8)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {order.order_items?.length || 0} item(s)
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">MK {formatCurrency(order.subtotal)}</p>
                      <Badge variant={statusVariant[order.status] || 'secondary'} className="mt-1">
                        {order.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
