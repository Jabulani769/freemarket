'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Plus } from 'lucide-react'

interface VariantRow {
  id: string
  name: string
  options: Record<string, string>
  price_override: string
  stock_quantity: string
  sku: string
}

export default function NewProductPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [basePrice, setBasePrice] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [categories, setCategories] = useState<any[]>([])
  const [images, setImages] = useState<File[]>([])
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([])
  const [variants, setVariants] = useState<VariantRow[]>([
    { id: '1', name: 'default', options: {}, price_override: '', stock_quantity: '0', sku: '' },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.from('categories').select('id, name').then(({ data }) => {
      if (data) setCategories(data)
    })
  }, [supabase])

  function addVariant() {
    setVariants([
      ...variants,
      { id: String(Date.now()), name: '', options: {}, price_override: '', stock_quantity: '0', sku: '' },
    ])
  }

  function removeVariant(id: string) {
    if (variants.length <= 1) return
    setVariants(variants.filter((v) => v.id !== id))
  }

  function updateVariant(id: string, field: keyof VariantRow, value: any) {
    setVariants(variants.map((v) => (v.id === id ? { ...v, [field]: value } : v)))
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    const remaining = 5 - images.length
    const selected = files.slice(0, remaining)

    setImages([...images, ...selected])
    setImagePreviewUrls([
      ...imagePreviewUrls,
      ...selected.map((f) => URL.createObjectURL(f)),
    ])
  }

  function removeImage(index: number) {
    setImages(images.filter((_, i) => i !== index))
    setImagePreviewUrls(imagePreviewUrls.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not authenticated')
      setLoading(false)
      return
    }

    const { data: vendorProfile } = await supabase
      .from('vendor_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!vendorProfile) {
      setError('Vendor profile not found')
      setLoading(false)
      return
    }

    // Upload images
    const imageUrls: string[] = []
    for (const file of images) {
      const ext = file.name.split('.').pop()
      const filePath = `${vendorProfile.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file)

      if (uploadError) {
        setError(`Image upload failed: ${uploadError.message}`)
        setLoading(false)
        return
      }

      const { data: urlData } = await supabase.storage
        .from('product-images')
        .getPublicUrl(filePath)

      imageUrls.push(urlData.publicUrl)
    }

    // Create product
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        vendor_id: vendorProfile.id,
        category_id: categoryId || null,
        title,
        description,
        base_price: parseFloat(basePrice),
        images: imageUrls,
      })
      .select()
      .single()

    if (productError) {
      setError(productError.message)
      setLoading(false)
      return
    }

    // Create variants
    const variantInserts = variants.map((v) => ({
      product_id: product.id,
      name: v.name || 'default',
      options: Object.keys(v.options).length > 0 ? v.options : null,
      price_override: v.price_override ? parseFloat(v.price_override) : null,
      stock_quantity: parseInt(v.stock_quantity) || 0,
      sku: v.sku || null,
    }))

    const { error: variantError } = await supabase
      .from('product_variants')
      .insert(variantInserts)

    if (variantError) {
      setError(variantError.message)
      setLoading(false)
      return
    }

    router.push('/vendor/products')
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold">New Product</h1>

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

        <Card>
          <CardHeader>
            <CardTitle>Images (max 5)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {imagePreviewUrls.map((url, i) => (
                <div key={i} className="relative h-24 w-24 overflow-hidden rounded-md border">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute right-0 top-0 rounded-bl bg-destructive p-0.5 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-md border border-dashed text-muted-foreground hover:border-foreground">
                  <Plus className="h-6 w-6" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Variants</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addVariant}>
              <Plus className="mr-1 h-4 w-4" /> Add variant
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {variants.map((variant, index) => (
              <div key={variant.id} className="rounded-lg border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">Variant {index + 1}</span>
                  {variants.length > 1 && (
                    <button type="button" onClick={() => removeVariant(variant.id)} className="text-destructive">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input value={variant.name} onChange={(e) => updateVariant(variant.id, 'name', e.target.value)} placeholder="Red / XL" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">SKU</Label>
                    <Input value={variant.sku} onChange={(e) => updateVariant(variant.id, 'sku', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Price override</Label>
                    <Input type="number" step="0.01" value={variant.price_override} onChange={(e) => updateVariant(variant.id, 'price_override', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Stock quantity *</Label>
                    <Input type="number" min="0" value={variant.stock_quantity} onChange={(e) => updateVariant(variant.id, 'stock_quantity', e.target.value)} required />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? 'Creating product...' : 'Create product'}
        </Button>
      </form>
    </div>
  )
}
