import { createClient } from '@/lib/supabase/server'
import ProjectGrid from '@/components/ProjectGrid'

export default async function ProjectsPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single()

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, description, status, start_date, due_date, figma_url, staging_url, live_url, notion_url, clients ( id, name, brand_name )')
    .order('created_at', { ascending: false })

  const canCreate = profile?.role === 'admin' || profile?.role === 'project_manager'

  return <ProjectGrid projects={projects ?? []} canCreate={canCreate} />
}
