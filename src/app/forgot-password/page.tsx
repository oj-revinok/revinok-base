'use client'

import { useState } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { requestPasswordReset } from '@/lib/actions/authActions'

export default function ForgotPasswordPage() {
  const { colors } = useTheme()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await requestPasswordReset(email)
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
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

        {submitted ? (
          /* Success state */
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
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h2 style={{ margin: '0 0 12px', fontSize: '20px', fontWeight: 700, color: colors.text }}>
              Check your inbox
            </h2>
            <p style={{ margin: '0 0 32px', fontSize: '14px', color: colors.textSecondary, lineHeight: 1.6 }}>
              If an account exists for <strong style={{ color: colors.text }}>{email}</strong>, you'll receive a password reset link shortly.
            </p>
            <a
              href="/login"
              style={{
                display: 'inline-block',
                padding: '14px 32px',
                backgroundColor: colors.accent,
                color: colors.bg,
                textDecoration: 'none',
                borderRadius: 10000,
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.5px',
              }}
            >
              Back to Login
            </a>
          </div>
        ) : (
          /* Form state */
          <>
            <h2 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: 700, color: colors.text }}>
              Forgot your password?
            </h2>
            <p style={{ margin: '0 0 32px', fontSize: '14px', color: colors.textSecondary, lineHeight: 1.6 }}>
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '24px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: colors.accent,
                    marginBottom: '8px',
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.5px',
                  }}
                >
                  EMAIL ADDRESS
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    backgroundColor: colors.bgSecondary,
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                    fontSize: '14px',
                    fontFamily: 'Montserrat, sans-serif',
                    boxSizing: 'border-box' as const,
                    borderRadius: 12,
                  }}
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
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.5px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'Montserrat, sans-serif',
                  transition: 'all 0.2s ease',
                  opacity: loading ? 0.7 : 1,
                  minHeight: '52px',
                  borderRadius: 10000,
                }}
              >
                {loading ? 'SENDING...' : 'SEND RESET LINK'}
              </button>
            </form>

            <p
              style={{
                textAlign: 'center',
                color: colors.textSecondary,
                fontSize: '13px',
                marginTop: '24px',
                fontWeight: 500,
              }}
            >
              <a href="/login" style={{ color: colors.accent, textDecoration: 'none', fontWeight: 600 }}>
                ← Back to Login
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
