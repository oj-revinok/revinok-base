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

export default function TeamPage() {
  const supabase = createClient()
  const router = useRouter()

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [currentRole, setCurrentRole] = useState('')
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
      setCurrentRole(profile.role)

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

      // Refresh member list
      const { data: members } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name')
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

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', color: '#666666', fontSize: '13px' }}>
        Loading team...
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 20px 40px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '28px',
          gap: '12px',
        }}
      >
        <h1
          style={{
            fontSize: 'clamp(24px, 5vw, 32px)',
            fontWeight: 900,
            color: '#ffffff',
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '-1px',
          }}
        >
          TEAM
        </h1>
        <button
          onClick={() => setShowInviteModal(true)}
          className="btn-primary"
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

      {/* Team members grid */}
      <div
        className="grid-auto"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))',
          gap: '16px',
        }}
      >
        {teamMembers && teamMembers.length > 0 ? (
          teamMembers.map((member) => (
            <div
              key={member.id}
              className="card-hover"
              style={{
                backgroundColor: '#0e0e0e',
                border: '1px solid #1a1a1a',
                padding: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                <div
                  className="avatar"
                  style={{
                    width: '46px',
                    height: '46px',
                    backgroundColor: '#BDD630',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#080808',
                    fontWeight: 700,
                    fontSize: '15px',
                    flexShrink: 0,
                  }}
                >
                  {(member.full_name || member.email || 'U')
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                    {member.full_name || member.email}
                  </h3>
                  <p
                    style={{
                      margin: '4px 0 0 0',
                      fontSize: '11px',
                      color: '#BDD630',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                    }}
                  >
                    {member.role}
                  </p>
                </div>
              </div>

              <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#999999', wordBreak: 'break-all' }}>
                {member.email}
              </p>

              <div
                style={{
                  paddingTop: '14px',
                  borderTop: '1px solid #1a1a1a',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <p style={{ fontSize: '10px', color: '#666666', margin: 0, textTransform: 'uppercase' }}>
                    JOINED
                  </p>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', margin: '4px 0 0 0' }}>
                    {new Date(member.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <button
                  className="btn-ghost"
                  style={{
                    padding: '10px 16px',
                    backgroundColor: 'transparent',
                    border: '1px solid #1a1a1a',
                    color: '#999999',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    fontFamily: 'Montserrat, sans-serif',
                    minHeight: '44px',
                  }}
                >
                  MANAGE
                </button>
              </div>
            </div>
          ))
        ) : (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: '#666666' }}>
            <p style={{ fontSize: '14px', margin: 0 }}>No team members yet</p>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div
            style={{
              backgroundColor: '#0e0e0e',
              border: '1px solid #1a1a1a',
              width: '100%',
              maxWidth: '480px',
              padding: '32px 24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#ffffff', textTransform: 'uppercase' }}>
                INVITE MEMBER
              </h2>
              <button
                onClick={closeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#666666',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  lineHeight: 1,
                  minHeight: '44px',
                  minWidth: '44px',
                }}
              >
                ✕
              </button>
            </div>

            {inviteSuccess ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <p style={{ fontSize: '32px', margin: '0 0 16px 0' }}>✅</p>
                <p style={{ color: '#4ade80', fontSize: '14px', fontWeight: 600, margin: '0 0 8px 0' }}>
                  Invite sent!
                </p>
                <p style={{ color: '#999999', fontSize: '13px', margin: '0 0 24px 0' }}>
                  {inviteSuccess}
                </p>
                <button
                  onClick={closeModal}
                  className="btn-primary"
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#BDD630',
                    color: '#080808',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    fontFamily: 'Montserrat, sans-serif',
                    minHeight: '44px',
                  }}
                >
                  DONE
                </button>
              </div>
            ) : (
              <form onSubmit={handleInvite}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>FULL NAME (optional)</label>
                  <input
                    type="text"
                    value={inviteFullName}
                    onChange={(e) => setInviteFullName(e.target.value)}
                    placeholder="Jane Smith"
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>EMAIL ADDRESS *</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="jane@example.com"
                    required
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: '28px' }}>
                  <label style={labelStyle}>ROLE *</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    required
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    <option value="viewer">Viewer — can view projects</option>
                    <option value="project_manager">Project Manager — can edit projects</option>
                    <option value="admin">Admin — full access</option>
                  </select>
                </div>

                {inviteError && (
                  <div
                    style={{
                      padding: '12px 16px',
                      backgroundColor: '#2a1515',
                      border: '1px solid #8b3a3a',
                      color: '#ff6b6b',
                      fontSize: '13px',
                      marginBottom: '20px',
                    }}
                  >
                    {inviteError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="btn-ghost"
                    style={{
                      flex: 1,
                      padding: '14px',
                      backgroundColor: 'transparent',
                      border: '1px solid #1a1a1a',
                      color: '#999999',
                      fontSize: '12px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      fontFamily: 'Montserrat, sans-serif',
                      minHeight: '48px',
                    }}
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={inviting}
                    className="btn-primary"
                    style={{
                      flex: 2,
                      padding: '14px',
                      backgroundColor: '#BDD630',
                      color: '#080808',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      cursor: inviting ? 'not-allowed' : 'pointer',
                      fontFamily: 'Montserrat, sans-serif',
                      opacity: inviting ? 0.7 : 1,
                      minHeight: '48px',
                    }}
                  >
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
