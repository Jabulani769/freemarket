import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/commission'
import { formatDate, formatDateTime } from '@/lib/utils/dates'
import { VendorOrderDetailClient } from './vendor-order-detail-client'

const statusVariant: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  pending: 'warning',
  paid: 'default',
  in_hold: 'warning',
  released: 'success',
  disputed: 'destructive',
  refunded: 'secondary',
  cancelled: 'secondary',
}

export default async function VendorOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: vendorProfile } = await supabase
    .from('vendor_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!vendorProfile) redirect('/onboarding')

  const { data: order } = await supabase
    .from('orders')
    .select('*, order_items(*, products(title, images), product_variants(name))')
    .eq('id', id)
    .single()

  if (!order) notFound()

  const isVendor = order.order_items?.some((item: any) => item.vendor_id === vendorProfile.id)
  if (!isVendor) notFound()

  const { data: notes } = await supabase
    .from('order_notes')
    .select('*, profiles(full_name)')
    .eq('order_id', id)
    .order('created_at', { ascending: true })

  const totalItems = order.order_items?.reduce((sum: number, i: any) => sum + i.quantity, 0) || 0

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <h1 className="text-lg font-bold">Order #{order.id.slice(0, 8)}</h1>
          <Badge variant={statusVariant[order.status] || 'secondary'}>{order.status}</Badge>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Items ({totalItems})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.order_items?.filter((item: any) => item.vendor_id === vendorProfile.id).map((item: any) => (
              <div key={item.id} className="flex items-center gap-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                  {item.products?.images?.[0] ? (
                    <img src={item.products.images[0]} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No img</div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{item.products?.title}</p>
                  <p className="text-sm text-muted-foreground">{item.product_variants?.name}</p>
                  <p className="text-sm text-muted-foreground">Qty: {item.quantity} x MK {formatCurrency(item.unit_price)}</p>
                </div>
                <p className="font-medium">MK {formatCurrency(item.subtotal)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>MK {formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Platform fee (5%)</span>
              <span>MK {formatCurrency(order.platform_commission)}</span>
            </div>
            {order.paid_at && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Paid at</span>
                <span>{formatDateTime(order.paid_at)}</span>
              </div>
            )}
            {order.hold_release_at && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Est. release</span>
                <span>{formatDate(order.hold_release_at)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Order Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <VendorOrderDetailClient orderId={order.id} notes={notes || []} userId={user.id} />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}