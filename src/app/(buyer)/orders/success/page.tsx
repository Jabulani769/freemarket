import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle } from 'lucide-react'

export default async function OrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string }>
}) {
  const params = await searchParams

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Your order has been confirmed. You will receive a notification once it is processed.
          </p>
          {params.order_id && (
            <p className="text-sm text-muted-foreground">
              Order ID: <span className="font-mono">{params.order_id.slice(0, 8)}</span>
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Link href={params.order_id ? `/orders/${params.order_id}` : '/orders'}>
              <Button className="w-full">View order details</Button>
            </Link>
            <Link href="/products">
              <Button variant="outline" className="w-full">Continue shopping</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
