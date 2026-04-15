import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/actions/activity'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import DashboardShell from '@/components/DashboardShell'

// Required: all pages use Supabase auth (cookies) — never cache this layout
export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Parallel fetch — profile + unread count in one round-trip
  const [{ data: profile }, { count: unreadCount }] = await Promise.all([
    supabase.from('profiles').select('full_name, email, role, initials, avatar_url').eq('id', user.id).single(),
    supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false),
  ])

  // Log activity in the background — do NOT await, never block render
  void logActivity('/dashboard')

  const role = profile?.role ?? 'viewer'
  const userInitials =
    profile?.initials ||
    (profile?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()) ||
    'U'
  const unread = unreadCount ?? 0

  return (
    <DashboardShell
      userId={user.id}
      userName={profile?.full_name ?? user.email ?? 'Unknown'}
    >
      <Sidebar
        userInitials={userInitials}
        fullName={profile?.full_name ?? null}
        email={user.email ?? ''}
        role={role}
        unreadNotifications={unread}
      />
      <MobileNav role={role} unreadNotifications={unread} />
      <main className="main-content">
        {children}
      </main>
    </DashboardShell>
  )
}
