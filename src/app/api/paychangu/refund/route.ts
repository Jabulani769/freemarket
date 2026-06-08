import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createAdminClient()

    // Verify admin auth
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const { reference } = await request.json()

    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 })
    }

    const response = await fetch('https://api.paychangu.com/v1/transactions/' + reference + '/refund', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${process.env.PAYCHANGU_SECRET_KEY!}`,
      },
    })

    const result = await response.json()

    if (!response.ok) {
      return NextResponse.json({ error: result.message || 'Refund failed' }, { status: 400 })
    }

    return NextResponse.json({ message: 'Refund initiated', data: result.data })
  } catch (error) {
    console.error('Refund error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}