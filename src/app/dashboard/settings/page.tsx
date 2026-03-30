'use client'

import { useState, useEffect } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { createClient } from '@/lib/supabase/client'
import { getAppSetting, saveAppSetting } from '@/lib/actions/settings'

function getLabelStyle(colors: any): React.CSSProperties {
  return {
    display: 'block',
    fontSize: '11px',
    fontWeight: 600,
    color: colors.accent,
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  }
}

function getInputStyle(colors: any): React.CSSProperties {
  return {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: colors.bgSecondary,
    border: `1px solid ${colors.bgTertiary}`,
    borderRadius: 12,
    color: colors.text,
    fontSize: '14px',
    fontFamily: 'Montserrat, sans-serif',
    boxSizing: 'border-box',
  }
}

function getCardStyle(colors: any): React.CSSProperties {
  return {
    backgroundColor: colors.bgSecondary,
    border: `1px solid ${colors.bgTertiary}`,
    borderRadius: 16,
    padding: '28px',
  }
}

const SYNC_INTERVALS = [
  { value: '1',  label: 'Every 1 hour' },
  { value: '3',  label: 'Every 3 hours' },
  { value: '6',  label: 'Every 6 hours' },
  { value: '12', label: 'Every 12 hours' },
  { value: '24', label: 'Every 24 hours' },
]

export default function SettingsPage() {
  const { colors, theme } = useTheme()
  const supabase = createClient()

  const [userRole, setUserRole] = useState<string>('')
  const [fullName, setFullName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [notionKey, setNotionKey] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(true)

  // Sync interval state
  const [syncInterval, setSyncInterval] = useState('1')
  const [savingSyncInterval, setSavingSyncInterval] = useState(false)
  const [notionOpen, setNotionOpen] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role, notion_api_key')
        .eq('id', user.id)
        .single()

      if (profile) {
        setFullName(profile.full_name || '')
        setUserRole(profile.role || '')
        setNotionKey((profile as any).notion_api_key || '')
      }

      // Load sync interval if admin
      if (profile?.role === 'admin') {
        getAppSetting('notion_sync_interval_hours')
          .then((val) => { if (val) setSyncInterval(val) })
          .catch(() => {})
      }

      setLoadingProfile(false)
    }
    load()
  }, [])

  function clearMessages() { setError(''); setSuccess('') }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault()
    clearMessages()
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Not logged in'); return }
      const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id)
      if (error) setError(error.message)
      else setSuccess('Profile updated.')
    } finally {
      setLoading(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    clearMessages()
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) setError(error.message)
      else {
        setSuccess('Password updated.')
        setNewPassword('')
        setConfirmPassword('')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveNotionKey(e: React.FormEvent) {
    e.preventDefault()
    clearMessages()
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Not logged in'); return }
      const { error } = await supabase.from('profiles').update({ notion_api_key: notionKey || null } as never).eq('id', user.id)
      if (error) setError(error.message)
      else setSuccess('Notion API key saved.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveSyncInterval(e: React.FormEvent) {
    e.preventDefault()
    clearMessages()
    setSavingSyncInterval(true)
    try {
      await saveAppSetting('notion_sync_interval_hours', syncInterval)
      setSuccess(`Notion sync interval set to ${SYNC_INTERVALS.find(i => i.value === syncInterval)?.label?.toLowerCase()}.`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save sync interval')
    } finally {
      setSavingSyncInterval(false)
    }
  }

  if (loadingProfile) {
    return <div style={{ padding: '40px 20px', color: colors.textSecondary, fontSize: '13px' }}>Loading...</div>
  }

  const isAdmin = userRole === 'admin'

  return (
    <div style={{ padding: '20px 16px 60px', maxWidth: '640px' }}>
      <h1 style={{ fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 900, color: colors.text, margin: '0 0 32px 0', textTransform: 'uppercase', letterSpacing: '-1px' }}>
        SETTINGS
      </h1>

      {/* Global messages */}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#2a1515', border: '1px solid #8b3a3a', borderRadius: 12, color: '#ff6b6b', fontSize: '13px', marginBottom: '20px' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '12px 16px', backgroundColor: '#0d1f0d', border: '1px solid #1a3a1a', borderRadius: 12, color: '#4ade80', fontSize: '13px', marginBottom: '20px' }}>
          {success}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Profile */}
        <div style={getCardStyle(colors)}>
          <h2 style={{ fontSize: '13px', fontWeight: 700, color: colors.text, margin: '0 0 20px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PROFILE</h2>
          <form onSubmit={handleUpdateProfile}>
            <div style={{ marginBottom: '20px' }}>
              <label style={getLabelStyle(colors)}>FULL NAME</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" style={getInputStyle(colors)} disabled={loading} />
            </div>
            <SaveButton loading={loading} label="SAVE CHANGES" colors={colors} theme={theme} />
          </form>
        </div>

        {/* Security */}
        <div style={getCardStyle(colors)}>
          <h2 style={{ fontSize: '13px', fontWeight: 700, color: colors.text, margin: '0 0 20px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SECURITY</h2>
          <form onSubmit={handleChangePassword}>
            <div style={{ marginBottom: '16px' }}>
              <label style={getLabelStyle(colors)}>NEW PASSWORD</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" style={getInputStyle(colors)} disabled={loading} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={getLabelStyle(colors)}>CONFIRM PASSWORD</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" style={getInputStyle(colors)} disabled={loading} />
            </div>
            <SaveButton loading={loading} label="UPDATE PASSWORD" colors={colors} theme={theme} />
          </form>
        </div>

        {/* Integrations + Sync — admin only */}
        {isAdmin && (
          <>
            {/* Notion API Key */}
            <div style={getCardStyle(colors)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '13px', fontWeight: 700, color: colors.text, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>INTEGRATIONS</h2>
                <span className="tag" style={{ padding: '2px 8px', backgroundColor: colors.bgTertiary, color: colors.accent, fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>ADMIN ONLY</span>
              </div>

              <form onSubmit={handleSaveNotionKey}>
                <div style={{ marginBottom: '8px' }}>
                  <label style={getLabelStyle(colors)}>NOTION API KEY</label>
                  <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: colors.textSecondary, lineHeight: 1.5 }}>
                    Required to sync project notes and tasks from Notion. Get your key at notion.so/my-integrations.
                  </p>
                  <input
                    type="password"
                    value={notionKey}
                    onChange={(e) => setNotionKey(e.target.value)}
                    placeholder="secret_xxxxxxxxxxxxxxxx"
                    style={getInputStyle(colors)}
                    disabled={loading}
                    autoComplete="off"
                  />
                </div>
                <p style={{ margin: '0 0 16px 0', fontSize: '11px', color: colors.textMuted }}>
                  {notionKey ? '● Key saved' : '○ No key set'}
                </p>
                <SaveButton loading={loading} label="SAVE API KEY" colors={colors} theme={theme} />
              </form>
            </div>

            {/* Notion Sync Interval - Collapsible */}
            <div style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border || colors.bgTertiary}`, borderRadius: 16, overflow: 'hidden' }}>
              {/* Header - Always visible */}
              <button
                type="button"
                onClick={() => setNotionOpen(!notionOpen)}
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  backgroundColor: colors.bgSecondary,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.bgTertiary
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colors.bgSecondary
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ fontSize: '13px', fontWeight: 700, color: colors.text, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>NOTION SYNC</h2>
                  <span className="tag" style={{ padding: '2px 8px', backgroundColor: colors.bgTertiary, color: colors.accent, fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>ADMIN ONLY</span>
                </div>
                {/* Chevron Arrow */}
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={colors.text}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transform: notionOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s ease',
                    flexShrink: 0,
                  }}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {/* Content - Collapsible */}
              <div
                style={{
                  maxHeight: notionOpen ? '1000px' : '0',
                  overflow: 'hidden',
                  transition: 'max-height 0.3s ease',
                }}
              >
                <div style={{ padding: '0 20px 20px 20px', borderTop: `1px solid ${colors.border || colors.bgTertiary}` }}>
                  <p style={{ margin: '16px 0 20px 0', fontSize: '12px', color: colors.textSecondary, lineHeight: 1.5 }}>
                    How often the Tasks page pulls fresh data from Notion. Lower intervals mean more up-to-date tasks but slightly more API usage.
                  </p>

                  <form onSubmit={handleSaveSyncInterval}>
                    <div style={{ marginBottom: '20px' }}>
                      <label style={getLabelStyle(colors)}>SYNC INTERVAL</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                        {SYNC_INTERVALS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setSyncInterval(opt.value)}
                            style={{
                              padding: '12px 16px', borderRadius: 10000,
                              backgroundColor: syncInterval === opt.value ? colors.accent : colors.bgSecondary,
                              color: syncInterval === opt.value ? (theme === 'dark' ? '#080808' : '#ffffff') : colors.textSecondary,
                              border: syncInterval === opt.value ? `1px solid ${colors.accent}` : `1px solid ${colors.bgTertiary}`,
                              fontSize: '13px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.3px',
                              cursor: 'pointer',
                              fontFamily: 'Montserrat, sans-serif',
                              textAlign: 'left',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <SaveButton loading={savingSyncInterval} label="SAVE SYNC INTERVAL" colors={colors} theme={theme} />
                  </form>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function SaveButton({ loading, label, colors, theme }: { loading: boolean; label: string; colors: any; theme: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{ padding: '12px 24px', backgroundColor: colors.accent, color: theme === 'dark' ? '#080808' : '#ffffff', border: 'none', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Montserrat, sans-serif', opacity: loading ? 0.7 : 1, borderRadius: 10000 }}
    >
      {loading ? 'SAVING...' : label}
    </button>
  )
}
