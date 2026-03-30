'use client'

import { useEffect } from 'react'
import { useTheme } from '@/context/ThemeContext'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { colors } = useTheme()

  useEffect(() => {
    // Log to console for debugging but don't crash the page
    console.error('[Dashboard Error]', error)
  }, [error])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', padding: '40px 20px', textAlign: 'center',
      fontFamily: 'Montserrat, sans-serif',
    }}>
      <div style={{
        border: `1px solid ${colors.border}`, backgroundColor: colors.bg,
        padding: '48px 40px', maxWidth: '480px', width: '100%',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '44px', height: '44px', border: `1px solid ${colors.border}`, marginBottom: '20px',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h2 style={{
          color: colors.text, fontSize: '16px', fontWeight: 800,
          margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.5px',
        }}>
          Something went wrong
        </h2>
        <p style={{
          color: colors.textSecondary, fontSize: '13px', lineHeight: 1.6,
          margin: '0 0 28px 0',
        }}>
          A connection error occurred. This is usually temporary — try refreshing the page.
        </p>
        <button
          onClick={reset}
          style={{
            padding: '11px 28px', backgroundColor: colors.accent, color: colors.bg,
            border: 'none', fontSize: '11px', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.5px',
            cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', borderRadius: 10000,
          }}
        >
          Try again
        </button>
      </div>
    </div>
  )
}
