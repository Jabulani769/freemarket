import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const protectedPaths = ['/cart', '/checkout', '/orders']
  const vendorPaths = ['/vendor']
  const adminPaths = ['/admin']
  const authPaths = ['/login', '/register']
  const { pathname } = request.nextUrl

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role

    if (authPaths.includes(pathname)) {
      const destination = role === 'vendor' ? '/vendor/dashboard' : '/products'
      return NextResponse.redirect(new URL(destination, request.url))
    }

    if (pathname.startsWith('/vendor') && role !== 'vendor' && role !== 'admin') {
      return NextResponse.redirect(new URL('/products', request.url))
    }

    if (pathname.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL('/products', request.url))
    }

    if (role === 'vendor' && !pathname.startsWith('/onboarding')) {
      const { data: vendorProfile } = await supabase
        .from('vendor_profiles')
        .select('shop_name')
        .eq('user_id', user.id)
        .single()

      if (!vendorProfile?.shop_name) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
    }
  } else {
    const isProtected = protectedPaths.some(p => pathname.startsWith(p))
      || vendorPaths.some(p => pathname.startsWith(p))
      || adminPaths.some(p => pathname.startsWith(p))

    if (isProtected) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return supabaseResponse
}
