import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/commission'
import { formatDate, formatDateTime } from '@/lib/utils/dates'
import { OrderDetailClient } from './order-detail-client'

const statusVariant: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  pending: 'warning',
  paid: 'default',
  in_hold: 'warning',
  released: 'success',
  disputed: 'destructive',
  refunded: 'secondary',
  cancelled: 'secondary',
}

const statusSteps: Record<string, number> = {
  pending: 0,
  paid: 1,
  in_hold: 2,
  released: 3,
  disputed: -1,
  refunded: -1,
  cancelled: -1,
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: order } = await supabase
    .from('orders')
    .select('*, order_items(*, products(title, images), product_variants(name))')
    .eq('id', id)
    .single()

  if (!order) notFound()

  const isBuyer = order.buyer_id === user.id

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
        {/* Order Status Progress */}
        <div className="mb-8">
          {['disputed', 'refunded', 'cancelled'].includes(order.status) ? (
            <div className="flex items-center justify-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-primary-foreground">
                !
              </div>
              <span className="ml-2 text-sm font-medium capitalize">{order.status.replace('_', ' ')}</span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              {['pending', 'paid', 'in_hold', 'released'].map((step, i) => {
                const stepIdx = statusSteps[step]
                const currentIdx = statusSteps[order.status as string] ?? 0
                const isComplete = stepIdx <= currentIdx
                const isCurrent = step === order.status

                return (
                  <div key={step} className="flex flex-col items-center">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                        isComplete ? 'bg-primary text-primary-foreground' : isCurrent ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {i + 1}
                    </div>
                    <span className="mt-1 text-xs capitalize">{step.replace('_', ' ')}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Items */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Items ({totalItems})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.order_items?.map((item: any) => (
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

        {/* Order Summary */}
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

        {/* Notes Thread */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Order Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderDetailClient orderId={order.id} notes={notes || []} userId={user.id} isBuyer={isBuyer} orderStatus={order.status} items={order.order_items} />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
