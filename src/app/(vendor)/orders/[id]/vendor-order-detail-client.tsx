'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDateTime } from '@/lib/utils/dates'

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
}

export function VendorOrderDetailClient({ orderId, notes: initialNotes, userId }: Props) {
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [newNote, setNewNote] = useState('')
  const [sending, setSending] = useState(false)
  const supabase = createClient()

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

  return (
    <div className="space-y-4">
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

      <div className="flex gap-2">
        <Input
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Type a note to buyer..."
          onKeyDown={(e) => e.key === 'Enter' && handleSendNote()}
        />
        <Button onClick={handleSendNote} disabled={sending || !newNote.trim()}>
          Send
        </Button>
      </div>
    </div>
  )
}