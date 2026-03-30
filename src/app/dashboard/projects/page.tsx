import { createClient } from '@/lib/supabase/server'
import ProjectGrid from '@/components/ProjectGrid'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id ?? '')
    .single()

  const role = profile?.role ?? 'viewer'
  const isAdminOrPM = role === 'admin' || role === 'project_manager'
  const canCreate = isAdminOrPM

  let projects

  if (isAdminOrPM) {
    // Admin/PM see all projects
    const { data } = await supabase
      .from('projects')
      .select('id, name, description, status, start_date, due_date, figma_url, staging_url, live_url, notion_url, clients ( id, name, brand_name ), project_members ( id ), notes ( id )')
      .order('created_at', { ascending: false })
    projects = data
  } else {
    // Others see only their assigned projects
    const { data: memberships } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('profile_id', user?.id ?? '')

    const projectIds = (memberships || []).map((m: any) => m.project_id)

    if (projectIds.length === 0) {
      projects = []
    } else {
      const { data } = await supabase
        .from('projects')
        .select('id, name, description, status, start_date, due_date, figma_url, staging_url, live_url, notion_url, clients ( id, name, brand_name ), project_members ( id ), notes ( id )')
        .in('id', projectIds)
        .order('created_at', { ascending: false })
      projects = data
    }
  }

  return <ProjectGrid projects={projects ?? []} canCreate={canCreate} />
}
