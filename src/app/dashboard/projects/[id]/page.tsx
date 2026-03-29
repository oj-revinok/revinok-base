import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ProjectDetail from '@/components/ProjectDetail'
import { fetchNotionTasksForProject } from '@/lib/actions/notion'

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params
  const supabase = createClient()

  const [
    { data: project },
    { data: notes },
    { data: activity },
    { data: links },
    { data: projectFiles },
  ] = await Promise.all([
    supabase.from('projects').select('*, clients ( id, name, brand_name )').eq('id', id).single(),
    supabase.from('notes').select('*, profiles!notes_author_id_fkey ( full_name )').eq('project_id', id).order('created_at', { ascending: false }),
    supabase.from('activity_log').select('*, profiles!activity_log_actor_id_fkey ( full_name )').eq('project_id', id).order('created_at', { ascending: false }),
    supabase.from('project_links').select('*').eq('project_id', id).order('sort_order'),
    supabase.from('project_files').select('*').eq('project_id', id).order('created_at', { ascending: false }),
  ])

  if (!project) notFound()

  // Fetch Notion tasks if this project is linked to Notion
  const notionTasks = project.notion_project_id
    ? await fetchNotionTasksForProject(id)
    : []

  return (
    <ProjectDetail
      project={project}
      notes={notes ?? []}
      activity={activity ?? []}
      links={links ?? []}
      projectFiles={projectFiles ?? []}
      notionTasks={notionTasks}
    />
  )
}
