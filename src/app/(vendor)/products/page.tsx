import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/commission'

export default async function VendorProductsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: vendorProfile } = await supabase
    .from('vendor_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!vendorProfile) redirect('/onboarding')

  const { data: products } = await supabase
    .from('products')
    .select('*, product_variants(*)')
    .eq('vendor_id', vendorProfile.id)
    .order('created_at', { ascending: false })

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Products</h1>
        <Link href="/vendor/products/new"><Button>New product</Button></Link>
      </div>

      {(!products || products.length === 0) ? (
        <div className="py-12 text-center text-muted-foreground">
          <p>No products yet</p>
          <Link href="/vendor/products/new"><Button variant="outline" className="mt-4">Create your first product</Button></Link>
        </div>
      ) : (
        <div className="space-y-4">
          {products.map((product) => (
            <div key={product.id} className="flex items-center gap-4 rounded-lg border p-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                {product.images?.[0] ? (
                  <img src={product.images[0]} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No img</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{product.title}</h3>
                <p className="text-sm text-muted-foreground">
                  MK {formatCurrency(product.base_price)} &middot; {product.product_variants?.length || 0} variants
                </p>
              </div>
              <Badge variant={product.status === 'active' ? 'success' : product.status === 'paused' ? 'warning' : 'secondary'}>
                {product.status}
              </Badge>
              <div className="flex gap-2">
                <Link href={`/vendor/products/${product.id}/edit`}>
                  <Button variant="outline" size="sm">Edit</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
