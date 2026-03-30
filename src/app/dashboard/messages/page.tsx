import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getConversations, getTeamMembersForMessaging } from '@/lib/actions/messages'

export default async function MessagesPage() {
  let debugInfo = 'start'
  try {
    const supabase = await createClient()
    debugInfo = 'supabase created'
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      debugInfo += ' | no user'
      return <div style={{ color: 'white', padding: '40px' }}>Debug: {debugInfo}</div>
    }
    debugInfo = 'user found: ' + user.id

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', user.id)
      .single()

    debugInfo += ' | profile query done'
    if (profileError) {
      debugInfo += ' | profile error: ' + profileError.message
    }
    if (!profile) {
      debugInfo += ' | no profile'
      return <div style={{ color: 'white', padding: '40px' }}>Debug: {debugInfo}</div>
    }
    debugInfo += ' | profile: ' + JSON.stringify(profile)

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
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{debugInfo}</pre>
      </div>
    )
  } catch (e: any) {
    if (e?.digest?.startsWith?.('NEXT_REDIRECT')) throw e
    return <div style={{ color: 'white', padding: '40px' }}>Caught Error: {e.message} | Debug: {debugInfo}</div>
  }
}
