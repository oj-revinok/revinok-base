'use client'

import { useState, useEffect, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createProject } from '@/lib/actions/projects'

const STATUSES = ['discovery', 'design', 'development', 'review', 'live', 'paused']

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 600,
  color: '#BDD630',
  marginBottom: '8px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  backgroundColor: '#111111',
  border: '1px solid #1a1a1a',
  color: '#ffffff',
  fontSize: '14px',
  fontFamily: 'Montserrat, sans-serif',
  boxSizing: 'border-box',
}

export default function AddProjectModal({ onClose }: { onClose: () => void }) {
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
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ backgroundColor: '#0e0e0e', border: '1px solid #1a1a1a', width: '100%', maxWidth: '560px', padding: '32px 24px', margin: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#ffffff', textTransform: 'uppercase' }}>NEW PROJECT</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666666', fontSize: '20px', cursor: 'pointer', minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Client */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>CLIENT</label>
            <select name="client_id" style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">No client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.brand_name || c.name}</option>
              ))}
            </select>
          </div>

          {/* Project name */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>PROJECT NAME *</label>
            <input name="name" type="text" required placeholder="e.g. Brand Website Redesign" style={inputStyle} />
          </div>

          {/* Status */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>STATUS</label>
            <select name="status" defaultValue="discovery" style={{ ...inputStyle, cursor: 'pointer' }}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>DESCRIPTION</label>
            <textarea name="description" rows={3} placeholder="Brief project description..." style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.6' }} />
          </div>

          {/* Dates row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={labelStyle}>START DATE</label>
              <input name="start_date" type="date" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>DUE DATE</label>
              <input name="due_date" type="date" style={inputStyle} />
            </div>
          </div>

          {/* Notion project link */}
          <div style={{ marginBottom: '20px', paddingTop: '16px', borderTop: '1px solid #1a1a1a' }}>
            <label style={labelStyle}>☰ NOTION PROJECT</label>
            <select name="notion_project_id" style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">— Not linked —</option>
              {loadingNotion && <option disabled>Loading Notion projects…</option>}
              {notionProjects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <p style={{ fontSize: '11px', color: '#555555', marginTop: '6px', marginBottom: 0 }}>
              Link to pull tasks automatically from Notion Workload
            </p>
          </div>

          {/* Links */}
          <div style={{ marginBottom: '20px', paddingTop: '16px', borderTop: '1px solid #1a1a1a' }}>
            <p style={{ margin: '0 0 16px 0', fontSize: '11px', color: '#555555', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>LINKS (optional)</p>
            {[
              { name: 'figma_url', label: 'Figma URL' },
              { name: 'staging_url', label: 'Staging URL' },
              { name: 'live_url', label: 'Live URL' },
              { name: 'notion_url', label: 'Notion URL' },
              { name: 'google_drive_url', label: 'Google Drive Folder' },
            ].map((field) => (
              <div key={field.name} style={{ marginBottom: '12px' }}>
                <label style={{ ...labelStyle, color: '#555555' }}>{field.label}</label>
                <input name={field.name} type="url" placeholder="https://" style={inputStyle} />
              </div>
            ))}
          </div>

          {error && (
            <div style={{ padding: '12px 16px', backgroundColor: '#2a1515', border: '1px solid #8b3a3a', color: '#ff6b6b', fontSize: '13px', marginBottom: '20px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" onClick={onClose} disabled={isPending} style={{ flex: 1, padding: '14px', backgroundColor: 'transparent', border: '1px solid #1a1a1a', color: '#999999', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', cursor: isPending ? 'not-allowed' : 'pointer', fontFamily: 'Montserrat, sans-serif', minHeight: '48px', opacity: isPending ? 0.5 : 1 }}>
              CANCEL
            </button>
            <button type="submit" disabled={isPending} style={{ flex: 2, padding: '14px', backgroundColor: '#BDD630', color: '#080808', border: 'none', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', cursor: isPending ? 'not-allowed' : 'pointer', fontFamily: 'Montserrat, sans-serif', minHeight: '48px', opacity: isPending ? 0.7 : 1 }}>
              {isPending ? 'CREATING...' : 'CREATE PROJECT'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
