'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { inviteMember } from '@/lib/actions/team'

interface TeamMember {
  id: string
  full_name: string | null
  email: string | null
  role: string
  created_at: string
}

const ROLE_COLORS: Record<string, string> = {
  admin: '#BDD630',
  project_manager: '#4a9eff',
  viewer: '#666666',
}

export default function TeamPage() {
  const supabase = createClient()
  const router = useRouter()

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('viewer')
  const [inviteFullName, setInviteFullName] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin' && profile?.role !== 'project_manager') {
        router.push('/dashboard')
        return
      }

      const { data: members } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name')

      setTeamMembers(members || [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    setInviteError('')
    setInviteSuccess('')

    try {
      const fd = new FormData()
      fd.set('email', inviteEmail)
      fd.set('role', inviteRole)
      fd.set('full_name', inviteFullName)
      await inviteMember(fd)
      setInviteSuccess(`Invite sent to ${inviteEmail}`)
      setInviteEmail('')
      setInviteFullName('')
      setInviteRole('viewer')
      const { data: members } = await supabase.from('profiles').select('*').order('full_name')
      setTeamMembers(members || [])
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invite')
    } finally {
      setInviting(false)
    }
  }

  function closeModal() {
    setShowInviteModal(false)
    setInviteError('')
    setInviteSuccess('')
    setInviteEmail('')
    setInviteFullName('')
    setInviteRole('viewer')
  }

  function initials(member: TeamMember) {
    return (member.full_name || member.email || 'U')
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  if (loading) {
    return <div style={{ padding: '40px 20px', color: '#666666', fontSize: '13px' }}>Loading team...</div>
  }

  return (
    <div style={{ padding: '20px 16px 40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 900, color: '#ffffff', margin: 0, textTransform: 'uppercase', letterSpacing: '-1px' }}>
          TEAM
        </h1>
        <button
          onClick={() => setShowInviteModal(true)}
          style={{
            padding: '12px 20px',
            backgroundColor: '#BDD630',
            color: '#080808',
            border: 'none',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            cursor: 'pointer',
            fontFamily: 'Montserrat, sans-serif',
            minHeight: '44px',
            whiteSpace: 'nowrap',
          }}
        >
          + INVITE MEMBER
        </button>
      </div>

      {teamMembers.length > 0 ? (
        <>
          {/* Desktop table */}
          <div className="clients-table-wrap" style={{ backgroundColor: '#0e0e0e', border: '1px solid #1a1a1a', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Montserrat, sans-serif', minWidth: '500px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                  {['MEMBER', 'ROLE', 'EMAIL', 'JOINED'].map((h) => (
                    <th key={h} style={{ padding: '16px 20px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#BDD630', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((member, index) => (
                  <tr key={member.id} style={{ borderBottom: index < teamMembers.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="avatar" style={{ width: '36px', height: '36px', backgroundColor: '#BDD630', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#080808', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>
                          {initials(member)}
                        </div>
                        <p style={{ margin: 0, fontWeight: 800, color: '#ffffff', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                          {member.full_name || member.email}
                        </p>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span className="tag" style={{ display: 'inline-block', padding: '4px 12px', backgroundColor: '#1a1a1a', color: ROLE_COLORS[member.role] || '#666666', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>
                        {member.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '13px', color: '#999999' }}>
                      {member.email || '—'}
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '13px', color: '#999999' }}>
                      {new Date(member.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="clients-mobile-list">
            {teamMembers.map((member) => (
              <div key={member.id} style={{ backgroundColor: '#0e0e0e', border: '1px solid #1a1a1a', padding: '16px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                  <div className="avatar" style={{ width: '44px', height: '44px', backgroundColor: '#BDD630', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#080808', fontWeight: 700, fontSize: '15px', flexShrink: 0 }}>
                    {initials(member)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 800, color: '#ffffff', fontSize: '16px', lineHeight: 1.2, wordBreak: 'break-word', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      {member.full_name || member.email}
                    </p>
                    {member.email && member.full_name && (
                      <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#666666' }}>{member.email}</p>
                    )}
                  </div>
                  <span className="tag" style={{ padding: '6px 12px', backgroundColor: '#1a1a1a', color: ROLE_COLORS[member.role] || '#666666', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', flexShrink: 0 }}>
                    {member.role.replace('_', ' ')}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '10px', color: '#555555', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Joined</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#999999' }}>
                      {new Date(member.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '80px 40px', backgroundColor: '#0e0e0e', border: '1px solid #1a1a1a', color: '#555555', fontSize: '14px' }}>
          No team members yet
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div style={{ backgroundColor: '#0e0e0e', border: '1px solid #1a1a1a', width: '100%', maxWidth: '480px', padding: '32px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#ffffff', textTransform: 'uppercase' }}>INVITE MEMBER</h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: '#666666', fontSize: '20px', cursor: 'pointer', padding: '4px 8px', lineHeight: 1, minHeight: '44px', minWidth: '44px' }}>✕</button>
            </div>

            {inviteSuccess ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <p style={{ fontSize: '32px', margin: '0 0 16px 0' }}>✅</p>
                <p style={{ color: '#4ade80', fontSize: '14px', fontWeight: 600, margin: '0 0 8px 0' }}>Invite sent!</p>
                <p style={{ color: '#999999', fontSize: '13px', margin: '0 0 24px 0' }}>{inviteSuccess}</p>
                <button onClick={closeModal} style={{ padding: '12px 24px', backgroundColor: '#BDD630', color: '#080808', border: 'none', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', minHeight: '44px' }}>
                  DONE
                </button>
              </div>
            ) : (
              <form onSubmit={handleInvite}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>FULL NAME (optional)</label>
                  <input type="text" value={inviteFullName} onChange={(e) => setInviteFullName(e.target.value)} placeholder="Jane Smith" style={inputStyle} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>EMAIL ADDRESS *</label>
                  <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="jane@example.com" required style={inputStyle} />
                </div>
                <div style={{ marginBottom: '28px' }}>
                  <label style={labelStyle}>ROLE *</label>
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} required style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="viewer">Viewer — can view projects</option>
                    <option value="project_manager">Project Manager — can edit projects</option>
                    <option value="admin">Admin — full access</option>
                  </select>
                </div>
                {inviteError && (
                  <div style={{ padding: '12px 16px', backgroundColor: '#2a1515', border: '1px solid #8b3a3a', color: '#ff6b6b', fontSize: '13px', marginBottom: '20px' }}>
                    {inviteError}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" onClick={closeModal} style={{ flex: 1, padding: '14px', backgroundColor: 'transparent', border: '1px solid #1a1a1a', color: '#999999', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', minHeight: '48px' }}>
                    CANCEL
                  </button>
                  <button type="submit" disabled={inviting} style={{ flex: 2, padding: '14px', backgroundColor: '#BDD630', color: '#080808', border: 'none', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', cursor: inviting ? 'not-allowed' : 'pointer', fontFamily: 'Montserrat, sans-serif', opacity: inviting ? 0.7 : 1, minHeight: '48px' }}>
                    {inviting ? 'SENDING...' : 'SEND INVITE'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

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
