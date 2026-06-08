'use client'

import Link from 'next/link'
import { useCart } from '@/lib/store/cart'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/commission'

export default function CartPage() {
  const { items, removeItem, updateQuantity, subtotal } = useCart()

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-xl font-bold">Freemarket</Link>
          <nav className="flex items-center gap-4">
            <Link href="/products"><Button variant="ghost">Products</Button></Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-2xl font-bold">Shopping Cart</h1>

        {items.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">Your cart is empty</p>
            <Link href="/products"><Button className="mt-4">Browse products</Button></Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <Card key={item.variantId}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                      {item.image ? (
                        <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.variantName}</p>
                      <p className="mt-1 font-medium">MK {formatCurrency(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        className="w-16 text-center"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.variantId, parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="text-right">
                      <p className="font-medium">MK {formatCurrency(item.price * item.quantity)}</p>
                      <button
                        onClick={() => removeItem(item.variantId)}
                        className="mt-1 text-sm text-destructive hover:underline"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
                    <span>MK {formatCurrency(subtotal())}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Platform fee (5%)</span>
                    <span>MK {formatCurrency(subtotal() * 0.05)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-semibold">
                    <span>Total</span>
                    <span>MK {formatCurrency(subtotal() * 1.05)}</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Link href="/checkout" className="w-full">
                    <Button className="w-full" size="lg">Proceed to checkout</Button>
                  </Link>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
