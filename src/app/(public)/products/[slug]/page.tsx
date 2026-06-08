import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Star } from 'lucide-react'
import { ProductDetailClient } from './product-detail-client'

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: product } = await supabase
    .from('products')
    .select('*, vendor_profiles(shop_name, id), categories(name), product_variants(*)')
    .eq('id', slug)
    .eq('status', 'active')
    .single()

  if (!product) {
    notFound()
  }

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, profiles(full_name)')
    .eq('product_id', slug)
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-xl font-bold">Freemarket</Link>
          <nav className="flex items-center gap-4">
            <Link href="/products"><Button variant="ghost">Products</Button></Link>
            <Link href="/cart"><Button variant="ghost">Cart</Button></Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <div className="aspect-square overflow-hidden rounded-lg bg-muted">
              {product.images?.[0] ? (
                <img
                  src={product.images[0]}
                  alt={product.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No image
                </div>
              )}
            </div>
            {product.images && product.images.length > 1 && (
              <div className="mt-4 flex gap-2 overflow-x-auto">
                {product.images.map((img: string, i: number) => (
                  <div key={i} className="h-20 w-20 shrink-0 overflow-hidden rounded-md border bg-muted">
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-sm text-muted-foreground">
              {product.vendor_profiles?.shop_name}
            </p>
            <h1 className="mt-1 text-2xl font-bold">{product.title}</h1>

            {product.categories && (
              <Badge variant="secondary" className="mt-2">
                {product.categories.name}
              </Badge>
            )}

            <div className="mt-4 flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= Math.round(Number(product.rating_avg))
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {Number(product.rating_avg).toFixed(1)} ({product.rating_count} reviews)
              </span>
            </div>

            <ProductDetailClient
              product={product}
              reviews={reviews || []}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
