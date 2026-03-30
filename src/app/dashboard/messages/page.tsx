import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getConversations, getTeamMembersForMessaging } from '@/lib/actions/messages'

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
    debugInfo = 'profile found: ' + JSON.stringify(profile)

    let conversations: any[] = []
    let teamMembers: any[] = []
    try {
      conversations = await getConversations()
      debugInfo += ' | convos: ' + conversations.length
    } catch (e: any) {
      debugInfo += ' | convos error: ' + e.message
    }
    try {
      teamMembers = await getTeamMembersForMessaging()
      debugInfo += ' | team: ' + teamMembers.length
    } catch (e: any) {
      debugInfo += ' | team error: ' + e.message
    }

    return (
      <div style={{ color: 'white', padding: '40px' }}>
        <h1>Messages Data Debug</h1>
        <p>Debug: {debugInfo}</p>
        <p>Conversations: {conversations.length}</p>
        <p>Team Members: {teamMembers.length}</p>
      </div>
    )
  } catch (e: any) {
    if (e?.digest?.startsWith?.('NEXT_REDIRECT')) throw e
    return <div style={{ color: 'white', padding: '40px' }}>Error: {e.message} | Debug: {debugInfo}</div>
  }
}
