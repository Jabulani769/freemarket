import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
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

export default async function VendorOrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: vendorProfile } = await supabase
    .from('vendor_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!vendorProfile) redirect('/onboarding')

  const { data: orderItems } = await supabase
    .from('order_items')
    .select('*, order!inner(id, status, created_at, subtotal, buyer_id), products(title)')
    .eq('vendor_id', vendorProfile.id)
    .order('created_at', { ascending: false })

  const orderMap = new Map()
  orderItems?.forEach((item: any) => {
    const orderId = item.order?.id
    if (!orderMap.has(orderId)) {
      orderMap.set(orderId, {
        ...item.order,
        items: [],
      })
    }
    orderMap.get(orderId).items.push(item)
  })

  const orders = Array.from(orderMap.values())

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Orders</h1>

      {orders.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <p>No orders yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => (
            <Link key={order.id} href={`/vendor/orders/${order.id}`}>
              <div className="flex items-center gap-4 rounded-lg border p-4 transition-shadow hover:shadow-md">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">{formatDate(order.created_at)}</p>
                  <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                  <p className="text-sm text-muted-foreground">{order.items.length} item(s)</p>
                </div>
                <div className="text-right">
                  <Badge variant={statusVariant[order.status] || 'secondary'}>{order.status}</Badge>
                  <p className="mt-1 font-medium">MK {formatCurrency(order.subtotal)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}