import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import DashboardShell from '@/components/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { count: unreadCount }, { count: unreadMsgCount }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false),
    supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .is('deleted_at', null),
  ])

  const role = profile?.role ?? 'viewer'
  const unread = unreadCount ?? 0
  const unreadMessages = unreadMsgCount ?? 0

  const userInitials = profile
    ? (profile.full_name || user.email || 'U')
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U'

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
