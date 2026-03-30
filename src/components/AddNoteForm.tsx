'use client'

import { useState, useTransition } from 'react'
import { addNote } from '@/lib/actions/notes'
import { useTheme } from '@/context/ThemeContext'
import RichTextEditor from './RichTextEditor'

interface Props {
  projectId: string
  onNoteAdded?: (note: any) => void
}

export default function AddNoteForm({ projectId, onNoteAdded }: Props) {
  const { colors } = useTheme()
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setError(null)

    startTransition(async () => {
      try {
        const note = await addNote(projectId, content)
        setContent('')
        onNoteAdded?.(note)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add note')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <RichTextEditor
        content={content}
        onChange={setContent}
        placeholder="Write a note…"
        editable={true}
      />
      {error && (
        <p style={{ margin: 0, fontSize: '12px', color: '#ef4444' }}>{error}</p>
      )}
      <button
        type="submit"
        disabled={isPending || !content.trim()}
        className="btn-primary"
        style={{
          padding: '10px 20px',
          backgroundColor: isPending || !content.trim() ? colors.border : colors.accent,
          color: isPending || !content.trim() ? colors.textMuted : colors.bg,
          border: 'none',
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          cursor: isPending || !content.trim() ? 'not-allowed' : 'pointer',
          fontFamily: 'Montserrat, sans-serif',
          minHeight: '44px',
          transition: 'all 0.15s ease',
          borderRadius: 10000,
        }}
      >
        {isPending ? 'Saving…' : 'Add Note'}
      </button>
    </form>
  )
}
