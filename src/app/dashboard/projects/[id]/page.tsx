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

  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: project },
    { data: notes },
    { data: activity },
    { data: links },
    { data: projectFiles },
    { data: projectMembers },
    { data: profile },
  ] = await Promise.all([
    supabase.from('projects').select('*, clients ( id, name, brand_name )').eq('id', id).single(),
    supabase.from('notes').select('*, profiles!notes_author_id_fkey ( full_name )').eq('project_id', id).order('created_at', { ascending: false }),
    supabase.from('activity_log').select('*, profiles!activity_log_actor_id_fkey ( full_name )').eq('project_id', id).order('created_at', { ascending: false }).limit(50),
    supabase.from('project_links').select('*').eq('project_id', id).order('sort_order'),
    supabase.from('project_files').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    supabase.from('project_members').select('*, profiles ( id, full_name, email, role, initials, avatar_url )').eq('project_id', id),
    supabase.from('profiles').select('role, full_name').eq('id', user?.id ?? '').single(),
  ])

  if (!project) notFound()

  // Fetch Notion tasks if linked (non-blocking on error)
  const notionTasks = project.notion_project_id
    ? await fetchNotionTasksForProject(id).catch(() => [])
    : []

  return (
    <ProjectDetail
      project={project}
      notes={notes ?? []}
      activity={activity ?? []}
      links={links ?? []}
      projectFiles={projectFiles ?? []}
      notionTasks={notionTasks}
      projectMembers={projectMembers ?? []}
      userRole={profile?.role ?? 'viewer'}
      userFullName={(profile as any)?.full_name ?? ''}
    />
  )
}
