'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { addCommentToNotionTask } from '@/lib/notion'

export interface TaskComment {
  id: string
  task_notion_id: string
  author_name: string
  content: string
  created_at: string
}

export async function getTaskComments(taskNotionId: string): Promise<TaskComment[]> {
  const supabase = createClient()
  // Join with profiles to get the current display name (dynamic — reflects profile name changes)
  const { data } = await supabase
    .from('task_comments')
    .select('id, task_notion_id, content, created_at, author_id, profiles(full_name, email)')
    .eq('task_notion_id', taskNotionId)
    .order('created_at', { ascending: true })

  if (!data) return []

  return data.map((row: any) => ({
    id: row.id,
    task_notion_id: row.task_notion_id,
    author_name: row.profiles?.full_name || row.profiles?.email || 'Unknown',
    content: row.content,
    created_at: row.created_at,
  }))
}

export async function addTaskComment(
  taskNotionId: string,
  content: string
): Promise<TaskComment> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  const authorName = profile?.full_name || profile?.email || 'Unknown'

  const { data, error } = await supabase
    .from('task_comments')
    .insert({
      task_notion_id: taskNotionId,
      author_id: user.id,
      author_name: authorName,
      content: content.trim(),
    })
    .select('id, task_notion_id, author_name, content, created_at')
    .single()

  if (error) throw new Error(error.message)

  // Push to Notion as "AuthorName: comment" (non-blocking — don't fail if Notion is down)
  try {
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('notion_api_key')
      .eq('role', 'admin')
      .limit(1)
      .single()

    await addCommentToNotionTask(
      taskNotionId,
      `${authorName}: ${content.trim()}`,
      adminProfile?.notion_api_key || undefined
    )
  } catch {
    // Notion push failure should not break the comment save
  }

  return data as TaskComment
}
