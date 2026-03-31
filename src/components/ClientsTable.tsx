'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/context/ThemeContext'
import { updateClientRecord, deleteClientRecord } from '@/lib/actions/clients'
import { createClient } from '@/lib/supabase/client'

interface Client {
  id: string
  name: string
  brand_name: string | null
  email: string | null
  phone?: string | null
  contact_name?: string | null
  industry: string | null
  website: string | null
  avatar_color?: string | null
  projects?: { id: string }[]
}

interface ClientsTableProps {
  clients: Client[]
  canEdit: boolean
}

export default function ClientsTable({ clients, canEdit }: ClientsTableProps) {
  const { colors, theme } = useTheme()
  const router = useRouter()
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredClients = searchQuery.trim()
    ? clients.filter((c) => {
        const q = searchQuery.toLowerCase()
        return (
          c.name.toLowerCase().includes(q) ||
          (c.email ?? '').toLowerCase().includes(q) ||
          (c.industry ?? '').toLowerCase().includes(q) ||
          (c.website ?? '').toLowerCase().includes(q)
        )
      })
    : clients

  // Live updates — refresh server data whenever clients table changes
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('clients-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
        router.refresh()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [router])

  function getInitials(client: Client) {
    return (client.name)
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editingClient) return
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await updateClientRecord(editingClient.id, formData)
        setEditingClient(null)
        window.location.reload()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update client')
      }
    })
  }

  function handleDelete(clientId: string) {
    setError(null)
    startTransition(async () => {
      try {
        await deleteClientRecord(clientId)
        setConfirmDeleteId(null)
        window.location.reload()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete client')
      }
    })
  }

  if (clients.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '80px 40px',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          color: 'var(--text-muted)',
          fontSize: '14px',
        }}
      >
        No clients yet
      </div>
    )
  }

  const searchInputStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 16px 11px 40px',
    backgroundColor: colors.bgSecondary,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    color: colors.text,
    fontSize: '13px',
    fontFamily: 'Montserrat, sans-serif',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    backgroundColor: colors.bgTertiary,
    border: `1px solid ${colors.border || colors.bgTertiary}`,
    borderRadius: 12,
    color: colors.text,
    fontSize: '13px',
    fontFamily: 'Montserrat, sans-serif',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '10px',
    fontWeight: 700,
    color: colors.textSecondary || colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '5px',
  }

  return (
    <>
      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke={colors.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search clients…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={searchInputStyle}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted,
              display: 'flex', alignItems: 'center', padding: '4px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* No results message */}
      {filteredClients.length === 0 && (
        <div
          style={{
            textAlign: 'center', padding: '60px 40px',
            backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 16, color: 'var(--text-muted)', fontSize: '14px',
          }}
        >
          No clients match &ldquo;{searchQuery}&rdquo;
        </div>
      )}

      {/* Desktop table */}
      {filteredClients.length > 0 && (
      <div className="clients-table-wrap" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Montserrat, sans-serif', minWidth: '500px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['CLIENT', 'INDUSTRY', 'EMAIL', 'PROJECTS', ...(canEdit ? ['ACTIONS'] : [])].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '16px 20px',
                    textAlign: 'left',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--brand)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredClients.map((client, index) => (
              <tr
                key={client.id}
                style={{
                  borderBottom: index < filteredClients.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      className="avatar"
                      style={{
                        width: '36px', height: '36px',
                        backgroundColor: client.avatar_color || 'var(--brand)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--bg)', fontWeight: 700, fontSize: '13px', flexShrink: 0, borderRadius: '50%',
                      }}
                    >
                      {getInitials(client)}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 800, color: 'var(--text-primary)', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                        {client.name}
                      </p>
                      {client.website && (
                        <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {client.website.replace('https://', '').replace('http://', '')}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {client.industry || '—'}
                </td>
                <td style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {client.email || '—'}
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <span
                    className="tag"
                    style={{ display: 'inline-block', padding: '4px 12px', backgroundColor: 'var(--border)', color: 'var(--brand)', fontWeight: 700, fontSize: '13px', borderRadius: 10000 }}
                  >
                    {client.projects?.length ?? 0}
                  </span>
                </td>
                {canEdit && (
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => setEditingClient(client)}
                        style={{ padding: '5px 12px', backgroundColor: 'transparent', color: colors.textMuted, border: `1px solid ${colors.bgHover || colors.border}`, borderRadius: 10000, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(client.id)}
                        style={{ padding: '5px 12px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #3a1a1a', borderRadius: 10000, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {/* Mobile cards */}
      {filteredClients.length > 0 && (
      <div className="clients-mobile-list">
        {filteredClients.map((client) => (
          <div
            key={client.id}
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '16px', marginBottom: '12px', borderRadius: 12 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
              <div
                className="avatar"
                style={{ width: '44px', height: '44px', backgroundColor: client.avatar_color || 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bg)', fontWeight: 700, fontSize: '15px', flexShrink: 0, borderRadius: '50%' }}
              >
                {getInitials(client)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 800, color: 'var(--text-primary)', fontSize: '16px', lineHeight: 1.2, wordBreak: 'break-word', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  {client.name}
                </p>
                {client.website && (
                  <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {client.website.replace('https://', '').replace('http://', '')}
                  </p>
                )}
              </div>
              <span className="tag" style={{ padding: '6px 12px', backgroundColor: 'var(--border)', color: 'var(--brand)', fontWeight: 700, fontSize: '13px', flexShrink: 0, borderRadius: 10000 }}>
                {client.projects?.length ?? 0}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: canEdit ? '14px' : 0 }}>
              {client.industry && (
                <div>
                  <p style={{ margin: 0, fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Industry</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>{client.industry}</p>
                </div>
              )}
              {client.email && (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Email</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{client.email}</p>
                </div>
              )}
            </div>
            {canEdit && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setEditingClient(client)}
                  style={{ flex: 1, padding: '10px', backgroundColor: 'transparent', color: colors.textMuted, border: `1px solid ${colors.bgHover || colors.border}`, borderRadius: 10000, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}
                >
                  Edit
                </button>
                <button
                  onClick={() => setConfirmDeleteId(client.id)}
                  style={{ flex: 1, padding: '10px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #3a1a1a', borderRadius: 10000, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      )}

      {/* Edit Modal */}
      {editingClient && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setEditingClient(null) }}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}
        >
          <div style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}`, borderRadius: 16, padding: '28px 24px', width: '100%', maxWidth: '480px', margin: 'auto', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: colors.text, textTransform: 'uppercase' }}>Edit Client</h2>
              <button onClick={() => setEditingClient(null)} style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: '22px', cursor: 'pointer', padding: '4px 8px', minHeight: '44px', minWidth: '44px' }}>×</button>
            </div>
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Full Name *</label>
                <input name="name" required defaultValue={editingClient.name} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input name="email" type="email" defaultValue={editingClient.email || ''} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input name="phone" type="tel" defaultValue={(editingClient as any).phone || ''} placeholder="+1 (555) 000-0000" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Website</label>
                <input name="website" type="url" defaultValue={editingClient.website || ''} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Industry</label>
                <input name="industry" defaultValue={editingClient.industry || ''} style={inputStyle} />
              </div>
              {error && <p style={{ margin: 0, color: '#ef4444', fontSize: '12px' }}>{error}</p>}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => setEditingClient(null)} style={{ flex: 1, padding: '12px', backgroundColor: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`, borderRadius: 10000, fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
                  Cancel
                </button>
                <button type="submit" disabled={isPending} style={{ flex: 2, padding: '12px', backgroundColor: isPending ? colors.bgHover : colors.accent, color: isPending ? colors.textMuted : (theme === 'dark' ? '#080808' : '#ffffff'), border: 'none', borderRadius: 10000, fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', cursor: isPending ? 'not-allowed' : 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
                  {isPending ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {confirmDeleteId && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmDeleteId(null) }}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
        >
          <div style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}`, borderRadius: 16, padding: '28px 24px', width: '100%', maxWidth: '400px' }}>
            <h2 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 800, color: colors.text, textTransform: 'uppercase' }}>Delete Client?</h2>
            <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: colors.textSecondary, lineHeight: 1.5 }}>
              This will permanently remove the client and cannot be undone.
            </p>
            {error && <p style={{ margin: '0 0 16px 0', color: '#ef4444', fontSize: '12px' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setConfirmDeleteId(null)} style={{ flex: 1, padding: '12px', backgroundColor: 'transparent', color: colors.textMuted, border: `1px solid ${colors.border}`, borderRadius: 10000, fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={isPending}
                style={{ flex: 1, padding: '12px', backgroundColor: isPending ? colors.bgHover : '#ef4444', color: '#ffffff', border: 'none', borderRadius: 10000, fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', cursor: isPending ? 'not-allowed' : 'pointer', fontFamily: 'Montserrat, sans-serif' }}
              >
                {isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
