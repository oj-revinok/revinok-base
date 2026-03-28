'use client'

import { useState, useTransition } from 'react'
import { createClientRecord } from '@/lib/actions/clients'

const inputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#111111',
  border: '1px solid #2a2a2a',
  color: '#ffffff',
  fontSize: '13px',
  padding: '12px',
  fontFamily: 'Montserrat, sans-serif',
  display: 'block',
  boxSizing: 'border-box',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '10px',
  fontWeight: 700,
  color: '#666666',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '6px',
}

export default function AddClientModal() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      try {
        await createClientRecord(formData)
        setSuccess(true)
        setTimeout(() => {
          setOpen(false)
          setSuccess(false)
          // Reload to show the new client
          window.location.reload()
        }, 800)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add client')
      }
    })
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
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
        + ADD CLIENT
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
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
        >
          <div
            style={{
              backgroundColor: '#0e0e0e',
              border: '1px solid #222222',
              padding: '28px 24px',
              width: '100%',
              maxWidth: '480px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
                Add Client
              </h2>
              <button
                onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', color: '#666666', fontSize: '22px', cursor: 'pointer', lineHeight: 1, padding: '4px 8px', minHeight: '44px', minWidth: '44px', fontFamily: 'Montserrat, sans-serif' }}
              >
                ×
              </button>
            </div>

            {success ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#4ade80', fontSize: '14px', fontWeight: 600 }}>
                ✓ Client added!
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Brand Name *</label>
                  <input
                    name="name"
                    required
                    placeholder="e.g. Paragon Capital"
                    style={inputStyle}
                    autoFocus
                  />
                </div>

                <div>
                  <label style={labelStyle}>Trading / Legal Name</label>
                  <input
                    name="brand_name"
                    placeholder="e.g. Paragon Capital Partners Ltd"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Email</label>
                  <input
                    name="email"
                    type="email"
                    placeholder="client@company.com"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Industry</label>
                  <input
                    name="industry"
                    placeholder="e.g. Finance, Tech, Retail"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Website</label>
                  <input
                    name="website"
                    type="url"
                    placeholder="https://example.com"
                    style={inputStyle}
                  />
                </div>

                {error && (
                  <p style={{ margin: 0, fontSize: '12px', color: '#ef4444' }}>{error}</p>
                )}

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      backgroundColor: 'transparent',
                      color: '#666666',
                      border: '1px solid #333333',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      fontFamily: 'Montserrat, sans-serif',
                      minHeight: '44px',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    style={{
                      flex: 2,
                      padding: '12px',
                      backgroundColor: isPending ? '#2a2a2a' : '#BDD630',
                      color: isPending ? '#555555' : '#080808',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      cursor: isPending ? 'not-allowed' : 'pointer',
                      fontFamily: 'Montserrat, sans-serif',
                      minHeight: '44px',
                      letterSpacing: '0.5px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isPending ? 'Adding…' : 'Add Client'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
