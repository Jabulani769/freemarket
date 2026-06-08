import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Star } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/commission'

interface SearchParams {
  search?: string
  category?: string
  sort?: string
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('products')
    .select('*, vendor_profiles!inner(shop_name), categories!inner(name)')
    .eq('status', 'active')

  if (params.search) {
    query = query.ilike('title', `%${params.search}%`)
  }

  if (params.category) {
    query = query.eq('category_id', params.category)
  }

  const sortField = params.sort || 'created_at'
  const sortDir = sortField === 'base_price' ? 'asc' : 'desc'
  query = query.order(sortField, { ascending: sortDir === 'asc' })

  const { data: products } = await query

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name')

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-xl font-bold">Freemarket</Link>
          <nav className="flex items-center gap-4">
            <Link href="/cart"><Button variant="ghost">Cart</Button></Link>
            <Link href="/orders"><Button variant="ghost">Orders</Button></Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="w-full shrink-0 lg:w-64">
            <h2 className="mb-4 text-lg font-semibold">Filters</h2>
            <form className="space-y-4">
              <Input
                name="search"
                placeholder="Search products..."
                defaultValue={params.search}
              />
              <div>
                <h3 className="mb-2 text-sm font-medium">Category</h3>
                <div className="space-y-1">
                  <Link
                    href="/products"
                    className={`block text-sm ${!params.category ? 'font-semibold text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    All
                  </Link>
                  {categories?.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/products?category=${cat.id}`}
                      className={`block text-sm ${params.category === cat.id ? 'font-semibold text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium">Sort by</h3>
                <select
                  name="sort"
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  defaultValue={params.sort}
                >
                  <option value="created_at">Newest</option>
                  <option value="base_price">Price: Low to High</option>
                  <option value="rating_avg">Top Rated</option>
                </select>
              </div>
              <Button type="submit" className="w-full">Apply</Button>
            </form>
          </aside>

          <div className="flex-1">
            <div className="mb-4">
              <h1 className="text-2xl font-bold">Products</h1>
              <p className="text-sm text-muted-foreground">
                {products?.length || 0} product{(products?.length || 0) !== 1 ? 's' : ''} found
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products?.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="group"
                >
                  <div className="overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md">
                    <div className="aspect-square bg-muted">
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
                    <div className="p-4">
                      <p className="text-xs text-muted-foreground">
                        {product.vendor_profiles?.shop_name}
                      </p>
                      <h3 className="mt-1 font-medium group-hover:text-primary">
                        {product.title}
                      </h3>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs font-medium">
                            {Number(product.rating_avg).toFixed(1)}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          ({product.rating_count})
                        </span>
                      </div>
                      <p className="mt-2 text-lg font-bold">
                        MK {formatCurrency(product.base_price)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
              {(!products || products.length === 0) && (
                <div className="col-span-full py-12 text-center text-muted-foreground">
                  No products found. Check back later!
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
