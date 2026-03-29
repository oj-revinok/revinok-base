'use server'

import { createClient } from '@/lib/supabase/server'
import { getTasksForProject, getNotionProjectsPage, NotionTask } from '@/lib/notion'

export async function fetchNotionTasksForProject(projectId: string): Promise<NotionTask[]> {
  const supabase = createClient()

  // Get the project's notion_project_id and the workspace notion API key
  const [{ data: project }, { data: profile }] = await Promise.all([
    supabase
      .from('projects')
      .select('notion_project_id')
      .eq('id', projectId)
      .single(),
    supabase
      .from('profiles')
      .select('notion_api_key')
      .eq('role', 'admin')
      .limit(1)
      .single(),
  ])

  if (!project?.notion_project_id) return []

  return getTasksForProject(
    project.notion_project_id,
    profile?.notion_api_key || undefined
  )
}

export async function fetchNotionProjects(): Promise<{ id: string; name: string }[]> {
  const supabase = createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('notion_api_key')
    .eq('role', 'admin')
    .limit(1)
    .single()

  return getNotionProjectsPage(profile?.notion_api_key || undefined)
}
