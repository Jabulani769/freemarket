'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/lib/store/cart'
import { Button } from '@/components/ui/button'
import { Star } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/commission'
import { formatDate } from '@/lib/utils/dates'

interface ProductDetailClientProps {
  product: any
  reviews: any[]
}

export function ProductDetailClient({ product, reviews }: ProductDetailClientProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    product.product_variants?.[0]?.id || ''
  )
  const [addedToCart, setAddedToCart] = useState(false)
  const router = useRouter()
  const addItem = useCart((s) => s.addItem)

  const selectedVariant = product.product_variants?.find(
    (v: any) => v.id === selectedVariantId
  )

  const price = selectedVariant?.price_override || product.base_price

  function handleAddToCart() {
    if (!selectedVariant) return
    addItem({
      productId: product.id,
      variantId: selectedVariant.id,
      title: product.title,
      price: Number(price),
      image: product.images?.[0] || '',
      vendorId: product.vendor_profiles?.id,
      variantName: selectedVariant.name,
    })
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  function getOptionGroups(): Record<string, string[]> {
    const groups: Record<string, string[]> = {}
    product.product_variants?.forEach((v: any) => {
      if (v.options && typeof v.options === 'object') {
        Object.entries(v.options).forEach(([key, val]) => {
          if (!groups[key]) groups[key] = []
          if (!groups[key].includes(val as string)) groups[key].push(val as string)
        })
      }
    })
    return groups
  }

  const optionGroups = getOptionGroups()

  return (
    <div className="mt-6 space-y-6">
      <div className="text-3xl font-bold">MK {formatCurrency(price)}</div>

      {Object.entries(optionGroups).length > 0 && (
        <div className="space-y-4">
          {Object.entries(optionGroups).map(([optionName, values]) => (
            <div key={optionName}>
              <p className="mb-2 text-sm font-medium capitalize">{optionName}</p>
              <div className="flex flex-wrap gap-2">
                {values.map((value) => {
                  const matchingVariant = product.product_variants?.find(
                    (v: any) => v.options?.[optionName] === value
                  )
                  const isSelected = selectedVariant?.options?.[optionName] === value
                  const isOutOfStock = matchingVariant?.stock_quantity === 0
                  return (
                    <Button
                      key={value}
                      type="button"
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      disabled={isOutOfStock}
                      className={isOutOfStock ? 'cursor-not-allowed opacity-40' : ''}
                      onClick={() => {
                        const variant = product.product_variants?.find(
                          (v: any) => v.options?.[optionName] === value
                        )
                        if (variant) setSelectedVariantId(variant.id)
                      }}
                    >
                      {value}
                    </Button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4">
        <Button
          size="lg"
          className="flex-1"
          disabled={!selectedVariant || selectedVariant?.stock_quantity === 0}
          onClick={handleAddToCart}
        >
          {addedToCart ? 'Added!' : 'Add to cart'}
        </Button>
      </div>

      {selectedVariant && (
        <p className="text-sm text-muted-foreground">
          Stock: {selectedVariant.stock_quantity > 0 ? `${selectedVariant.stock_quantity} available` : 'Out of stock'}
        </p>
      )}

      {product.description && (
        <div>
          <h3 className="mb-2 font-semibold">Description</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{product.description}</p>
        </div>
      )}

      <div>
        <h3 className="mb-4 font-semibold">Reviews ({reviews.length})</h3>
        {reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reviews yet.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review: any) => (
              <div key={review.id} className="border-b pb-4 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{review.profiles?.full_name || 'Anonymous'}</span>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3 w-3 ${
                          star <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(review.created_at)}</span>
                </div>
                {review.comment && <p className="mt-1 text-sm text-muted-foreground">{review.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
