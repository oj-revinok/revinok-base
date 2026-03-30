import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getConversations, getTeamMembersForMessaging } from '@/lib/actions/messages'
import MessagesView from '@/components/MessagesView'

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_initials, role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const [conversations, teamMembers] = await Promise.all([
    getConversations(),
    getTeamMembersForMessaging(),
  ])

  return (
    <MessagesView
      initialConversations={conversations}
      teamMembers={teamMembers}
      currentUserId={user.id}
      currentUserProfile={profile}
    />
  )
}
