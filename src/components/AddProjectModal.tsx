'use client'

import { useState, useEffect, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createProject } from '@/lib/actions/projects'
import { useTheme } from '@/context/ThemeContext'

const STATUSES = ['discovery', 'design', 'development', 'review', 'live', 'paused']

const getLabelStyle = (accentColor: string): React.CSSProperties => ({
  display: 'block',
  fontSize: '11px',
  fontWeight: 600,
  color: accentColor,
  marginBottom: '8px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
})

const getInputStyle = (bgSecondary: string, border: string, text: string): React.CSSProperties => ({
  width: '100%',
  padding: '12px 16px',
  backgroundColor: bgSecondary,
  border: `1px solid ${border}`,
  color: text,
  fontSize: '14px',
  fontFamily: 'Montserrat, sans-serif',
  boxSizing: 'border-box',
})

export default function AddProjectModal({ onClose }: { onClose: () => void }) {
  const { colors, theme } = useTheme()
  const [clients, setClients] = useState<{ id: string; name: string; brand_name: string | null }[]>([])
  const [notionProjects, setNotionProjects] = useState<{ id: string; name: string }[]>([])
  const [loadingNotion, setLoadingNotion] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    createClient()
      .from('clients')
      .select('id, name, brand_name')
      .order('name')
      .then(({ data }) => setClients(data || []))

    // Load Notion projects
    setLoadingNotion(true)
    fetch('/api/notion/projects')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setNotionProjects(data) })
      .catch(() => {})
      .finally(() => setLoadingNotion(false))
  }, [])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (isPending) return
    setError('')
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await createProject(formData)
        // createProject redirects on success
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create project')
      }
    })
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, backgroundColor: colors.modalOverlay, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}`, width: '100%', maxWidth: '560px', padding: '32px 24px', margin: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: colors.text, textTransform: 'uppercase' }}>NEW PROJECT</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: '20px', cursor: 'pointer', minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10000, fontWeight: 600 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Client */}
          <div style={{ marginBottom: '20px' }}>
            <label style={getLabelStyle(colors.accent)}>CLIENT</label>
            <select name="client_id" style={{ ...getInputStyle(colors.bgSecondary, colors.border, colors.text), cursor: 'pointer' }}>
              <option value="">No client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.brand_name || c.name}</option>
              ))}
            </select>
          </div>

          {/* Project name */}
          <div style={{ marginBottom: '20px' }}>
            <label style={getLabelStyle(colors.accent)}>PROJECT NAME *</label>
            <input name="name" type="text" required placeholder="e.g. Brand Website Redesign" style={getInputStyle(colors.bgSecondary, colors.border, colors.text)} />
          </div>

          {/* Status */}
          <div style={{ marginBottom: '20px' }}>
            <label style={getLabelStyle(colors.accent)}>STATUS</label>
            <select name="status" defaultValue="discovery" style={{ ...getInputStyle(colors.bgSecondary, colors.border, colors.text), cursor: 'pointer' }}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '20px' }}>
            <label style={getLabelStyle(colors.accent)}>DESCRIPTION</label>
            <textarea name="description" rows={3} placeholder="Brief project description..." style={{ ...getInputStyle(colors.bgSecondary, colors.border, colors.text), resize: 'vertical', lineHeight: '1.6' }} />
          </div>

          {/* Dates row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={getLabelStyle(colors.accent)}>START DATE</label>
              <input name="start_date" type="date" style={getInputStyle(colors.bgSecondary, colors.border, colors.text)} />
            </div>
            <div>
              <label style={getLabelStyle(colors.accent)}>DUE DATE</label>
              <input name="due_date" type="date" style={getInputStyle(colors.bgSecondary, colors.border, colors.text)} />
            </div>
          </div>

          {/* Notion project link */}
          <div style={{ marginBottom: '20px', paddingTop: '16px', borderTop: `1px solid ${colors.border}` }}>
            <label style={getLabelStyle(colors.accent)}>☰ NOTION PROJECT</label>
            <select name="notion_project_id" style={{ ...getInputStyle(colors.bgSecondary, colors.border, colors.text), cursor: 'pointer' }}>
              <option value="">— Not linked —</option>
              {loadingNotion && <option disabled>Loading Notion projects…</option>}
              {notionProjects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <p style={{ fontSize: '11px', color: colors.textMuted, marginTop: '6px', marginBottom: 0 }}>
              Link to pull tasks automatically from Notion Workload
            </p>
          </div>

          {/* Links */}
          <div style={{ marginBottom: '20px', paddingTop: '16px', borderTop: `1px solid ${colors.border}` }}>
            <p style={{ margin: '0 0 16px 0', fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>LINKS (optional)</p>
            {[
              { name: 'figma_url', label: 'Figma URL' },
              { name: 'staging_url', label: 'Staging URL' },
              { name: 'live_url', label: 'Live URL' },
              { name: 'notion_url', label: 'Notion URL' },
              { name: 'google_drive_url', label: 'Google Drive Folder' },
            ].map((field) => (
              <div key={field.name} style={{ marginBottom: '12px' }}>
                <label style={{ ...getLabelStyle(colors.textMuted) }}>{field.label}</label>
                <input name={field.name} type="url" placeholder="https://" style={getInputStyle(colors.bgSecondary, colors.border, colors.text)} />
              </div>
            ))}
          </div>

          {error && (
            <div style={{ padding: '12px 16px', backgroundColor: '#2a1515', border: '1px solid #8b3a3a', color: '#ff6b6b', fontSize: '13px', marginBottom: '20px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" onClick={onClose} disabled={isPending} style={{ flex: 1, padding: '14px', backgroundColor: 'transparent', border: `1px solid ${colors.border}`, color: colors.textSecondary, fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', cursor: isPending ? 'not-allowed' : 'pointer', fontFamily: 'Montserrat, sans-serif', minHeight: '48px', opacity: isPending ? 0.5 : 1, borderRadius: 10000 }}>
              CANCEL
            </button>
            <button type="submit" disabled={isPending} style={{ flex: 2, padding: '14px', backgroundColor: colors.accent, color: theme === 'dark' ? '#080808' : '#ffffff', border: 'none', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', cursor: isPending ? 'not-allowed' : 'pointer', fontFamily: 'Montserrat, sans-serif', minHeight: '48px', opacity: isPending ? 0.7 : 1, borderRadius: 10000 }}>
              {isPending ? 'CREATING...' : 'CREATE PROJECT'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
