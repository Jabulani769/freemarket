'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface Props {
  userId: string
  isVerified: boolean
}

export function VerifyVendorButton({ userId, isVerified }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleToggle() {
    setLoading(true)
    await supabase
      .from('profiles')
      .update({ id_verified: !isVerified })
      .eq('id', userId)
    setLoading(false)
    router.refresh()
  }

  return (
    <Button size="sm" variant={isVerified ? 'outline' : 'default'} onClick={handleToggle} disabled={loading}>
      {isVerified ? 'Unverify' : 'Verify identity'}
    </Button>
  )
}
