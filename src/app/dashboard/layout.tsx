import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/actions/activity'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import DashboardShell from '@/components/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Log portal access (rate-limited to once per 5 min)
  logActivity('/dashboard').catch(() => {})

  const [{ data: profile }, { count: unreadCount }] = await Promise.all([
    supabase.from('profiles').select('full_name, email, role, initials, avatar_url').eq('id', user.id).single(),
    supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false),
  ])


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
        unreadMessages={unreadMessages}
      />
      <MobileNav role={role} unreadNotifications={unread} />
      <main className="main-content">
        {children}
      </main>
    </DashboardShell>
  )
}
