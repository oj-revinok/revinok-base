'use client'

import { usePathname } from 'next/navigation'

const navItems = [
  {
    href: '/dashboard/projects',
    label: 'Projects',
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
    href: '/dashboard/clients',
    label: 'Clients',
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
    href: '/dashboard/settings',
    label: 'Settings',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="11" cy="11" r="3" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M11 2v3M11 17v3M2 11h3M17 11h3M4.515 4.515l2.121 2.121M15.364 15.364l2.121 2.121M4.515 17.485l2.121-2.121M15.364 6.636l2.121-2.121" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
      </svg>
    ),
  },
]

export default function MobileNav({ logoUrl }: { logoUrl?: string }) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile top bar — logo only */}
      <div className="mobile-topbar">
        <img
          src="https://cdn.prod.website-files.com/6862752441a47ff6d8e0dab5/69c145e944d6cf8a1de59438_Logo%20(1).png"
          alt="Revinok"
          style={{ height: '22px', width: 'auto' }}
        />
      </div>

      {/* Mobile bottom nav */}
      <nav className="mobile-bottomnav" aria-label="Main navigation">
        <div className="mobile-bottomnav-inner">
          {navItems.map((item) => {
            const isActive = pathname?.startsWith(item.href)
            return (
              <a
                key={item.href}
                href={item.href}
                className={`mobile-nav-item${isActive ? ' active' : ''}`}
                style={{ color: isActive ? '#BDD630' : '#555555' }}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.icon}
                {item.label}
              </a>
            )
          })}
        </div>
      </nav>
    </>
  )
}
