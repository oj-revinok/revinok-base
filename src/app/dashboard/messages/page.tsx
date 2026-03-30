import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getConversations, getTeamMembersForMessaging } from '@/lib/actions/messages'
import MessagesView from '@/components/MessagesView'

export default async function MessagesPage() {
  let debugInfo = 'start'
  try {
    const supabase = await createClient()
    debugInfo = 'supabase created'
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
    debugInfo = 'user found: ' + user.id

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_initials, role')
      .eq('id', user.id)
      .single()

    if (!profile) redirect('/login')
    debugInfo = 'profile found'

    let conversations: any[] = []
    let teamMembers: any[] = []
    try {
      conversations = await getConversations()
      debugInfo += ' | convos ok'
    } catch (e: any) {
      debugInfo += ' | convos error: ' + e.message
    }
    try {
      teamMembers = await getTeamMembersForMessaging()
      debugInfo += ' | team ok'
    } catch (e: any) {
      debugInfo += ' | team error: ' + e.message
    }

    return (
      <MessagesView
        initialConversations={conversations}
        teamMembers={teamMembers}
        currentUserId={user.id}
        currentUserProfile={profile}
      />
    )
  } catch (e: any) {
    // Re-throw redirects
    if (e?.digest?.startsWith?.('NEXT_REDIRECT')) throw e
    return <div style={{ color: 'white', padding: '40px' }}>Error: {e.message} | Debug: {debugInfo}</div>
  }
}
