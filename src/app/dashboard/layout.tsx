import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

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
    <div style={{ backgroundColor: '#080808', fontFamily: 'Montserrat, sans-serif', minHeight: '100vh' }}>
      {/* Desktop sidebar */}
      <Sidebar
        userInitials={userInitials}
        fullName={profile?.full_name ?? null}
        email={user.email ?? ''}
        role={profile?.role ?? 'viewer'}
      />

      {/* Mobile: top logo bar + bottom nav */}
      <MobileNav />

      {/* Main content */}
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}
