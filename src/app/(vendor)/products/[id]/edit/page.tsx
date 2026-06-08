'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Plus } from 'lucide-react'

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [productId, setProductId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [basePrice, setBasePrice] = useState('')
  const [status, setStatus] = useState('active')
  const [categoryId, setCategoryId] = useState('')
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { id } = await params
      setProductId(id)

      const { data: product } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()

      if (product) {
        setTitle(product.title)
        setDescription(product.description || '')
        setBasePrice(String(product.base_price))
        setStatus(product.status)
        setCategoryId(product.category_id || '')
      }

      const { data: cats } = await supabase.from('categories').select('id, name')
      if (cats) setCategories(cats)
    }
    init()
  }, [params, supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!productId) return
    setLoading(true)
    setError(null)

    const { error: updateError } = await supabase
      .from('products')
      .update({
        title,
        description,
        base_price: parseFloat(basePrice),
        status,
        category_id: categoryId || null,
      })
      .eq('id', productId)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    router.push('/vendor/products')
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold">Edit Product</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Product details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="basePrice">Base price (MK) *</Label>
                <Input id="basePrice" type="number" step="0.01" min="0" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="deleted">Deleted</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-4">
          <Button type="submit" className="flex-1" size="lg" disabled={loading}>
            {loading ? 'Saving...' : 'Save changes'}
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={() => router.push('/vendor/products')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
