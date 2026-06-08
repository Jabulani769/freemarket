'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDateTime } from '@/lib/utils/dates'
import { Star } from 'lucide-react'

interface Note {
  id: string
  author_id: string
  content: string
  created_at: string
  profiles: { full_name: string } | null
}

interface Props {
  orderId: string
  notes: Note[]
  userId: string
  isBuyer: boolean
  orderStatus: string
  items?: any[]
}

export function OrderDetailClient({ orderId, notes: initialNotes, userId, isBuyer, orderStatus, items }: Props) {
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [newNote, setNewNote] = useState('')
  const [sending, setSending] = useState(false)
  const [showDisputeForm, setShowDisputeForm] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const supabase = createClient()

  const productId = items?.[0]?.product_id || ''

  // Poll for new notes every 30s
  const poll = useCallback(async () => {
    const { data } = await supabase
      .from('order_notes')
      .select('*, profiles(full_name)')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })

    if (data) setNotes(data)
  }, [orderId, supabase])

  useEffect(() => {
    const interval = setInterval(poll, 30000)
    return () => clearInterval(interval)
  }, [poll])

  async function handleSendNote() {
    if (!newNote.trim()) return
    setSending(true)

    await supabase.from('order_notes').insert({
      order_id: orderId,
      author_id: userId,
      content: newNote.trim(),
    })

    setNewNote('')
    setSending(false)
    poll()
  }

  async function handleRaiseDispute() {
    if (!disputeReason.trim()) return

    const { error } = await supabase.from('disputes').insert({
      order_id: orderId,
      raised_by: userId,
      reason: disputeReason.trim(),
    })

    if (!error) {
      // Get vendor email and notify
      const { data: orderData } = await supabase
        .from('orders')
        .select('order_items!inner(vendor_id), buyer_id')
        .eq('id', orderId)
        .single()

      if (orderData) {
        const vendorIds = [...new Set(orderData.order_items.map((oi: any) => oi.vendor_id))]
        for (const vendorId of vendorIds) {
          const { data: vendor } = await supabase
            .from('vendor_profiles')
            .select('user_id')
            .eq('id', vendorId)
            .single()
          if (vendor?.user_id) {
            const { data: vendorProfile } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', vendor.user_id)
              .single()
            if (vendorProfile?.email) {
              fetch('/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'dispute_raised',
                  order_id: orderId,
                  vendor_email: vendorProfile.email,
                }),
              }).catch(() => {})
            }
          }
        }
      }

      await supabase
        .from('orders')
        .update({ status: 'disputed' })
        .eq('id', orderId)
      setShowDisputeForm(false)
      poll()
    }
  }

  async function handleSubmitReview() {
    if (reviewRating === 0 || !productId) return

    await supabase.from('reviews').insert({
      order_id: orderId,
      reviewer_id: userId,
      product_id: productId,
      rating: reviewRating,
      comment: reviewComment.trim() || null,
    })

    setShowReviewForm(false)
  }

  return (
    <div className="space-y-4">
      {/* Notes */}
      <div className="max-h-64 space-y-2 overflow-y-auto">
        {notes.map((note) => (
          <div
            key={note.id}
            className={`rounded-lg p-3 text-sm ${
              note.author_id === userId ? 'bg-primary/10 ml-8' : 'bg-muted mr-8'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">
                {note.profiles?.full_name || 'Unknown'}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDateTime(note.created_at)}
              </span>
            </div>
            <p className="mt-1">{note.content}</p>
          </div>
        ))}
      </div>

      {/* New note input */}
      <div className="flex gap-2">
        <Input
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Type a note..."
          onKeyDown={(e) => e.key === 'Enter' && handleSendNote()}
        />
        <Button onClick={handleSendNote} disabled={sending || !newNote.trim()}>
          Send
        </Button>
      </div>

      {/* Dispute */}
      {isBuyer && orderStatus === 'in_hold' && !showDisputeForm && (
        <Button variant="destructive" onClick={() => setShowDisputeForm(true)}>
          Raise a dispute
        </Button>
      )}

      {showDisputeForm && (
        <div className="space-y-2 rounded-lg border border-destructive p-4">
          <Label>Reason for dispute</Label>
          <textarea
            className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
          />
          <div className="flex gap-2">
            <Button variant="destructive" onClick={handleRaiseDispute}>Submit dispute</Button>
            <Button variant="outline" onClick={() => setShowDisputeForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Review */}
      {isBuyer && orderStatus === 'released' && !showReviewForm && (
        <Button variant="outline" onClick={() => setShowReviewForm(true)}>
          Leave a review
        </Button>
      )}

      {showReviewForm && (
        <div className="space-y-2 rounded-lg border p-4">
          <Label>Rating</Label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} type="button" onClick={() => setReviewRating(star)}>
                <Star
                  className={`h-6 w-6 ${
                    star <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
          <Label>Comment (optional)</Label>
          <textarea
            className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
          />
          <div className="flex gap-2">
            <Button onClick={handleSubmitReview} disabled={reviewRating === 0}>Submit review</Button>
            <Button variant="outline" onClick={() => setShowReviewForm(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  )
}
