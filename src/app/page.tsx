import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-xl font-bold">Freemarket</Link>
          <nav className="flex items-center gap-4">
            <Link href="/products"><Button variant="ghost">Browse</Button></Link>
            {user ? (
              <Link href="/products"><Button>Shop now</Button></Link>
            ) : (
              <>
                <Link href="/login"><Button variant="ghost">Sign in</Button></Link>
                <Link href="/register"><Button>Get started</Button></Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Malawi&apos;s Multi-Vendor Marketplace
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Buy and sell physical products across Malawi. Secure payments, trusted vendors, and fast delivery.
            </p>
            <div className="mt-8 flex items-center justify-center gap-4">
              <Link href="/register"><Button size="lg">Start shopping</Button></Link>
              <Link href="/register"><Button variant="outline" size="lg">Open a shop</Button></Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
