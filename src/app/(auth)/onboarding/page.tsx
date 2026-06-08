'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Plus } from 'lucide-react'

export default function OnboardingPage() {
  const [shopName, setShopName] = useState('')
  const [shopDescription, setShopDescription] = useState('')
  const [phone, setPhone] = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [bankName, setBankName] = useState('')
  const [idDocument, setIdDocument] = useState<File | null>(null)
  const [idDocumentUrl, setIdDocumentUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function checkProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, phone')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'vendor') {
        router.push('/products')
        return
      }

      const { data: vendorProfile } = await supabase
        .from('vendor_profiles')
        .select('shop_name')
        .eq('user_id', user.id)
        .single()

      if (vendorProfile?.shop_name) {
        router.push('/vendor/dashboard')
        return
      }

      if (profile?.phone) setPhone(profile.phone)
    }
    checkProfile()
  }, [router, supabase])

  async function handleIdUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const ext = file.name.split('.').pop()
    const filePath = `${user.id}/id-${Date.now()}.${ext}`

    const { data, error } = await supabase.storage
      .from('id-documents')
      .upload(filePath, file)

    if (error) {
      setError(`ID upload failed: ${error.message}`)
      return
    }

    setIdDocumentUrl(data.path)
    setIdDocument(file)
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

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        phone,
        id_document_url: idDocumentUrl,
        id_document_type: idDocument ? 'national_id' : undefined,
      })
      .eq('id', user.id)

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    const { error: vendorError } = await supabase
      .from('vendor_profiles')
      .insert({
        user_id: user.id,
        shop_name: shopName,
        shop_description: shopDescription,
        bank_account_number: bankAccountNumber,
        bank_name: bankName,
      })

    if (vendorError) {
      setError(vendorError.message)
      setLoading(false)
      return
    }

    router.push('/vendor/dashboard')
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Complete your vendor profile</CardTitle>
          <CardDescription>Set up your shop to start selling on Freemarket</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shopName">Shop name *</Label>
              <Input id="shopName" value={shopName} onChange={(e) => setShopName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shopDescription">Shop description</Label>
              <Input id="shopDescription" value={shopDescription} onChange={(e) => setShopDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone number *</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank name</Label>
              <Input id="bankName" value={bankName} onChange={(e) => setBankName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankAccountNumber">Bank account number</Label>
              <Input id="bankAccountNumber" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="idDocument">ID Document</Label>
              {idDocumentUrl ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{idDocument?.name}</span>
                  <button type="button" onClick={() => setIdDocumentUrl(null)} className="text-destructive">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex h-20 cursor-pointer items-center justify-center rounded-md border border-dashed text-muted-foreground hover:border-foreground">
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="text-sm">Upload ID Document</span>
                  <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleIdUpload} />
                </label>
              )}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Saving...' : 'Complete setup'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}