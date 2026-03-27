'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const [fullName, setFullName] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('User not found')
        setLoading(false)
        return
      }

      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id)

      if (error) {
        setError(error.message)
      } else {
        setSuccess('Profile updated successfully')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        setError(error.message)
      } else {
        setSuccess('Password changed successfully')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '40px' }}>
      <h1
        style={{
          fontSize: '32px',
          fontWeight: 900,
          color: '#ffffff',
          margin: '0 0 40px 0',
          textTransform: 'uppercase',
          letterSpacing: '-1px',
        }}
      >
        SETTINGS
      </h1>

      <div
        style={{
          maxWidth: '600px',
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '32px',
        }}
      >
        <div style={{ backgroundColor: '#0e0e0e', borderRadius: '8px', padding: '32px' }}>
          <h2
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#ffffff',
              margin: '0 0 24px 0',
              textTransform: 'uppercase',
            }}
          >
            PROFILE
          </h2>

          <form onSubmit={handleUpdateProfile}>
            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#BDD630',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                FULL NAME
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: '#080808',
                  border: '1px solid #1a1a1a',
                  color: '#ffffff',
                  fontSize: '14px',
                  borderRadius: '6px',
                  fontFamily: 'Montserrat, sans-serif',
                  boxSizing: 'border-box',
                }}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px 24px',
                backgroundColor: '#BDD630',
                color: '#080808',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'Montserrat, sans-serif',
                transition: 'all 0.2s ease',
                opacity: loading ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loading) (e.target as HTMLButtonElement).style.backgroundColor = '#d4e650'
              }}
              onMouseLeave={(e) => {
                if (!loading) (e.target as HTMLButtonElement).style.backgroundColor = '#BDD630'
              }}
            >
              {loading ? 'SAVING...' : 'SAVE CHANGES'}
            </button>
          </form>
        </div>

        <div style={{ backgroundColor: '#0e0e0e', borderRadius: '8px', padding: '32px' }}>
          <h2
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#ffffff',
              margin: '0 0 24px 0',
              textTransform: 'uppercase',
            }}
          >
            SECURITY
          </h2>

          <form onSubmit={handleChangePassword}>
            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#BDD630',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                NEW PASSWORD
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: '#080808',
                  border: '1px solid #1a1a1a',
                  color: '#ffffff',
                  fontSize: '14px',
                  borderRadius: '6px',
                  fontFamily: 'Montserrat, sans-serif',
                  boxSizing: 'border-box',
                }}
                disabled={loading}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#BDD630',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                CONFIRM PASSWORD
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: '#080808',
                  border: '1px solid #1a1a1a',
                  color: '#ffffff',
                  fontSize: '14px',
                  borderRadius: '6px',
                  fontFamily: 'Montserrat, sans-serif',
                  boxSizing: 'border-box',
                }}
                disabled={loading}
              />
            </div>

            {error && (
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#2a1515',
                  border: '1px solid #8b3a3a',
                  color: '#ff6b6b',
                  borderRadius: '6px',
                  fontSize: '13px',
                  marginBottom: '24px',
                }}
              >
                {error}
              </div>
            )}

            {success && (
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#152a15',
                  border: '1px solid #3a8b3a',
                  color: '#6bff6b',
                  borderRadius: '6px',
                  fontSize: '13px',
                  marginBottom: '24px',
                }}
              >
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px 24px',
                backgroundColor: '#BDD630',
                color: '#080808',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'Montserrat, sans-serif',
                transition: 'all 0.2s ease',
                opacity: loading ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loading) (e.target as HTMLButtonElement).style.backgroundColor = '#d4e650'
              }}
              onMouseLeave={(e) => {
                if (!loading) (e.target as HTMLButtonElement).style.backgroundColor = '#BDD630'
              }}
            >
              {loading ? 'UPDATING...' : 'UPDATE PASSWORD'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
