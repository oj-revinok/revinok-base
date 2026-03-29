'use server'

import { createClient } from '@/lib/supabase/server'
import { getTasksForProject, getNotionProjectsPage, getAllTasks, NotionTask, getNotionClient } from '@/lib/notion'

async function getAdminNotionKey(): Promise<string | undefined> {
  const supabase = createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('notion_api_key')
    .eq('role', 'admin')
    .limit(1)
    .single()
  return profile?.notion_api_key || undefined
}

export async function fetchNotionTasksForProject(projectId: string): Promise<NotionTask[]> {
  const supabase = createClient()

  const [{ data: project }, notionKey] = await Promise.all([
    supabase
      .from('projects')
      .select('notion_project_id')
      .eq('id', projectId)
      .single(),
    getAdminNotionKey(),
  ])

  if (!project?.notion_project_id) return []

  return getTasksForProject(project.notion_project_id, notionKey)
}

export async function fetchNotionProjects(): Promise<{ id: string; name: string }[]> {
  const notionKey = await getAdminNotionKey()
  return getNotionProjectsPage(notionKey)
}

export async function fetchAllNotionTasks(): Promise<NotionTask[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, notion_person_id')
    .eq('id', user.id)
    .single()

  const notionKey = await getAdminNotionKey()

  // Admin/PM see all tasks; designer/developer see their own (if notion_person_id set)
  const isAdminOrPM = profile?.role === 'admin' || profile?.role === 'project_manager'

  if (isAdminOrPM) {
    return getAllTasks(notionKey, null)
  } else {
    // For individual contributors, filter by their notion_person_id if set
    const notionPersonId = profile?.notion_person_id || null
    return getAllTasks(notionKey, notionPersonId)
  }
}

// Fetch the page body (description) for a single Notion task
export async function getTaskDescription(taskId: string): Promise<string> {
  const notionKey = await getAdminNotionKey()
  const notion = getNotionClient(notionKey)
  if (!notion) return ''

  try {
    const response = await (notion as any).blocks.children.list({ block_id: taskId })
    const text = (response.results as any[])
      .filter((b: any) => b.type === 'paragraph' || b.type === 'bulleted_list_item' || b.type === 'numbered_list_item' || b.type === 'heading_1' || b.type === 'heading_2' || b.type === 'heading_3')
      .map((b: any) => {
        const richText = b[b.type]?.rich_text ?? []
        const line = richText.map((t: any) => t.plain_text).join('')
        if (b.type === 'bulleted_list_item') return `• ${line}`
        if (b.type === 'numbered_list_item') return `  ${line}`
        return line
      })
      .filter((t: string) => t.trim())
      .join('\n')
    return text
  } catch {
    return ''
  }
}
