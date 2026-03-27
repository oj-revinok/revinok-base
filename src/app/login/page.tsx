'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      router.push('/dashboard')
    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#080808',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Montserrat, sans-serif',
      }}
    >
      <div style={{ width: '100%', maxWidth: '420px', padding: '40px' }}>
        <div style={{ marginBottom: '60px', textAlign: 'center' }}>
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 900,
              color: '#ffffff',
              margin: 0,
              letterSpacing: '-1px',
              textTransform: 'uppercase',
            }}
          >
            REVINOK
          </h1>
          <p style={{ color: '#999999', fontSize: '14px', margin: '8px 0 0 0', fontWeight: 500 }}>
            Project Management
          </p>
        </div>

        <form onSubmit={handleSignIn}>
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
              EMAIL ADDRESS
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: '#0e0e0e',
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

          <div style={{ marginBottom: '32px' }}>
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
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: '#0e0e0e',
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

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px 24px',
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
            {loading ? 'SIGNING IN...' : 'SIGN IN'}
          </button>
        </form>

        <p
          style={{
            textAlign: 'center',
            color: '#666666',
            fontSize: '13px',
            marginTop: '24px',
            fontWeight: 500,
          }}
        >
          Need an account?{' '}
          <a
            href="mailto:hello@revinok.com"
            style={{
              color: '#BDD630',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            CONTACT SUPPORT
          </a>
        </p>
      </div>
    </div>
  )
}
