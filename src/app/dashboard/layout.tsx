import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const userInitials = profile
    ? (profile.full_name || user.email || 'U')
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U'

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#080808',
        fontFamily: 'Montserrat, sans-serif',
      }}
    >
      <aside
        style={{
          width: '220px',
          backgroundColor: '#0e0e0e',
          borderRight: '1px solid #1a1a1a',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 0',
          position: 'fixed',
          height: '100vh',
          overflowY: 'auto',
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
          {[
            { href: '/dashboard/projects', label: 'PROJECTS' },
            { href: '/dashboard/clients', label: 'CLIENTS' },
            { href: '/dashboard/team', label: 'TEAM', adminOnly: true },
            { href: '/dashboard/settings', label: 'SETTINGS' },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              style={{
                display: 'block',
                padding: '12px 16px',
                color: '#999999',
                textDecoration: 'none',
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderRadius: '6px',
                marginBottom: '4px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLAnchorElement).style.backgroundColor = '#1a1a1a'
                ;(e.target as HTMLAnchorElement).style.color = '#BDD630'
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLAnchorElement).style.backgroundColor = 'transparent'
                ;(e.target as HTMLAnchorElement).style.color = '#999999'
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div style={{ padding: '24px', borderTop: '1px solid #1a1a1a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#BDD630',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#080808',
                fontWeight: 700,
                fontSize: '13px',
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
                {profile?.full_name || user.email}
              </p>
              <p
                style={{
                  margin: '4px 0 0 0',
                  color: '#666666',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  fontWeight: 500,
                }}
              >
                {profile?.role || 'USER'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, marginLeft: '220px' }}>{children}</main>
    </div>
  )
}
