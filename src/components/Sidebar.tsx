'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/context/ThemeContext'
import ThemeToggle from '@/components/ThemeToggle'

interface SidebarProps {
  userInitials: string
  fullName: string | null
  email: string
  role: string
  unreadNotifications?: number
  unreadMessages?: number
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
  clientHidden?: boolean
  icon: React.ReactNode
}

// Lineicons outlined SVG icons
const Icons = {
  projects: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  ),
  tasks: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/>
      <line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/>
      <polyline points="3 6 4 7 6 5"/>
      <polyline points="3 12 4 13 6 11"/>
      <polyline points="3 18 4 19 6 17"/>
    </svg>
  ),
  clients: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
      <line x1="12" y1="12" x2="12" y2="12.01"/>
    </svg>
  ),
  team: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  notes: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  
  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  notifications: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  signout: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
}

const ALL_NAV_ITEMS: NavItem[] = [
  { href: '/dashboard/projects',      label: 'PROJECTS',      restricted: false, icon: Icons.projects },
  { href: '/dashboard/tasks',         label: 'TASKS',         restricted: false, icon: Icons.tasks },
  { href: '/dashboard/clients',       label: 'CLIENTS',       restricted: true,  icon: Icons.clients },
  { href: '/dashboard/team',          label: 'TEAM',          restricted: true,  icon: Icons.team },
  { href: '/dashboard/notes',         label: 'NOTES',         restricted: false, icon: Icons.notes },
  { href: '/dashboard/notifications', label: 'NOTIFICATIONS', restricted: false, icon: Icons.notifications },
  { href: '/dashboard/settings',      label: 'SETTINGS',      restricted: false, clientHidden: true, icon: Icons.settings },
]

export default function Sidebar({ userInitials, fullName, email, role, unreadNotifications = 0 }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { colors, theme } = useTheme()

  const isRestricted = RESTRICTED_ROLES.has(role)
  const isClient = role === 'client'
  const navItems = ALL_NAV_ITEMS.filter(item => {
    if (item.restricted && isRestricted) return false
    if (item.clientHidden && isClient) return false
    return true
  })

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="desktop-sidebar">
      <div style={{ padding: '0 24px', marginBottom: '48px' }}>
        <img
          src={theme === 'dark'
            ? 'https://cdn.prod.website-files.com/6862752441a47ff6d8e0dab5/69c145e944d6cf8a1de59438_Logo%20(1).png'
            : 'https://cdn.prod.website-files.com/6862752441a47ff6d8e0dab5/69ca4814d84779b1aa924829_output-onlinepngtools%20(2).png'
          }
          alt="Revinok"
          style={{ height: '40px', width: 'auto' }}
        />
      </div>

      <nav style={{ flex: 1, padding: '0 12px' }}>
        {navItems.map((item) => {
          const isActive = pathname?.startsWith(item.href)
          const isNotif = item.href === '/dashboard/notifications'
          const showBadge = isNotif && unreadNotifications > 0
          const badgeCount = unreadNotifications
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                justifyContent: 'space-between',
                padding: '12px 16px',
                color: isActive ? colors.accent : colors.textMuted,
                backgroundColor: isActive ? colors.bgSecondary : 'transparent',
                textDecoration: 'none',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.5px',
                marginBottom: '2px',
                transition: 'color 0.15s, background-color 0.15s',
                borderLeft: `2px solid ${isActive ? colors.accent : 'transparent'}`,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = colors.bgHover
                  e.currentTarget.style.color = colors.accent
                  e.currentTarget.style.borderLeftColor = colors.textMuted
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = colors.textMuted
                  e.currentTarget.style.borderLeftColor = 'transparent'
                }
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {item.icon}
                {item.label}
              </span>
              {showBadge && (
                <span style={{
                  backgroundColor: colors.accent, color: theme === 'dark' ? '#080808' : '#1a1a1a',
                  fontSize: '9px', fontWeight: 800,
                  borderRadius: '10px', padding: '2px 6px', minWidth: '18px', textAlign: 'center',
                }}>
                  {badgeCount > 9 ? '9+' : badgeCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User info + Theme Toggle + Sign Out */}
      <div style={{ padding: '16px 24px', borderTop: `1px solid ${colors.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <div
            className="avatar"
            style={{
              width: '38px', height: '38px', backgroundColor: colors.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: theme === 'dark' ? '#080808' : '#1a1a1a', fontWeight: 700, fontSize: '13px', flexShrink: 0,
            }}
          >
            {userInitials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, color: colors.text, fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {fullName || email}
            </p>
            <p style={{ margin: '3px 0 0 0', color: colors.textMuted, fontSize: '10px', textTransform: 'uppercase' as const, fontWeight: 500 }}>
              {ROLE_LABELS[role] || role}
            </p>
          </div>
          <ThemeToggle />
        </div>

        <button
          onClick={handleSignOut}
          style={{
            width: '100%', padding: '9px 12px',
            backgroundColor: 'transparent',
            border: `1px solid ${colors.border}`,
            borderRadius: 10000,
            color: colors.textMuted, cursor: 'pointer',
            fontSize: '10px', fontWeight: 700,
            textTransform: 'uppercase' as const, letterSpacing: '0.5px',
            fontFamily: 'Montserrat, sans-serif',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = colors.accent
            e.currentTarget.style.color = colors.accent
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = colors.border
            e.currentTarget.style.color = colors.textMuted
          }}
        >
          {Icons.signout}
          SIGN OUT
        </button>
      </div>
    
      {/* Version badge */}
      <div style={{
        padding: '8px 16px',
        borderTop: `1px solid ${colors.bgSecondary}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: '4px',
      }}>
        <span style={{ fontSize: '9px', color: colors.textMuted, opacity: 0.5, fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.3px' }}>
          Revinok Base &copy; Build 5.5.1
        </span>
      </div>
    </aside>
  )
}
