import { createClient } from '@/lib/supabase/server'
import ProjectGrid from '@/components/ProjectGrid'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const supabase = createClient()

  try {
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
      const { data } = await supabase
        .from('projects')
        .select('id, name, description, status, start_date, due_date, figma_url, staging_url, live_url, notion_url, clients ( id, name ), project_members ( id ), notes ( id )')
        .order('created_at', { ascending: false })
      projects = data
    } else {
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
          .select('id, name, description, status, start_date, due_date, figma_url, staging_url, live_url, notion_url, clients ( id, name ), project_members ( id ), notes ( id )')
          .in('id', projectIds)
          .order('created_at', { ascending: false })
        projects = data
      }
    }

    return <ProjectGrid projects={projects ?? []} canCreate={canCreate} />

  } catch {
    return (
      <div style={{ padding: '20px 16px 80px' }}>
        <h1 style={{ fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 28px 0', textTransform: 'uppercase', letterSpacing: '-1px' }}>
          PROJECTS
        </h1>
        <div style={{ backgroundColor: 'var(--surface)', border: '1px dashed var(--border)', padding: '40px', textAlign: 'center' }}>
          <p style={{ fontSize: '24px', margin: '0 0 12px 0' }}>⚠️</p>
          <p style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '14px', margin: '0 0 8px 0' }}>Could not load projects</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 20px 0' }}>
            There was a connection issue. Your data is safe — try refreshing.
          </p>
          <a href="/dashboard/projects" style={{
            display: 'inline-block', padding: '10px 20px', backgroundColor: 'var(--brand)', color: 'var(--bg)',
            textDecoration: 'none', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderRadius: 10000,
          }}>
            Refresh →
          </a>
        </div>
      </div>
    )
  }
}
