'use client'

import { useState } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { createGroup, updateGroup } from '@/lib/actions/groups'
import type { Group } from '@/types'

interface SimpleMember {
  id: string
  full_name: string | null
  email: string | null
  role: string
  avatar_initials?: string | null
}

interface GroupModalProps {
  isOpen: boolean
  onClose: () => void
  onGroupSaved?: (group: Group) => void
  group?: Group
  teamMembers: SimpleMember[]
}

export default function GroupModal({
  isOpen,
  onClose,
  onGroupSaved,
  group,
  teamMembers,
}: GroupModalProps) {
  const { colors, theme } = useTheme()
  const [name, setName] = useState(group?.name || '')
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(
    new Set(group?.members?.map((m) => m.id) || [])
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function toggleMember(memberId: string) {
    const newSet = new Set(selectedMemberIds)
    if (newSet.has(memberId)) {
      newSet.delete(memberId)
    } else {
      newSet.add(memberId)
    }
    setSelectedMemberIds(newSet)
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('Group name is required')
      return
    }

    setSaving(true)
    setError('')

    try {
      let savedGroup: Group | null = null
      if (group) {
        const ok = await updateGroup(group.id, name, Array.from(selectedMemberIds))
        if (ok && group.members) {
          savedGroup = {
            ...group,
            name,
            members: teamMembers.filter((m) => selectedMemberIds.has(m.id)),
          }
        }
      } else {
        savedGroup = await createGroup(name, Array.from(selectedMemberIds))
      }

      if (savedGroup) {
        onGroupSaved?.(savedGroup)
        onClose()
      } else {
        setError('Failed to save group')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save group')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          backgroundColor: colors.bgSecondary,
          border: `1px solid ${colors.border}`,
          borderRadius: '16px',
          width: '100%',
          maxWidth: '480px',
          padding: '32px 24px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '28px',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 800,
              color: colors.text,
              textTransform: 'uppercase',
              letterSpacing: '-0.5px',
            }}
          >
            {group ? 'EDIT GROUP' : 'NEW GROUP'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: colors.textSecondary,
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

        {/* Group Name */}
        <div style={{ marginBottom: '24px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 700,
              color: colors.accent,
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Group Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter group name…"
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: colors.bgTertiary,
              border: `1px solid ${colors.border}`,
              color: colors.text,
              fontSize: '14px',
              fontFamily: 'Montserrat, sans-serif',
              boxSizing: 'border-box',
              borderRadius: '12px',
            }}
          />
        </div>

        {/* Members */}
        <div style={{ marginBottom: '24px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 700,
              color: colors.accent,
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Members ({selectedMemberIds.size})
          </label>

          {teamMembers.length === 0 ? (
            <p
              style={{
                margin: 0,
                fontSize: '12px',
                color: colors.textMuted,
                textAlign: 'center',
              }}
            >
              No team members available
            </p>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '300px',
                overflowY: 'auto',
              }}
            >
              {teamMembers.map((member) => (
                <label
                  key={member.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px',
                    backgroundColor: colors.bgTertiary,
                    border: `1px solid ${colors.bgHover}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = colors.bgHover
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = colors.bgTertiary
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedMemberIds.has(member.id)}
                    onChange={() => toggleMember(member.id)}
                    style={{
                      cursor: 'pointer',
                      width: '16px',
                      height: '16px',
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '13px',
                        fontWeight: 700,
                        color: colors.text,
                      }}
                    >
                      {member.full_name || member.email}
                    </p>
                    {member.full_name && (
                      <p
                        style={{
                          margin: '2px 0 0 0',
                          fontSize: '11px',
                          color: colors.textMuted,
                        }}
                      >
                        {member.email}
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#2a1515',
              border: '1px solid #8b3a3a',
              borderRadius: 12,
              color: '#ff6b6b',
              fontSize: '13px',
              marginBottom: '20px',
              borderRadius: '8px',
            }}
          >
            {error}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '14px',
              backgroundColor: 'transparent',
              border: `1px solid ${colors.border}`,
              color: colors.textSecondary,
              fontSize: '13px',
              fontWeight: 700,
              borderRadius: 10000,
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontFamily: 'Montserrat, sans-serif',
              minHeight: '48px',
            }}
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 2,
              padding: '14px',
              backgroundColor: colors.accent,
              color: theme === 'dark' ? '#080808' : '#000000',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              borderRadius: 10000,
              textTransform: 'uppercase',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'Montserrat, sans-serif',
              opacity: saving ? 0.7 : 1,
              minHeight: '48px',
            }}
          >
            {saving ? 'SAVING…' : 'SAVE'}
          </button>
        </div>
      </div>
    </div>
  )
}
