'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

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

const cardStyle: React.CSSProperties = {
  backgroundColor: '#0e0e0e',
  border: '1px solid #1a1a1a',
  padding: '28px',
}

export default function SettingsPage() {
  const supabase = createClient()

  const [userRole, setUserRole] = useState<string>('')
  const [fullName, setFullName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [notionKey, setNotionKey] = useState('')
  const [notionPersonId, setNotionPersonId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('full_name, role, notion_api_key, notion_person_id').eq('id', user.id).single()
      if (profile) {
        setFullName(profile.full_name || '')
        setUserRole(profile.role || '')
        setNotionKey((profile as any).notion_api_key || '')
        setNotionPersonId((profile as any).notion_person_id || '')
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

  if (loadingProfile) {
    return <div style={{ padding: '40px 20px', color: '#666666', fontSize: '13px' }}>Loading...</div>
  }

  const isAdmin = userRole === 'admin'
  const isAdminOrPM = userRole === 'admin' || userRole === 'project_manager'
  const isIndividual = !isAdminOrPM

  async function handleSaveNotionPersonId(e: React.FormEvent) {
    e.preventDefault()
    clearMessages()
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Not logged in'); return }
      const { error } = await supabase.from('profiles').update({ notion_person_id: notionPersonId || null } as never).eq('id', user.id)
      if (error) setError(error.message)
      else setSuccess('Notion profile linked — your tasks will now appear in the Tasks page.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px 16px 60px', maxWidth: '640px' }}>
      <h1 style={{ fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 900, color: '#ffffff', margin: '0 0 32px 0', textTransform: 'uppercase', letterSpacing: '-1px' }}>
        SETTINGS
      </h1>

      {/* Global messages */}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#2a1515', border: '1px solid #8b3a3a', color: '#ff6b6b', fontSize: '13px', marginBottom: '20px' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '12px 16px', backgroundColor: '#0d1f0d', border: '1px solid #1a3a1a', color: '#4ade80', fontSize: '13px', marginBottom: '20px' }}>
          {success}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Profile */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', margin: '0 0 20px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PROFILE</h2>
          <form onSubmit={handleUpdateProfile}>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>FULL NAME</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" style={inputStyle} disabled={loading} />
            </div>
            <SaveButton loading={loading} label="SAVE CHANGES" />
          </form>
        </div>

        {/* Security */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', margin: '0 0 20px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SECURITY</h2>
          <form onSubmit={handleChangePassword}>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>NEW PASSWORD</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" style={inputStyle} disabled={loading} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>CONFIRM PASSWORD</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" style={inputStyle} disabled={loading} />
            </div>
            <SaveButton loading={loading} label="UPDATE PASSWORD" />
          </form>
        </div>

        {/* Notion Profile Link removed — admins/PMs set notion_person_id via Team page */}

        {/* Integrations — admin only */}
        {isAdmin && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>INTEGRATIONS</h2>
              <span className="tag" style={{ padding: '2px 8px', backgroundColor: '#1a1a1a', color: '#BDD630', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>ADMIN ONLY</span>
            </div>

            <form onSubmit={handleSaveNotionKey}>
              <div style={{ marginBottom: '8px' }}>
                <label style={labelStyle}>NOTION API KEY</label>
                <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#555555', lineHeight: 1.5 }}>
                  Required to sync project notes and pages with Notion. Get your key at notion.so/my-integrations.
                </p>
                <input
                  type="password"
                  value={notionKey}
                  onChange={(e) => setNotionKey(e.target.value)}
                  placeholder="secret_xxxxxxxxxxxxxxxx"
                  style={inputStyle}
                  disabled={loading}
                  autoComplete="off"
                />
              </div>
              <p style={{ margin: '0 0 16px 0', fontSize: '11px', color: '#444444' }}>
                {notionKey ? '● Key saved' : '○ No key set'}
              </p>
              <SaveButton loading={loading} label="SAVE API KEY" />
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

function SaveButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{ padding: '12px 24px', backgroundColor: '#BDD630', color: '#080808', border: 'none', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Montserrat, sans-serif', opacity: loading ? 0.7 : 1 }}
    >
      {loading ? 'SAVING...' : label}
    </button>
  )
}
