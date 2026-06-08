import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCart } from '@/lib/store/cart'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/commission'

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart()
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', user.id)
        .single()
      if (profile?.phone) setPhone(profile.phone)
    }
    loadProfile()
  }, [router, supabase])

  if (items.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Your cart is empty</p>
          <Link href="/products"><Button className="mt-4">Browse products</Button></Link>
        </div>
      </div>
    )
  }

  const total = subtotal() * 1.05

  async function handleCheckout() {
    setLoading(true)
    setError(null)

    const cartItems = items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
    }))

    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cartItems,
        phone,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      setError(data.error || 'Checkout failed')
      setLoading(false)
      return
    }

    clearCart()
    if (data.checkout_url) {
      window.location.href = data.checkout_url
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-xl font-bold">Freemarket</Link>
          <nav className="flex items-center gap-4">
            <Link href="/cart"><Button variant="ghost">Back to cart</Button></Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-2xl font-bold">Checkout</h1>

        <div className="grid gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Contact information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Order summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item) => (
                <div key={item.variantId} className="flex items-center justify-between text-sm">
                  <span>{item.title} x{item.quantity}</span>
                  <span>MK {formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>MK {formatCurrency(subtotal())}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Platform fee (5%)</span>
                  <span>MK {formatCurrency(subtotal() * 0.05)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>MK {formatCurrency(total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button size="lg" className="w-full" onClick={handleCheckout} disabled={loading}>
            {loading ? 'Processing...' : `Pay MK ${formatCurrency(total)}`}
          </Button>
        </div>
      </main>
    </div>
  )
}