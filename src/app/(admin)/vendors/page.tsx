import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { VerifyVendorButton } from './verify-vendor-button'

export default async function AdminVendorsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/products')

  const { data: vendors } = await supabase
    .from('vendor_profiles')
    .select('*, profiles!inner(full_name, phone, id_document_url, id_document_type, id_verified)')
    .order('created_at', { ascending: false })

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Vendor Verification</h1>

      {(!vendors || vendors.length === 0) ? (
        <div className="py-12 text-center text-muted-foreground">
          <p>No vendors yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {vendors.map((vendor) => (
            <Card key={vendor.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex-1">
                  <p className="font-medium">{vendor.shop_name}</p>
                  <p className="text-sm text-muted-foreground">Owner: {vendor.profiles?.full_name}</p>
                  <p className="text-sm text-muted-foreground">Phone: {vendor.profiles?.phone}</p>
                  {vendor.profiles?.id_document_type && (
                    <p className="text-sm text-muted-foreground">
                      ID: {vendor.profiles.id_document_type}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <Badge variant={vendor.profiles?.id_verified ? 'success' : 'warning'}>
                    {vendor.profiles?.id_verified ? 'Verified' : 'Unverified'}
                  </Badge>
                  <div className="mt-2">
                    <VerifyVendorButton
                      userId={vendor.user_id}
                      isVerified={vendor.profiles?.id_verified || false}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
