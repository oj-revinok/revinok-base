'use client'

import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

interface SidebarProps {
  userInitials: string
  fullName: string | null
  email: string
  role: string
}

const navItems = [
  { href: '/dashboard/projects', label: 'PROJECTS' },
  { href: '/dashboard/clients', label: 'CLIENTS' },
  { href: '/dashboard/team', label: 'TEAM' },
  { href: '/dashboard/settings', label: 'SETTINGS' },
]

export default function Sidebar({ userInitials, fullName, email, role }: SidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Prevent body scroll when mobile nav open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const sidebarContent = (
    <aside
      className={`sidebar-drawer${mobileOpen ? ' open' : ''}`}
      style={{
        width: '220px',
        backgroundColor: '#0e0e0e',
        borderRight: '1px solid #1a1a1a',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        position: 'fixed',
        height: '100vh',
        top: 0,
        left: 0,
        overflowY: 'auto',
        zIndex: 300,
      }}
    >
      <div style={{ padding: '0 24px', marginBottom: '48px' }}>
        <img
          src="https://cdn.prod.website-files.com/6862752441a47ff6d8e0dab5/69c145e944d6cf8a1de59438_Logo%20(1).png"
          alt="Revinok"
          style={{ height: '28px', width: 'auto' }}
        />
      </div>

      <nav style={{ flex: 1, padding: '0 12px' }}>
        {navItems.map((item) => {
          const isActive = pathname?.startsWith(item.href)
          return (
            <a
              key={item.href}
              href={item.href}
              style={{
                display: 'block',
                padding: '14px 16px',
                color: isActive ? '#BDD630' : '#999999',
                backgroundColor: isActive ? '#1a1a1a' : 'transparent',
                textDecoration: 'none',
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.5px',
                marginBottom: '4px',
                transition: 'all 0.2s ease',
                minHeight: '44px',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget).style.backgroundColor = '#1a1a1a'
                  ;(e.currentTarget).style.color = '#BDD630'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget).style.backgroundColor = 'transparent'
                  ;(e.currentTarget).style.color = '#999999'
                }
              }}
            >
              {item.label}
            </a>
          )
        })}
      </nav>

      <div style={{ padding: '24px', borderTop: '1px solid #1a1a1a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            className="avatar"
            style={{
              width: '40px',
              height: '40px',
              backgroundColor: '#BDD630',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#080808',
              fontWeight: 700,
              fontSize: '13px',
              flexShrink: 0,
            }}
          >
            {userInitials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {fullName || email}
            </p>
            <p
              style={{
                margin: '4px 0 0 0',
                color: '#666666',
                fontSize: '11px',
                textTransform: 'uppercase' as const,
                fontWeight: 500,
              }}
            >
              {role}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <button
          className="hamburger"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation"
        >
          <span style={{ transform: mobileOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
          <span style={{ opacity: mobileOpen ? 0 : 1 }} />
          <span style={{ transform: mobileOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
        </button>

        <img
          src="https://cdn.prod.website-files.com/6862752441a47ff6d8e0dab5/69c145e944d6cf8a1de59438_Logo%20(1).png"
          alt="Revinok"
          style={{ height: '22px', width: 'auto' }}
        />

        <div
          className="avatar"
          style={{
            width: '32px',
            height: '32px',
            backgroundColor: '#BDD630',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#080808',
            fontWeight: 700,
            fontSize: '11px',
          }}
        >
          {userInitials}
        </div>
      </div>

      {/* Overlay (mobile only) */}
      {mobileOpen && (
        <div
          className="sidebar-overlay open"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar (always mounted, transforms on mobile) */}
      {sidebarContent}
    </>
  )
}
