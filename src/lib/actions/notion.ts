'use server'

import { createClient } from '@/lib/supabase/server'
import { getTasksForProject, getNotionProjectsPage, getAllTasks, NotionTask } from '@/lib/notion'

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
