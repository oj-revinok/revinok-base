'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/context/ThemeContext'

type Stage = 'loading' | 'form' | 'success' | 'error'

export default function ResetPasswordPage() {
  const { colors } = useTheme()
  const router = useRouter()
  const supabase = createClient()

  const [stage, setStage] = useState<Stage>('loading')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Supabase puts the recovery tokens in the URL hash after redirecting from the email link.
    // Calling getSession() triggers the client to read the hash and set the session automatically.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setStage('form')
      } else {
        // Also listen for the auth state change event — sometimes it fires slightly after mount
        const { data: listener } = supabase.auth.onAuthStateChange((event) => {
          if (event === 'PASSWORD_RECOVERY') {
            setStage('form')
          }
        })
        // Give it a moment then show error if still no session
        setTimeout(() => {
          setStage(prev => prev === 'loading' ? 'error' : prev)
        }, 3000)
        return () => listener.subscription.unsubscribe()
      }
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message || 'Failed to update password. Please try again.')
      setLoading(false)
      return
    }

    setStage('success')
    setTimeout(() => router.push('/dashboard'), 2500)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 16px',
    backgroundColor: colors.bgSecondary,
    border: `1px solid ${colors.border}`,
    color: colors.text,
    fontSize: '14px',
    fontFamily: 'Montserrat, sans-serif',
    boxSizing: 'border-box',
    borderRadius: 12,
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 600,
    color: colors.accent,
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: colors.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Montserrat, sans-serif',
        padding: '20px',
      }}
    >
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
        <div style={{ marginBottom: '56px', textAlign: 'center' }}>
          <img
            src="https://cdn.prod.website-files.com/6862752441a47ff6d8e0dab5/69c145e944d6cf8a1de59438_Logo%20(1).png"
            alt="Revinok"
            style={{ height: '48px', width: 'auto', display: 'block', margin: '0 auto' }}
          />
        </div>

        {stage === 'loading' && (
          <p style={{ textAlign: 'center', color: colors.textSecondary, fontSize: '14px' }}>
            Verifying your reset link…
          </p>
        )}

        {stage === 'error' && (
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ margin: '0 0 12px', fontSize: '20px', fontWeight: 700, color: colors.text }}>
              Link expired or invalid
            </h2>
            <p style={{ margin: '0 0 32px', fontSize: '14px', color: colors.textSecondary, lineHeight: 1.6 }}>
              This password reset link has expired or already been used. Please request a new one.
            </p>
            <a
              href="/forgot-password"
              style={{
                display: 'inline-block',
                padding: '14px 32px',
                backgroundColor: colors.accent,
                color: colors.bg,
                textDecoration: 'none',
                borderRadius: 10000,
                fontSize: '16px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0',
              }}
            >
              Request New Link
            </a>
          </div>
        )}

        {stage === 'success' && (
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: colors.bgSecondary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 style={{ margin: '0 0 12px', fontSize: '20px', fontWeight: 700, color: colors.text }}>
              Password updated!
            </h2>
            <p style={{ margin: 0, fontSize: '14px', color: colors.textSecondary, lineHeight: 1.6 }}>
              Redirecting you to the dashboard…
            </p>
          </div>
        )}

        {stage === 'form' && (
          <>
            <h2 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: 700, color: colors.text }}>
              Set a new password
            </h2>
            <p style={{ margin: '0 0 32px', fontSize: '14px', color: colors.textSecondary, lineHeight: 1.6 }}>
              Choose a strong password — at least 8 characters.
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>NEW PASSWORD</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{ ...inputStyle, paddingRight: '48px' }}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={{
                      position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', padding: '4px', cursor: 'pointer',
                      color: colors.textMuted, display: 'flex', alignItems: 'center',
                    }}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '28px' }}>
                <label style={labelStyle}>CONFIRM PASSWORD</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={inputStyle}
                  disabled={loading}
                />
              </div>

              {error && (
                <div
                  style={{
                    padding: '12px 16px',
                    backgroundColor: colors.bg === '#080808' ? '#2a1515' : '#fde8e8',
                    border: `1px solid ${colors.bg === '#080808' ? '#8b3a3a' : '#f5a8a8'}`,
                    color: colors.bg === '#080808' ? '#ff6b6b' : '#c41e3a',
                    fontSize: '13px',
                    marginBottom: '20px',
                    borderRadius: 12,
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  backgroundColor: colors.accent,
                  color: colors.bg,
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'Montserrat, sans-serif',
                  transition: 'all 0.2s ease',
                  opacity: loading ? 0.7 : 1,
                  minHeight: '52px',
                  borderRadius: 10000,
                }}
              >
                {loading ? 'UPDATING...' : 'UPDATE PASSWORD'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
