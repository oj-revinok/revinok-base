'use server'

import { createClient } from '@/lib/supabase/server'
import { getTasksForProject, getNotionProjectsPage, getAllTasks, getNotionTeamPersons, NotionTask, getNotionClient } from '@/lib/notion'

// Enrich tasks with assignee names resolved from the Team DB
async function enrichTasksWithNames(tasks: NotionTask[], notionKey?: string): Promise<NotionTask[]> {
  if (tasks.length === 0) return tasks
  // Only fetch team persons if any task has assignedTo IDs
  const hasAssignees = tasks.some(t => t.assignedTo.length > 0)
  if (!hasAssignees) return tasks
  try {
    const teamPersons = await getNotionTeamPersons(notionKey)
    const nameMap = new Map(teamPersons.map(p => [p.id, p.name]))
    return tasks.map(t => ({
      ...t,
      assignedNames: t.assignedTo.map(id => nameMap.get(id) || id).filter(Boolean),
    }))
  } catch {
    return tasks
  }
}

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

  const tasks = await getTasksForProject(project.notion_project_id, notionKey)
  return enrichTasksWithNames(tasks, notionKey)
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

  let tasks: NotionTask[]
  if (isAdminOrPM) {
    tasks = await getAllTasks(notionKey, null)
  } else {
    const notionPersonId = profile?.notion_person_id || null
    tasks = await getAllTasks(notionKey, notionPersonId)
  }
  return enrichTasksWithNames(tasks, notionKey)
}

// Fetch Notion-native comments for a task
export async function getTaskNotionComments(taskId: string): Promise<{ author: string; text: string; date: string }[]> {
  const notionKey = await getAdminNotionKey()
  const notion = getNotionClient(notionKey)
  if (!notion) return []

  try {
    const response = await (notion as any).comments.list({ block_id: taskId })
    return (response.results as any[])
      .map((c: any) => {
        const richText = c.rich_text ?? []
        const text = richText.map((t: any) => t.plain_text).join('')
        const author = c.created_by?.name || 'Notion User'
        const date = c.created_time || ''
        return { author, text, date }
      })
      .filter((c: { author: string; text: string; date: string }) => c.text.trim())
  } catch {
    return []
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
