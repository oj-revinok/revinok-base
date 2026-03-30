'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { inviteMember, updateMemberRole, updateMemberNotionId, getNotionPersons, getNotionTeamPersonsFromDB, resetMemberPassword, generatePassword, NotionPerson, type NotionTeamPerson } from '@/lib/actions/team'

interface TeamMember {
  id: string
  full_name: string | null
  email: string | null
  role: string
  notion_person_id: string | null
  created_at: string
}

const ROLE_COLORS: Record<string, string> = {
  admin: '#BDD630',
  project_manager: '#4a9eff',
  designer: '#a78bfa',
  developer: '#f97316',
  designer_dev: '#ec4899',
  viewer: '#666666',
  client: '#555555',
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  project_manager: 'Project Manager',
  designer: 'Designer',
  developer: 'Developer',
  designer_dev: 'Designer / Dev',
  viewer: 'Viewer',
  client: 'Client',
}

export default function TeamPage() {
  const supabase = createClient()
  const router = useRouter()

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [notionPersons, setNotionPersons] = useState<(NotionPerson | NotionTeamPerson)[]>([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('designer')
  const [inviteFullName, setInviteFullName] = useState('')
  const [inviteNotionPersonId, setInviteNotionPersonId] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')

  // Per-member editing state
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState('')
  const [editNotionPersonId, setEditNotionPersonId] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Per-member password state
  const [pwMemberId, setPwMemberId] = useState<string | null>(null)
  const [pwValue, setPwValue] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

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

      setIsAdmin(profile?.role === 'admin')

      const { data: members } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name')

      setTeamMembers(members || [])
      setLoading(false)

      // Load Notion persons for the picker (non-blocking)
      // Use Team DB members (these IDs match the relation IDs in Notion tasks)
      getNotionTeamPersonsFromDB().then(setNotionPersons).catch(() => {
        // Fall back to workspace users if Team DB fetch fails
        getNotionPersons().then(setNotionPersons).catch(() => {})
      })
    }
    load()
  }, [])

  async function refreshMembers() {
    const { data: members } = await supabase.from('profiles').select('*').order('full_name')
    setTeamMembers(members || [])
  }

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
      if (inviteNotionPersonId.trim()) {
        fd.set('notion_person_id', inviteNotionPersonId.trim())
      }
      await inviteMember(fd)
      setInviteSuccess(`Invite sent to ${inviteEmail}`)
      setInviteEmail('')
      setInviteFullName('')
      setInviteRole('designer')
      setInviteNotionPersonId('')
      await refreshMembers()
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
    setInviteRole('designer')
    setInviteNotionPersonId('')
  }

  function startEditing(member: TeamMember) {
    setEditingMemberId(member.id)
    setEditRole(member.role)
    setEditNotionPersonId((member as any).notion_person_id || '')
    setSaveError('')
  }

  function cancelEditing() {
    setEditingMemberId(null)
    setSaveError('')
  }

  async function handleSaveMember(memberId: string) {
    setSaving(true)
    setSaveError('')
    try {
      await updateMemberRole(memberId, editRole)
      await updateMemberNotionId(memberId, editNotionPersonId.trim() || null)
      setEditingMemberId(null)
      await refreshMembers()
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function openPasswordPanel(member: TeamMember) {
    setPwMemberId(member.id)
    const suggested = await generatePassword(member.full_name || member.email || 'User')
    setPwValue(suggested)
    setPwError('')
    setPwSuccess('')
  }

  function closePasswordPanel() {
    setPwMemberId(null)
    setPwValue('')
    setPwError('')
    setPwSuccess('')
  }

  async function handleResetPassword(memberId: string) {
    if (!pwValue.trim()) return
    setPwSaving(true)
    setPwError('')
    setPwSuccess('')
    try {
      const result = await resetMemberPassword(memberId, pwValue.trim())
      if (result.success) {
        setPwSuccess(`Password updated. New password: ${pwValue.trim()}`)
      } else {
        setPwError(result.error || 'Failed to reset password')
      }
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : 'Failed to reset password')
    } finally {
      setPwSaving(false)
    }
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
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Montserrat, sans-serif', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                  {['MEMBER', 'ROLE', 'NOTION ID', 'JOINED', ''].map((h) => (
                    <th key={h} style={{ padding: '16px 20px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#BDD630', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((member, index) => {
                  const isEditing = editingMemberId === member.id
                  return (
                    <tr key={member.id} style={{ borderBottom: index < teamMembers.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="avatar" style={{ width: '36px', height: '36px', backgroundColor: '#BDD630', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#080808', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>
                            {initials(member)}
                          </div>
                          <div>
                            <p style={{ margin: 0, fontWeight: 800, color: '#ffffff', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                              {member.full_name || member.email}
                            </p>
                            {member.full_name && member.email && (
                              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#555555' }}>{member.email}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', minWidth: '160px' }}>
                        {isEditing ? (
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value)}
                            style={{ ...inlineInputStyle, minWidth: '140px' }}
                          >
                            {Object.entries(ROLE_LABELS).map(([val, label]) => (
                              <option key={val} value={val}>{label}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="tag" style={{ display: 'inline-block', padding: '4px 12px', backgroundColor: '#1a1a1a', color: ROLE_COLORS[member.role] || '#666666', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>
                            {ROLE_LABELS[member.role] || member.role.replace('_', ' ')}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '16px 20px', minWidth: '200px' }}>
                        {isEditing ? (
                          <select
                            value={editNotionPersonId}
                            onChange={(e) => setEditNotionPersonId(e.target.value)}
                            style={{ ...inlineInputStyle, minWidth: '180px', cursor: 'pointer' }}
                          >
                            <option value="">— Not linked —</option>
                            {notionPersons.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}{p.email ? ` (${p.email})` : ''}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span style={{ fontSize: '12px', color: (member as any).notion_person_id ? '#999999' : '#333333' }}>
                            {(member as any).notion_person_id
                              ? (notionPersons.find(p => p.id === (member as any).notion_person_id)?.name || (member as any).notion_person_id.slice(0, 8) + '…')
                              : '—'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: '13px', color: '#999999', whiteSpace: 'nowrap' }}>
                        {new Date(member.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '16px 20px', whiteSpace: 'nowrap' }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {saveError && <span style={{ fontSize: '11px', color: '#ff6b6b' }}>{saveError}</span>}
                            <button
                              onClick={() => handleSaveMember(member.id)}
                              disabled={saving}
                              style={{ padding: '6px 14px', backgroundColor: '#BDD630', color: '#080808', border: 'none', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Montserrat, sans-serif', opacity: saving ? 0.7 : 1 }}
                            >
                              {saving ? '...' : 'SAVE'}
                            </button>
                            <button
                              onClick={cancelEditing}
                              style={{ padding: '6px 14px', backgroundColor: 'transparent', color: '#666666', border: '1px solid #222222', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}
                            >
                              CANCEL
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <button
                              onClick={() => startEditing(member)}
                              style={{ padding: '6px 14px', backgroundColor: 'transparent', color: '#555555', border: '1px solid #222222', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}
                            >
                              EDIT
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => openPasswordPanel(member)}
                                style={{ padding: '6px 12px', backgroundColor: 'transparent', color: '#4a9eff', border: '1px solid #1a3a5c', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}
                                title="Reset password"
                              >
                                PW
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="clients-mobile-list">
            {teamMembers.map((member) => {
              const isEditing = editingMemberId === member.id
              return (
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
                    {!isEditing && (
                      <span className="tag" style={{ padding: '6px 12px', backgroundColor: '#1a1a1a', color: ROLE_COLORS[member.role] || '#666666', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', flexShrink: 0 }}>
                        {ROLE_LABELS[member.role] || member.role.replace('_', ' ')}
                      </span>
                    )}
                  </div>

                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <label style={labelStyle}>ROLE</label>
                        <select value={editRole} onChange={(e) => setEditRole(e.target.value)} style={inputStyle}>
                          {Object.entries(ROLE_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>NOTION PERSON</label>
                        <select
                          value={editNotionPersonId}
                          onChange={(e) => setEditNotionPersonId(e.target.value)}
                          style={{ ...inputStyle, cursor: 'pointer' }}
                        >
                          <option value="">— Not linked —</option>
                          {notionPersons.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}{p.email ? ` (${p.email})` : ''}
                            </option>
                          ))}
                        </select>
                        <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#444444' }}>
                          Links this member to Notion so their tasks appear in the Tasks page.
                        </p>
                      </div>
                      {saveError && <p style={{ margin: 0, fontSize: '12px', color: '#ff6b6b' }}>{saveError}</p>}
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => handleSaveMember(member.id)}
                          disabled={saving}
                          style={{ flex: 1, padding: '12px', backgroundColor: '#BDD630', color: '#080808', border: 'none', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Montserrat, sans-serif', opacity: saving ? 0.7 : 1, minHeight: '44px' }}
                        >
                          {saving ? 'SAVING...' : 'SAVE'}
                        </button>
                        <button
                          onClick={cancelEditing}
                          style={{ flex: 1, padding: '12px', backgroundColor: 'transparent', color: '#666666', border: '1px solid #222222', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', minHeight: '44px' }}
                        >
                          CANCEL
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                        <div>
                          <p style={{ margin: 0, fontSize: '10px', color: '#555555', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Joined</p>
                          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#999999' }}>
                            {new Date(member.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: '10px', color: '#555555', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Notion</p>
                          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: (member as any).notion_person_id ? '#999999' : '#333333' }}>
                            {(member as any).notion_person_id
                              ? (notionPersons.find(p => p.id === (member as any).notion_person_id)?.name || 'Linked')
                              : 'Not linked'}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {isAdmin && (
                          <button
                            onClick={() => openPasswordPanel(member)}
                            style={{ padding: '8px 14px', backgroundColor: 'transparent', color: '#4a9eff', border: '1px solid #1a3a5c', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', minHeight: '36px' }}
                          >
                            PW
                          </button>
                        )}
                        <button
                          onClick={() => startEditing(member)}
                          style={{ padding: '8px 16px', backgroundColor: 'transparent', color: '#555555', border: '1px solid #222222', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', minHeight: '36px' }}
                        >
                          EDIT
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
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
          <div style={{ backgroundColor: '#0e0e0e', border: '1px solid #1a1a1a', width: '100%', maxWidth: '480px', padding: '32px 24px', maxHeight: '90vh', overflowY: 'auto' }}>
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
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>ROLE *</label>
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} required style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="designer">Designer</option>
                    <option value="developer">Developer</option>
                    <option value="designer_dev">Designer / Dev</option>
                    <option value="project_manager">Project Manager</option>
                    <option value="admin">Admin — full access</option>
                    <option value="viewer">Viewer — view only</option>
                    <option value="client">Client</option>
                  </select>
                </div>
                <div style={{ marginBottom: '28px' }}>
                  <label style={labelStyle}>NOTION PERSON (optional)</label>
                  <select
                    value={inviteNotionPersonId}
                    onChange={(e) => setInviteNotionPersonId(e.target.value)}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    <option value="">— Not linked —</option>
                    {notionPersons.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.email ? ` (${p.email})` : ''}
                      </option>
                    ))}
                  </select>
                  <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#444444' }}>
                    Links this member to Notion so their tasks appear in the Tasks page.
                  </p>
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

      {/* Password Reset Modal */}
      {pwMemberId && (() => {
        const member = teamMembers.find(m => m.id === pwMemberId)
        if (!member) return null
        return (
          <div
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
            onClick={(e) => { if (e.target === e.currentTarget) closePasswordPanel() }}
          >
            <div style={{ backgroundColor: '#0e0e0e', border: '1px solid #1a1a1a', width: '100%', maxWidth: '420px', padding: '32px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#ffffff', textTransform: 'uppercase' }}>RESET PASSWORD</h2>
                <button onClick={closePasswordPanel} style={{ background: 'none', border: 'none', color: '#666666', fontSize: '20px', cursor: 'pointer', padding: '4px 8px', lineHeight: 1, minHeight: '44px', minWidth: '44px' }}>✕</button>
              </div>
              <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#888888' }}>
                Setting password for <span style={{ color: '#ffffff', fontWeight: 700 }}>{member.full_name || member.email}</span>
              </p>
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>NEW PASSWORD</label>
                <input
                  type="text"
                  value={pwValue}
                  onChange={(e) => setPwValue(e.target.value)}
                  placeholder="Enter password"
                  style={inputStyle}
                />
              </div>
              <button
                type="button"
                onClick={async () => {
                  const suggested = await generatePassword(member.full_name || member.email || 'User')
                  setPwValue(suggested)
                  setPwSuccess('')
                  setPwError('')
                }}
                style={{ width: '100%', padding: '10px', backgroundColor: '#111111', color: '#888888', border: '1px solid #222222', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', marginBottom: '20px' }}
              >
                GENERATE NEW PASSWORD
              </button>
              {pwError && (
                <div style={{ padding: '12px 16px', backgroundColor: '#2a1515', border: '1px solid #8b3a3a', color: '#ff6b6b', fontSize: '13px', marginBottom: '16px' }}>
                  {pwError}
                </div>
              )}
              {pwSuccess && (
                <div style={{ padding: '12px 16px', backgroundColor: '#0f2a0f', border: '1px solid #2d6a2d', color: '#4ade80', fontSize: '13px', marginBottom: '16px' }}>
                  {pwSuccess}
                </div>
              )}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={closePasswordPanel}
                  style={{ flex: 1, padding: '14px', backgroundColor: 'transparent', border: '1px solid #1a1a1a', color: '#999999', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', minHeight: '48px' }}
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={() => handleResetPassword(pwMemberId)}
                  disabled={pwSaving || !pwValue.trim()}
                  style={{ flex: 2, padding: '14px', backgroundColor: '#4a9eff', color: '#ffffff', border: 'none', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', cursor: (pwSaving || !pwValue.trim()) ? 'not-allowed' : 'pointer', fontFamily: 'Montserrat, sans-serif', opacity: (pwSaving || !pwValue.trim()) ? 0.6 : 1, minHeight: '48px' }}
                >
                  {pwSaving ? 'SAVING...' : 'RESET PASSWORD'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
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

const inlineInputStyle: React.CSSProperties = {
  padding: '6px 10px',
  backgroundColor: '#111111',
  border: '1px solid #333333',
  color: '#ffffff',
  fontSize: '12px',
  fontFamily: 'Montserrat, sans-serif',
  boxSizing: 'border-box',
}
