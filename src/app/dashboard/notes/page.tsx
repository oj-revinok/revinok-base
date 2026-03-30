'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme } from '@/context/ThemeContext'
import {
  getMyPersonalNotes,
  getSharedPersonalNotes,
  createPersonalNote,
  updatePersonalNote,
  updateSharedPersonalNote,
  deletePersonalNote,
  sharePersonalNote,
  updatePersonalNoteShareAccess,
  removePersonalNoteShare,
  getShareableMembers,
  type PersonalNote,
  type SharedPersonalNote,
  type PersonalNoteShare,
} from '@/lib/actions/personalNotes'

type NoteTab = 'mine' | 'shared'
type AnyNote = (PersonalNote | SharedPersonalNote) & { _shared?: boolean; access_level?: 'view' | 'edit' }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(iso).split(',')[0]
}

export default function NotesPage() {
  const { colors, theme } = useTheme()
  const [tab, setTab] = useState<NoteTab>('mine')
  const [myNotes, setMyNotes] = useState<PersonalNote[]>([])
  const [sharedNotes, setSharedNotes] = useState<SharedPersonalNote[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<AnyNote | null>(null)
  const [search, setSearch] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [shareMembers, setShareMembers] = useState<{ id: string; full_name: string | null; email: string; role: string }[]>([])
  const [shareSearch, setShareSearch] = useState('')
  const [shareLoading, setShareLoading] = useState(false)
  const [sharing, setSharing] = useState<string | null>(null)
  const saveTimer = useRef<NodeJS.Timeout | null>(null)

  const activeNotes: AnyNote[] = tab === 'mine' ? myNotes : sharedNotes.map(n => ({ ...n, _shared: true }))

  const filtered = activeNotes.filter(n => {
    const q = search.toLowerCase()
    return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
  })

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    const [mine, shared] = await Promise.all([getMyPersonalNotes(), getSharedPersonalNotes()])
    setMyNotes(mine)
    setSharedNotes(shared)
    setLoading(false)
  }

  function selectNote(note: AnyNote) {
    // Save any pending changes before switching
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    setSelected(note)
    setEditTitle(note.title)
    setEditContent(note.content)
    setSaveStatus('idle')
    setConfirmDelete(false)
  }

  const isReadOnly = (note: AnyNote | null) => {
    if (!note) return true
    if ((note as SharedPersonalNote).access_level === 'view') return true
    return false
  }

  function scheduleSave(noteId: string, title: string, content: string, isShared: boolean) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveStatus('idle')
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      let ok: boolean
      if (isShared) {
        ok = await updateSharedPersonalNote(noteId, title, content)
      } else {
        ok = await updatePersonalNote(noteId, title, content)
      }
      setSaving(false)
      setSaveStatus(ok ? 'saved' : 'error')
      if (ok) {
        const updatedAt = new Date().toISOString()
        if (isShared) {
          setSharedNotes(prev => prev.map(n => n.id === noteId ? { ...n, title, content, updated_at: updatedAt } : n))
        } else {
          setMyNotes(prev => prev.map(n => n.id === noteId ? { ...n, title, content, updated_at: updatedAt } : n))
        }
        setSelected(prev => prev?.id === noteId ? { ...prev, title, content, updated_at: updatedAt } : prev)
      }
      setTimeout(() => setSaveStatus('idle'), 2000)
    }, 800)
  }

  function handleTitleChange(val: string) {
    setEditTitle(val)
    if (selected && !isReadOnly(selected)) {
      scheduleSave(selected.id, val, editContent, !!(selected as SharedPersonalNote).access_level)
    }
  }

  function handleContentChange(val: string) {
    setEditContent(val)
    if (selected && !isReadOnly(selected)) {
      scheduleSave(selected.id, editTitle, val, !!(selected as SharedPersonalNote).access_level)
    }
  }

  async function handleCreate() {
    setCreating(true)
    const note = await createPersonalNote('Untitled', '')
    if (note) {
      setMyNotes(prev => [note, ...prev])
      setTab('mine')
      selectNote(note)
    }
    setCreating(false)
  }

  async function handleDelete() {
    if (!selected) return
    setDeleting(true)
    const ok = await deletePersonalNote(selected.id)
    if (ok) {
      setMyNotes(prev => prev.filter(n => n.id !== selected.id))
      setSelected(null)
      setConfirmDelete(false)
    }
    setDeleting(false)
  }

  async function openShareModal() {
    setShareLoading(true)
    setShareModalOpen(true)
    const members = await getShareableMembers()
    setShareMembers(members)
    setShareLoading(false)
  }

  async function handleShare(memberId: string, access: 'view' | 'edit') {
    if (!selected) return
    setSharing(memberId)
    const ok = await sharePersonalNote(selected.id, memberId, access)
    if (ok) {
      // Reload shares for the note
      const updated = await getMyPersonalNotes()
      setMyNotes(updated)
      const freshNote = updated.find(n => n.id === selected.id)
      if (freshNote) setSelected({ ...freshNote })
    }
    setSharing(null)
  }

  async function handleUpdateShare(shareId: string, noteId: string, access: 'view' | 'edit') {
    setSharing(shareId)
    await updatePersonalNoteShareAccess(shareId, noteId, access)
    const updated = await getMyPersonalNotes()
    setMyNotes(updated)
    const freshNote = updated.find(n => n.id === noteId)
    if (freshNote) setSelected({ ...freshNote })
    setSharing(null)
  }

  async function handleRemoveShare(shareId: string, noteId: string) {
    setSharing(shareId)
    await removePersonalNoteShare(shareId, noteId)
    const updated = await getMyPersonalNotes()
    setMyNotes(updated)
    const freshNote = updated.find(n => n.id === noteId)
    if (freshNote) setSelected({ ...freshNote })
    setSharing(null)
  }

  const currentShares = (selected as PersonalNote)?.shares || []
  const sharedMemberIds = new Set(currentShares.map(s => s.shared_with_id))
  const filteredShareMembers = shareMembers.filter(m => {
    const q = shareSearch.toLowerCase()
    return (m.full_name?.toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
  })

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: colors.bg, overflow: 'hidden' }}>

      {/* ── Left panel ── */}
      <div style={{
        width: '300px', flexShrink: 0, borderRight: `1px solid ${colors.border}`,
        display: 'flex', flexDirection: 'column', height: '100%',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 20px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: colors.text, textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
              Notes
            </h1>
            <button
              onClick={handleCreate}
              disabled={creating}
              title="New note"
              style={{
                width: '30px', height: '30px', backgroundColor: colors.accent, borderRadius: 10000,
                border: 'none', cursor: creating ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: creating ? 0.6 : 1, flexShrink: 0, fontSize: 13, fontWeight: 600, fontFamily: 'Montserrat, sans-serif',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1v10M1 6h10" stroke={theme === 'dark' ? '#080808' : '#ffffff'} strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <svg style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search notes…"
              style={{
                width: '100%', backgroundColor: colors.bgSecondary, border: `1px solid ${colors.bgTertiary}`,
                color: colors.text, fontSize: '12px', padding: '8px 10px 8px 30px',
                fontFamily: 'Montserrat, sans-serif', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: `1px solid ${colors.border}`, marginBottom: '4px' }}>
            {(['mine', 'shared'] as NoteTab[]).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setSelected(null) }}
                style={{
                  flex: 1, padding: '8px 0',
                  backgroundColor: 'transparent', border: 'none',
                  borderBottom: `2px solid ${tab === t ? colors.accent : 'transparent'}`,
                  color: tab === t ? colors.accent : colors.textMuted,
                  fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.5px', cursor: 'pointer',
                  fontFamily: 'Montserrat, sans-serif',
                  transition: 'color 0.15s',
                }}
              >
                {t === 'mine' ? 'My Notes' : 'Shared'}
                {t === 'mine' && myNotes.length > 0 && (
                  <span style={{ marginLeft: '6px', fontSize: '9px', color: colors.textMuted }}>({myNotes.length})</span>
                )}
                {t === 'shared' && sharedNotes.length > 0 && (
                  <span style={{ marginLeft: '6px', fontSize: '9px', color: colors.textMuted }}>({sharedNotes.length})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Note list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
          {loading ? (
            <p style={{ padding: '20px', color: colors.textMuted, fontSize: '12px' }}>Loading…</p>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <p style={{ color: colors.textMuted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                {search ? 'No results' : tab === 'mine' ? 'No notes yet' : 'Nothing shared with you'}
              </p>
              {!search && tab === 'mine' && (
                <button
                  onClick={handleCreate}
                  style={{
                    marginTop: '12px', backgroundColor: 'transparent', border: `1px solid ${colors.bgHover}`,
                    color: colors.textSecondary, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                    padding: '7px 14px', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
                    letterSpacing: '0.5px', borderRadius: 10000,
                  }}
                >
                  + New note
                </button>
              )}
            </div>
          ) : (
            filtered.map(note => {
              const isActive = selected?.id === note.id
              const isSharedNote = !!(note as SharedPersonalNote).access_level
              return (
                <div
                  key={note.id}
                  onClick={() => selectNote(note)}
                  style={{
                    padding: '12px 20px',
                    backgroundColor: isActive ? colors.bgSecondary : 'transparent',
                    borderLeft: `2px solid ${isActive ? colors.accent : 'transparent'}`,
                    cursor: 'pointer',
                    transition: 'background-color 0.1s',
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.backgroundColor = colors.bgHover }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <p style={{
                      margin: '0 0 4px 0', fontSize: '12px', fontWeight: 700,
                      color: isActive ? colors.text : colors.textSecondary,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                    }}>
                      {note.title || 'Untitled'}
                    </p>
                    {isSharedNote && (
                      <span style={{
                        fontSize: '8px', fontWeight: 700, color: colors.accent,
                        border: `1px solid ${colors.accent}`, padding: '1px 4px', flexShrink: 0,
                        textTransform: 'uppercase', opacity: 0.7,
                      }}>
                        {(note as SharedPersonalNote).access_level}
                      </span>
                    )}
                  </div>
                  <p style={{
                    margin: '0 0 6px 0', fontSize: '11px', color: colors.textMuted,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    lineHeight: 1.4,
                  }}>
                    {note.content.replace(/\n/g, ' ') || <em style={{ color: colors.textMuted }}>empty</em>}
                  </p>
                  <p style={{ margin: 0, fontSize: '10px', color: colors.textMuted }}>
                    {timeAgo(note.updated_at)}
                    {isSharedNote && (note as SharedPersonalNote).owner && (
                      <span style={{ marginLeft: '6px', color: colors.textMuted }}>
                        · {(note as SharedPersonalNote).owner?.full_name || (note as SharedPersonalNote).owner?.email}
                      </span>
                    )}
                  </p>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── Editor panel ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {!selected ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={colors.bgHover} strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            <p style={{ color: colors.textMuted, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
              Select a note or create one
            </p>
            <button
              onClick={handleCreate}
              disabled={creating}
              style={{
                backgroundColor: 'transparent', border: `1px solid ${colors.bgTertiary}`,
                color: colors.textSecondary, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                padding: '8px 18px', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
                letterSpacing: '0.5px', borderRadius: 10000,
              }}
            >
              + New note
            </button>
          </div>
        ) : (
          <>
            {/* Editor toolbar */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 28px', borderBottom: `1px solid ${colors.bgSecondary}`,
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* Timestamps */}
                <div>
                  <p style={{ margin: 0, fontSize: '10px', color: colors.textMuted }}>
                    Created {formatDate(selected.created_at)}
                  </p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: colors.textMuted }}>
                    Updated {formatDate(selected.updated_at)}
                  </p>
                </div>

                {/* Save status */}
                {saving && (
                  <span style={{ fontSize: '10px', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Saving…
                  </span>
                )}
                {!saving && saveStatus === 'saved' && (
                  <span style={{ fontSize: '10px', color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Saved
                  </span>
                )}
                {!saving && saveStatus === 'error' && (
                  <span style={{ fontSize: '10px', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Error saving
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {/* Share button — only for owned notes */}
                {!(selected as SharedPersonalNote).access_level && (
                  <button
                    onClick={openShareModal}
                    style={{
                      padding: '7px 14px', backgroundColor: 'transparent',
                      border: `1px solid ${colors.bgHover}`, color: colors.textSecondary,
                      fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.5px', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
                      display: 'flex', alignItems: 'center', gap: '6px', borderRadius: 10000,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = colors.accent; e.currentTarget.style.color = colors.accent }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = colors.bgHover; e.currentTarget.style.color = colors.textSecondary }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                    </svg>
                    Share
                    {currentShares.length > 0 && (
                      <span style={{
                        backgroundColor: colors.accent, color: theme === 'dark' ? '#080808' : '#ffffff',
                        fontSize: '8px', fontWeight: 800, borderRadius: '10px',
                        padding: '1px 5px', minWidth: '14px', textAlign: 'center',
                      }}>
                        {currentShares.length}
                      </span>
                    )}
                  </button>
                )}

                {/* Delete — only for owned notes */}
                {!(selected as SharedPersonalNote).access_level && (
                  confirmDelete ? (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: colors.textSecondary, textTransform: 'uppercase' }}>Sure?</span>
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        style={{
                          padding: '7px 12px', backgroundColor: '#ef4444', border: 'none',
                          color: '#fff', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                          cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.5px', borderRadius: 10000,
                        }}
                      >
                        {deleting ? '…' : 'Delete'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        style={{
                          padding: '7px 12px', backgroundColor: 'transparent', border: `1px solid ${colors.bgHover}`,
                          color: colors.textSecondary, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                          cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.5px', borderRadius: 10000,
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      style={{
                        padding: '7px 12px', backgroundColor: 'transparent',
                        border: `1px solid ${colors.bgTertiary}`, color: colors.textMuted,
                        fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '0.5px', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', borderRadius: 10000,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = colors.bgTertiary; e.currentTarget.style.color = colors.textMuted }}
                    >
                      Delete
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Title */}
            <div style={{ padding: '24px 28px 0', flexShrink: 0 }}>
              <input
                value={editTitle}
                onChange={e => handleTitleChange(e.target.value)}
                readOnly={isReadOnly(selected)}
                placeholder="Note title…"
                style={{
                  width: '100%', backgroundColor: 'transparent', border: 'none',
                  color: colors.text, fontSize: '22px', fontWeight: 900,
                  fontFamily: 'Montserrat, sans-serif', outline: 'none',
                  boxSizing: 'border-box', padding: '0',
                  cursor: isReadOnly(selected) ? 'default' : 'text',
                  textTransform: 'uppercase', letterSpacing: '-0.5px',
                }}
              />
            </div>

            {/* Content */}
            <div style={{ flex: 1, padding: '16px 28px 28px', overflow: 'hidden', display: 'flex' }}>
              <textarea
                value={editContent}
                onChange={e => handleContentChange(e.target.value)}
                readOnly={isReadOnly(selected)}
                placeholder={isReadOnly(selected) ? '' : 'Start writing…'}
                style={{
                  flex: 1, backgroundColor: 'transparent', border: 'none',
                  color: colors.textSecondary, fontSize: '14px', lineHeight: 1.75,
                  fontFamily: 'Montserrat, sans-serif', outline: 'none',
                  resize: 'none', padding: '0',
                  cursor: isReadOnly(selected) ? 'default' : 'text',
                  width: '100%',
                }}
              />
            </div>
          </>
        )}
      </div>

      {/* ── Share modal ── */}
      {shareModalOpen && selected && (
        <div
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.88)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
          }}
          onClick={e => { if (e.target === e.currentTarget) setShareModalOpen(false) }}
        >
          <div style={{
            backgroundColor: colors.bgSecondary, border: `1px solid ${colors.bgHover}`,
            width: '100%', maxWidth: '500px', maxHeight: '85vh', display: 'flex', flexDirection: 'column',
          }}>
            {/* Modal header */}
            <div style={{ padding: '22px 24px 18px', borderBottom: `1px solid ${colors.bgTertiary}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <p style={{ margin: 0, fontSize: '9px', color: colors.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  Share Note
                </p>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '15px', fontWeight: 800, color: colors.text }}>
                  {selected.title}
                </h3>
              </div>
              <button
                onClick={() => setShareModalOpen(false)}
                style={{ background: 'none', border: `1px solid ${colors.bgHover}`, color: colors.textSecondary, cursor: 'pointer', padding: '6px 10px', fontFamily: 'Montserrat, sans-serif', borderRadius: 10000 }}
              >
                ✕
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {/* Current shares */}
              {currentShares.length > 0 && (
                <div style={{ padding: '16px 24px', borderBottom: `1px solid ${colors.bgSecondary}` }}>
                  <p style={{ margin: '0 0 12px 0', fontSize: '9px', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>
                    Shared with
                  </p>
                  {currentShares.map((share: PersonalNoteShare) => (
                    <div key={share.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '12px' }}>
                      <p style={{ margin: 0, fontSize: '12px', color: colors.textSecondary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {share.profile?.full_name || share.profile?.email || share.shared_with_id}
                      </p>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                        {(['view', 'edit'] as const).map(lvl => (
                          <button
                            key={lvl}
                            onClick={() => handleUpdateShare(share.id, share.note_id, lvl)}
                            disabled={sharing === share.id}
                            style={{
                              padding: '4px 10px', fontSize: '9px', fontWeight: 700,
                              textTransform: 'uppercase', letterSpacing: '0.5px',
                              cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', borderRadius: 10000,
                              backgroundColor: share.access_level === lvl ? colors.accent : 'transparent',
                              color: share.access_level === lvl ? (theme === 'dark' ? '#080808' : '#ffffff') : colors.textMuted,
                              border: `1px solid ${share.access_level === lvl ? colors.accent : colors.bgHover}`,
                              opacity: sharing === share.id ? 0.5 : 1,
                            }}
                          >
                            {lvl}
                          </button>
                        ))}
                        <button
                          onClick={() => handleRemoveShare(share.id, share.note_id)}
                          disabled={sharing === share.id}
                          style={{
                            padding: '4px 8px', fontSize: '11px', backgroundColor: 'transparent',
                            border: `1px solid ${colors.bgTertiary}`, color: colors.textMuted, cursor: 'pointer',
                            opacity: sharing === share.id ? 0.5 : 1, borderRadius: 10000,
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = colors.bgTertiary; e.currentTarget.style.color = colors.textMuted }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add people */}
              <div style={{ padding: '16px 24px' }}>
                <p style={{ margin: '0 0 12px 0', fontSize: '9px', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>
                  Add people
                </p>
                <input
                  value={shareSearch}
                  onChange={e => setShareSearch(e.target.value)}
                  placeholder="Search by name or email…"
                  style={{
                    width: '100%', backgroundColor: colors.bgSecondary, border: `1px solid ${colors.bgTertiary}`,
                    color: colors.text, fontSize: '12px', padding: '9px 12px',
                    fontFamily: 'Montserrat, sans-serif', outline: 'none',
                    boxSizing: 'border-box', marginBottom: '8px',
                  }}
                />
                {shareLoading ? (
                  <p style={{ color: colors.textMuted, fontSize: '12px' }}>Loading…</p>
                ) : filteredShareMembers.length === 0 ? (
                  <p style={{ color: colors.textMuted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>No members found</p>
                ) : (
                  filteredShareMembers.map(m => {
                    const alreadyShared = sharedMemberIds.has(m.id)
                    return (
                      <div key={m.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 0', borderBottom: `1px solid ${colors.bgSecondary}`, gap: '12px',
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: '12px', color: colors.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.full_name || m.email}
                          </p>
                          {m.full_name && (
                            <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: colors.textMuted }}>{m.email}</p>
                          )}
                        </div>
                        {alreadyShared ? (
                          <span style={{ fontSize: '9px', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0 }}>
                            Shared
                          </span>
                        ) : (
                          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                            {(['view', 'edit'] as const).map(lvl => (
                              <button
                                key={lvl}
                                onClick={() => handleShare(m.id, lvl)}
                                disabled={sharing === m.id}
                                style={{
                                  padding: '5px 10px', fontSize: '9px', fontWeight: 700,
                                  textTransform: 'uppercase', letterSpacing: '0.5px',
                                  cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', borderRadius: 10000,
                                  backgroundColor: 'transparent',
                                  color: colors.textSecondary,
                                  border: `1px solid ${colors.bgHover}`,
                                  opacity: sharing === m.id ? 0.5 : 1,
                                  transition: 'border-color 0.1s, color 0.1s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = colors.accent; e.currentTarget.style.color = colors.accent }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = colors.bgHover; e.currentTarget.style.color = colors.textSecondary }}
                              >
                                + {lvl}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
