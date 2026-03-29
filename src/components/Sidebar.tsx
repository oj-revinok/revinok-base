'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface SidebarProps {
  userInitials: string
  fullName: string | null
  email: string
  role: string
  unreadNotifications?: number
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  project_manager: 'Project Manager',
  designer: 'Designer',
  developer: 'Developer',
  designer_dev: 'Designer / Dev',
  viewer: 'Viewer',
  client: 'Client',
}

// Roles that can't see Clients or Team tabs
const RESTRICTED_ROLES = new Set(['designer', 'developer', 'designer_dev', 'viewer', 'client'])

interface NavItem {
  href: string
  label: string
  restricted: boolean
  isBell?: boolean
}

const ALL_NAV_ITEMS: NavItem[] = [
  { href: '/dashboard/projects',      label: 'PROJECTS',      restricted: false },
  { href: '/dashboard/tasks',         label: 'TASKS',         restricted: false },
  { href: '/dashboard/clients',       label: 'CLIENTS',       restricted: true  },
  { href: '/dashboard/team',          label: 'TEAM',          restricted: true  },
  { href: '/dashboard/settings',      label: 'SETTINGS',      restricted: false },
  { href: '/dashboard/notifications', label: 'NOTIFICATIONS', restricted: false, isBell: true },
]

export default function Sidebar({ userInitials, fullName, email, role, unreadNotifications = 0 }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const isRestricted = RESTRICTED_ROLES.has(role)
  const navItems = ALL_NAV_ITEMS.filter(item => !item.restricted || !isRestricted)

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="desktop-sidebar">
      <div style={{ padding: '0 24px', marginBottom: '48px' }}>
        <img
          src="https://cdn.prod.website-files.com/6862752441a47ff6d8e0dab5/69c145e944d6cf8a1de59438_Logo%20(1).png"
          alt="Revinok"
          style={{ height: '40px', width: 'auto' }}
        />
      </div>

      <nav style={{ flex: 1, padding: '0 12px' }}>
        {navItems.map((item) => {
          const isActive = pathname?.startsWith(item.href)
          const showBadge = item.isBell && unreadNotifications > 0
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                color: isActive ? '#BDD630' : '#999999',
                backgroundColor: isActive ? '#1a1a1a' : 'transparent',
                textDecoration: 'none',
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.5px',
                marginBottom: '4px',
                transition: 'color 0.15s, background-color 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = '#1a1a1a'
                  e.currentTarget.style.color = '#BDD630'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = '#999999'
                }
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {item.isBell && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
                  </svg>
                )}
                {item.label}
              </span>
              {showBadge && (
                <span style={{
                  backgroundColor: '#BDD630', color: '#080808',
                  fontSize: '9px', fontWeight: 800,
                  borderRadius: '10px', padding: '2px 6px', minWidth: '18px', textAlign: 'center',
                }}>
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User info + Sign Out */}
      <div style={{ padding: '16px 24px', borderTop: '1px solid #1a1a1a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <div
            className="avatar"
            style={{
              width: '38px', height: '38px', backgroundColor: '#BDD630',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#080808', fontWeight: 700, fontSize: '13px', flexShrink: 0,
            }}
          >
            {userInitials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, color: '#ffffff', fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {fullName || email}
            </p>
            <p style={{ margin: '3px 0 0 0', color: '#666666', fontSize: '10px', textTransform: 'uppercase' as const, fontWeight: 500 }}>
              {ROLE_LABELS[role] || role}
            </p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          style={{
            width: '100%', padding: '9px 12px',
            backgroundColor: 'transparent',
            border: '1px solid #222222',
            color: '#555555', cursor: 'pointer',
            fontSize: '10px', fontWeight: 700,
            textTransform: 'uppercase' as const, letterSpacing: '0.5px',
            fontFamily: 'Montserrat, sans-serif',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#BDD630'
            e.currentTarget.style.color = '#BDD630'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#222222'
            e.currentTarget.style.color = '#555555'
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          SIGN OUT
        </button>
      </div>
    </aside>
  )
}
