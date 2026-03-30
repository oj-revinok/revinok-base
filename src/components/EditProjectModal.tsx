'use client'

import { useState, useEffect, useTransition } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { createClient } from '@/lib/supabase/client'
import { updateProject } from '@/lib/actions/projects'

const STATUSES = ['discovery', 'design', 'development', 'review', 'live', 'paused', 'cancelled']

const createStyles = (colors: any) => ({
  labelStyle: {
    display: 'block',
    fontSize: '11px',
    fontWeight: 600,
    color: colors.accent,
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  } as React.CSSProperties,
  inputStyle: {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: colors.bgTertiary,
    border: `1px solid ${colors.bgTertiary}`,
    color: colors.text,
    fontSize: '14px',
    fontFamily: 'Montserrat, sans-serif',
    boxSizing: 'border-box',
  } as React.CSSProperties,
})

interface Project {
  id: string
  name: string
  description: string | null
  status: string
  start_date: string | null
  due_date: string | null
  figma_url: string | null
  staging_url: string | null
  live_url: string | null
  notion_url: string | null
  notion_project_id: string | null
  google_drive_url?: string | null
  clients?: { id: string; name: string; brand_name: string | null } | null
}

interface Props {
  project: Project
  onClose: () => void
  onSave: (updates: Partial<Project>) => void
}

export default function EditProjectModal({ project, onClose, onSave }: Props) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const { labelStyle, inputStyle } = styles
  const [clients, setClients] = useState<{ id: string; name: string; brand_name: string | null }[]>([])
  const [notionProjects, setNotionProjects] = useState<{ id: string; name: string }[]>([])
  const [loadingNotion, setLoadingNotion] = useState(false)
  const [error, setError] = useState('')
  const [, startTransition] = useTransition()

  useEffect(() => {
    createClient()
      .from('clients')
      .select('id, name, brand_name')
      .order('name')
      .then(({ data }) => setClients(data || []))

    setLoadingNotion(true)
    fetch('/api/notion/projects')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setNotionProjects(data) })
      .catch(() => {})
      .finally(() => setLoadingNotion(false))
  }, [])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)

    const updates = {
      name: fd.get('name') as string,
      description: (fd.get('description') as string) || null,
      client_id: (fd.get('client_id') as string) || null,
      status: (fd.get('status') as string) || 'discovery',
      start_date: (fd.get('start_date') as string) || null,
      due_date: (fd.get('due_date') as string) || null,
      notion_project_id: (fd.get('notion_project_id') as string) || null,
      figma_url: (fd.get('figma_url') as string) || null,
      staging_url: (fd.get('staging_url') as string) || null,
      live_url: (fd.get('live_url') as string) || null,
      notion_url: (fd.get('notion_url') as string) || null,
      google_drive_url: (fd.get('google_drive_url') as string) || null,
    }

    startTransition(async () => {
      try {
        await updateProject(project.id, updates)
        onSave(updates)
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save project')
      }
    })
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, backgroundColor: colors.modalOverlay, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.bgTertiary}`, width: '100%', maxWidth: '560px', padding: '32px 24px', margin: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: colors.text, textTransform: 'uppercase' }}>EDIT PROJECT</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: colors.textSecondary, fontSize: '20px', cursor: 'pointer', minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Client */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>CLIENT</label>
            <select name="client_id" defaultValue={project.clients?.id || ''} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">No client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.brand_name || c.name}</option>
              ))}
            </select>
          </div>

          {/* Project name */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>PROJECT NAME *</label>
            <input name="name" type="text" required defaultValue={project.name} style={inputStyle} />
          </div>

          {/* Status */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>STATUS</label>
            <select name="status" defaultValue={project.status} style={{ ...inputStyle, cursor: 'pointer' }}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>DESCRIPTION</label>
            <textarea name="description" rows={3} defaultValue={project.description || ''} style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.6' }} />
          </div>

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={labelStyle}>START DATE</label>
              <input name="start_date" type="date" defaultValue={project.start_date?.split('T')[0] || ''} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>DUE DATE</label>
              <input name="due_date" type="date" defaultValue={project.due_date?.split('T')[0] || ''} style={inputStyle} />
            </div>
          </div>

          {/* Notion project link */}
          <div style={{ marginBottom: '20px', paddingTop: '16px', borderTop: `1px solid ${colors.bgTertiary}` }}>
            <label style={labelStyle}>☰ NOTION PROJECT</label>
            <select name="notion_project_id" defaultValue={project.notion_project_id || ''} style={{ ...inputStyle, cursor: 'pointer' }}>
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
          <div style={{ marginBottom: '20px', paddingTop: '16px', borderTop: `1px solid ${colors.bgTertiary}` }}>
            <p style={{ margin: '0 0 16px 0', fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>LINKS (optional)</p>
            {[
              { name: 'figma_url', label: 'Figma URL', value: project.figma_url },
              { name: 'staging_url', label: 'Staging URL', value: project.staging_url },
              { name: 'live_url', label: 'Live URL', value: project.live_url },
              { name: 'notion_url', label: 'Notion URL', value: project.notion_url },
              { name: 'google_drive_url', label: 'Google Drive Folder', value: project.google_drive_url ?? null },
            ].map((field) => (
              <div key={field.name} style={{ marginBottom: '12px' }}>
                <label style={{ ...labelStyle, color: colors.textMuted }}>{field.label}</label>
                <input name={field.name} type="url" placeholder="https://" defaultValue={field.value || ''} style={inputStyle} />
              </div>
            ))}
          </div>

          {error && (
            <div style={{ padding: '12px 16px', backgroundColor: '#2a1515', border: '1px solid #8b3a3a', color: '#ff6b6b', fontSize: '13px', marginBottom: '20px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '14px', backgroundColor: 'transparent', border: `1px solid ${colors.bgTertiary}`, color: colors.textSecondary, fontSize: 13, fontWeight: 600, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', minHeight: '48px', borderRadius: 10000 }}>
              CANCEL
            </button>
            <button type="submit" style={{ flex: 2, padding: '14px', backgroundColor: colors.accent, color: colors.bg, border: 'none', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', minHeight: '48px', borderRadius: 10000 }}>
              SAVE CHANGES
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
