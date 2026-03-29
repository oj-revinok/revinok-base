'use client'

import { useState, useEffect } from 'react'
import { getShareableTeamMembers, addProjectMember, removeProjectMember } from '@/lib/actions/projects'
import { ROLE_LABELS } from '@/types'

interface TeamMember {
  id: string
  full_name: string | null
  email: string
  role: string
  initials?: string | null
  avatar_url?: string | null
}

interface CurrentMember {
  id: string
  profile_id: string
  profiles: TeamMember | null
}

interface Props {
  projectId: string
  projectName: string
  currentMembers: CurrentMember[]
  onClose: () => void
}

export default function ShareProjectModal({ projectId, projectName, currentMembers, onClose }: Props) {
  const [allMembers, setAllMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [members, setMembers] = useState<CurrentMember[]>(currentMembers)

  const currentMemberIds = new Set(members.map(m => m.profile_id))

  useEffect(() => {
    getShareableTeamMembers().then(data => {
      setAllMembers(data as TeamMember[])
      setLoading(false)
    })
  }, [])

  async function handleAdd(memberId: string) {
    setAdding(memberId)
    try {
      await addProjectMember(projectId, memberId)
      const added = allMembers.find(m => m.id === memberId)
      if (added) {
        setMembers(prev => [...prev, {
          id: `temp-${memberId}`,
          profile_id: memberId,
          profiles: added,
        }])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setAdding(null)
    }
  }

  async function handleRemove(memberId: string) {
    setRemoving(memberId)
    try {
      await removeProjectMember(projectId, memberId)
      setMembers(prev => prev.filter(m => m.profile_id !== memberId))
    } catch (err) {
      console.error(err)
    } finally {
      setRemoving(null)
    }
  }

  const addableMembers = allMembers.filter(m => !currentMemberIds.has(m.id))
  const sharedMembers = members.filter(m => m.profiles)

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#0e0e0e', border: '1px solid #222', width: '100%', maxWidth: '520px',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ color: '#ffffff', fontSize: '14px', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Share Project
            </h2>
            <p style={{ color: '#555555', fontSize: '11px', margin: '4px 0 0 0' }}>{projectName}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555555', cursor: 'pointer', fontSize: '18px', padding: '4px' }}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {/* Currently shared with */}
          {sharedMembers.length > 0 && (
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #1a1a1a' }}>
              <p style={{ color: '#BDD630', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px 0' }}>
                Shared with ({sharedMembers.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sharedMembers.map(m => {
                  const p = m.profiles!
                  const initials = p.initials || (p.full_name || p.email).slice(0, 2).toUpperCase()
                  return (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', backgroundColor: '#111111' }}>
                      <div style={{ width: '32px', height: '32px', backgroundColor: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#BDD630', flexShrink: 0 }}>
                        {initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: '#ffffff', fontSize: '13px', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.full_name || p.email}
                        </p>
                        <p style={{ color: '#555555', fontSize: '11px', margin: '2px 0 0 0', textTransform: 'uppercase' }}>
                          {ROLE_LABELS[p.role as keyof typeof ROLE_LABELS] || p.role}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemove(m.profile_id)}
                        disabled={removing === m.profile_id}
                        style={{
                          background: 'none', border: '1px solid #333', color: '#666666',
                          cursor: 'pointer', fontSize: '10px', fontWeight: 700,
                          textTransform: 'uppercase', padding: '4px 10px', flexShrink: 0,
                          fontFamily: 'Montserrat, sans-serif',
                          opacity: removing === m.profile_id ? 0.5 : 1,
                        }}
                      >
                        {removing === m.profile_id ? '…' : 'Remove'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Add team members */}
          <div style={{ padding: '20px 24px' }}>
            <p style={{ color: '#666666', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px 0' }}>
              Add Team Members
            </p>
            {loading ? (
              <p style={{ color: '#444444', fontSize: '13px' }}>Loading team…</p>
            ) : addableMembers.length === 0 ? (
              <p style={{ color: '#444444', fontSize: '13px' }}>All team members already have access.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {addableMembers.map(m => {
                  const initials = m.initials || (m.full_name || m.email).slice(0, 2).toUpperCase()
                  return (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', backgroundColor: '#111111' }}>
                      <div style={{ width: '32px', height: '32px', backgroundColor: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#555555', flexShrink: 0 }}>
                        {initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: '#cccccc', fontSize: '13px', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.full_name || m.email}
                        </p>
                        <p style={{ color: '#444444', fontSize: '11px', margin: '2px 0 0 0', textTransform: 'uppercase' }}>
                          {ROLE_LABELS[m.role as keyof typeof ROLE_LABELS] || m.role}
                        </p>
                      </div>
                      <button
                        onClick={() => handleAdd(m.id)}
                        disabled={adding === m.id}
                        style={{
                          background: adding === m.id ? '#1a1a1a' : '#BDD630',
                          border: 'none',
                          color: adding === m.id ? '#555555' : '#080808',
                          cursor: 'pointer', fontSize: '10px', fontWeight: 700,
                          textTransform: 'uppercase', padding: '4px 12px', flexShrink: 0,
                          fontFamily: 'Montserrat, sans-serif',
                        }}
                      >
                        {adding === m.id ? '…' : 'Add'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Info note */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid #1a1a1a', backgroundColor: '#080808' }}>
          <p style={{ color: '#444444', fontSize: '11px', margin: 0, lineHeight: 1.5 }}>
            Shared team members can view this project, add notes and files, but cannot delete content or create projects.
          </p>
        </div>
      </div>
    </div>
  )
}
