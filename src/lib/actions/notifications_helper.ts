// Non-circular helper: fans out notifications to all project members
// Imported by files.ts and notes.ts
import { createClient } from '@/lib/supabase/server'

export async function notifyProjectMembers(
  projectId: string,
  senderId: string,
  type: 'file_uploaded' | 'note_added',
  data: Record<string, any>
): Promise<void> {
  try {
    const supabase = createClient()
    const { data: members } = await supabase
      .from('project_members')
      .select('profile_id')
      .eq('project_id', projectId)
      .neq('profile_id', senderId)
    if (!members || members.length === 0) return
    await supabase.from('notifications').insert(
      members.map(m => ({
        recipient_id: m.profile_id,
        sender_id: senderId,
        type,
        project_id: projectId,
        data,
      }))
    )
  } catch {
    // Notifications are non-critical — never crash the main action
  }
}