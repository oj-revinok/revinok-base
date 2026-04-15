'use server'
import { unstable_cache, revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getTasksForProject, getNotionProjectsPage, getAllTasks, getNotionTeamPersons, NotionTask, getNotionClient } from '@/lib/notion'

const getCachedAllTasks = unstable_cache(
  async (notionKey: string | undefined, personId: string | null) => getAllTasks(notionKey, personId),
  ['notion-all-tasks'],
  { revalidate: 900 }
)

const getCachedTeamPersons = unstable_cache(
  async (notionKey: string | undefined) => getNotionTeamPersons(notionKey),
  ['notion-team-persons'],
  { revalidate: 900 }
)

// Enrich tasks with assignee names — Team DB first, Supabase profiles as fallback
async function enrichTasksWithNames(tasks: NotionTask[], notionKey?: string): Promise<NotionTask[]> {
  if (tasks.length === 0) return tasks
  const hasAssignees = tasks.some(t => t.assignedTo.length > 0)
  if (!hasAssignees) return tasks
  try {
    const teamPersons = await getCachedTeamPersons(notionKey)
    const nameMap = new Map(teamPersons.map(p => [p.id, p.name]))

    // Fallback: resolve remaining IDs from Supabase profiles.notion_person_id
    const supabase = createClient()
    const { data: profiles } = await supabase
      .from('profiles')
      .select('notion_person_id, full_name')
      .not('notion_person_id', 'is', null)
    if (profiles) {
      profiles.forEach(p => {
        if (p.notion_person_id && p.full_name && !nameMap.has(p.notion_person_id)) {
          nameMap.set(p.notion_person_id, p.full_name)
        }
      })
    }

    return tasks.map(t => ({
      ...t,
      // Never fall back to raw UUIDs — unresolved IDs are dropped silently
      assignedNames: t.assignedTo
        .map(id => nameMap.get(id) ?? null)
        .filter((n): n is string => n !== null),
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
    supabase.from('projects').select('notion_project_id').eq('id', projectId).single(),
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
  const isAdminOrPM = profile?.role === 'admin' || profile?.role === 'project_manager'
  const tasks = isAdminOrPM
    ? await getCachedAllTasks(notionKey, null)
    : await getCachedAllTasks(notionKey, profile?.notion_person_id || null)
  return enrichTasksWithNames(tasks, notionKey)
}

export async function getTaskNotionComments(taskId: string): Promise<{ author: string; text: string; date: string }[]> {
  const notionKey = await getAdminNotionKey()
  const notion = getNotionClient(notionKey)
  if (!notion) return []
  try {
    const response = await (notion as any).comments.list({ block_id: taskId })
    return (response.results as any[])
      .map((c: any) => ({
        author: c.created_by?.name || 'Notion User',
        text: (c.rich_text ?? []).map((t: any) => t.plain_text).join(''),
        date: c.created_time || '',
      }))
      .filter(c => c.text.trim())
  } catch {
    return []
  }
}

export async function syncNotionTasksNow(): Promise<{ synced: true; timestamp: string }> {
  revalidateTag('notion-all-tasks')
  return { synced: true, timestamp: new Date().toISOString() }
}

export async function getTaskDescription(taskId: string): Promise<string> {
  const notionKey = await getAdminNotionKey()
  const notion = getNotionClient(notionKey)
  if (!notion) return ''
  try {
    const response = await (notion as any).blocks.children.list({ block_id: taskId })
    return (response.results as any[])
      .filter((b: any) => ['paragraph','bulleted_list_item','numbered_list_item','heading_1','heading_2','heading_3'].includes(b.type))
      .map((b: any) => {
        const line = (b[b.type]?.rich_text ?? []).map((t: any) => t.plain_text).join('')
        if (b.type === 'bulleted_list_item') return `• ${line}`
        if (b.type === 'numbered_list_item') return ` ${line}`
        return line
      })
      .filter((t: string) => t.trim())
      .join('\n')
  } catch {
    return ''
  }
}