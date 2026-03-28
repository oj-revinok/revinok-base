'use client'

import { usePathname } from 'next/navigation'

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

  return (
    <aside className="desktop-sidebar">
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
            <p style={{ margin: 0, color: '#ffffff', fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {fullName || email}
            </p>
            <p style={{ margin: '4px 0 0 0', color: '#666666', fontSize: '11px', textTransform: 'uppercase' as const, fontWeight: 500 }}>
              {role}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
