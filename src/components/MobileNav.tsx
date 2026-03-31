'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/context/ThemeContext'

interface MobileNavProps {
  role?: string
  unreadNotifications?: number
}

// Roles that can't see Clients or Team tabs
const RESTRICTED_ROLES = new Set(['designer', 'developer', 'designer_dev', 'viewer', 'client'])

const ALL_NAV_ITEMS = [
  {
    href: '/dashboard/projects',
    label: 'Projects',
    restricted: false,
    isBell: false,
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="8" height="8" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="12" y="2" width="8" height="8" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="2" y="12" width="8" height="8" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="12" y="12" width="8" height="8" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/tasks',
    label: 'Tasks',
    restricted: false,
    isBell: false,
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="18" height="18" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M6 8h10M6 11h7M6 14h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/clients',
    label: 'Clients',
    restricted: true,
    isBell: false,
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="10" width="18" height="10" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M5 10V7L11 3L17 7V10" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="9" y="14" width="4" height="6" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/team',
    label: 'Team',
    restricted: true,
    isBell: false,
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M1 20c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="16" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M16 13.5c2.5 0 5 1.5 5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/notes',
    label: 'Notes',
    restricted: false,
    isBell: false,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/messages',
    label: 'Messages',
    restricted: false,
    isBell: false,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/notifications',
    label: 'Notifications',
    restricted: false,
    isBell: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/settings',
    label: 'Settings',
    restricted: false,
    isBell: false,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
]

export default function MobileNav({ role, unreadNotifications = 0 }: MobileNavProps) {
  const { colors, theme } = useTheme()
  const pathname = usePathname()
  const isRestricted = RESTRICTED_ROLES.has(role || '')
  const navItems = ALL_NAV_ITEMS.filter(item => !item.restricted || !isRestricted)

  const currentItem = ALL_NAV_ITEMS.find(item => pathname?.startsWith(item.href))

  return (
    <>
      <div className="mobile-topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
        <img
          src="https://cdn.prod.website-files.com/6862752441a47ff6d8e0dab5/69c145e944d6cf8a1de59438_Logo%20(1).png"
          alt="Revinok"
          style={{ height: '36px', width: 'auto' }}
        />
        {currentItem && (
          <span style={{
            fontSize: '12px',
            fontWeight: 700,
            color: colors.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {currentItem.label}
          </span>
        )}
      </div>

      <nav className="mobile-bottomnav" aria-label="Main navigation">
        <div className="mobile-bottomnav-inner">
          {navItems.map((item) => {
            const isActive = pathname?.startsWith(item.href)
            const showBadge = item.isBell && unreadNotifications > 0
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={`mobile-nav-item${isActive ? ' active' : ''}`}
                style={{ color: isActive ? colors.accent : colors.textMuted, position: 'relative' }}
                aria-current={isActive ? 'page' : undefined}
              >
                <span style={{ position: 'relative', display: 'inline-block' }}>
                  {item.icon}
                  {showBadge && (
                    <span style={{
                      position: 'absolute', top: '-4px', right: '-6px',
                      backgroundColor: colors.accent, color: theme === 'dark' ? '#080808' : '#ffffff',
                      fontSize: '8px', fontWeight: 800,
                      borderRadius: '10px', padding: '1px 4px', minWidth: '14px', textAlign: 'center',
                    }}>
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                  )}
                </span>
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
