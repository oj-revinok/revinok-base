import { createClient } from '@/lib/supabase/server'
import { fetchAllNotionTasks } from '@/lib/actions/notion'
import { getAppSetting } from '@/lib/actions/settings'
import TasksView from '@/components/TasksView'

export const revalidate = 60

export default async function TasksPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, notion_person_id')
    .eq('id', user?.id ?? '')
    .single()

  const role = profile?.role ?? 'viewer'
  const adminOrPM = role === 'admin' || role === 'project_manager'
  const hasNotionPersonId = !!profile?.notion_person_id

  // Read sync interval from app_settings (defaults to 1 hour)
  const syncIntervalHours = parseInt(await getAppSetting('notion_sync_interval_hours').catch(() => '1') ?? '1', 10)
  const revalidateSeconds = syncIntervalHours * 3600

  // Fetch tasks — non-blocking on error
  const tasks = await fetchAllNotionTasks().catch(() => [])

  return (
    <div style={{ padding: '20px 16px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: 'clamp(24px, 6vw, 36px)', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '-1px' }}>
          TASKS
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {adminOrPM ? 'All tasks across all projects' : hasNotionPersonId ? 'Your assigned tasks' : 'Tasks — link your Notion profile in Settings to filter'}
        </p>
      </div>

      {tasks.length === 0 && !adminOrPM && !hasNotionPersonId ? (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px dashed var(--border)', padding: '40px', textAlign: 'center' }}>
          <p style={{ fontSize: '24px', margin: '0 0 12px 0' }}>☰</p>
          <p style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '14px', margin: '0 0 8px 0' }}>Your tasks will appear here</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 20px 0' }}>
            Link your Notion profile ID in Settings so we can pull your assigned tasks.
          </p>
          <a href="/dashboard/settings" style={{
            display: 'inline-block', padding: '10px 20px', backgroundColor: 'var(--brand)', color: 'var(--bg)',
            textDecoration: 'none', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderRadius: 10000,
          }}>
            Go to Settings →
          </a>
        </div>
      ) : (
        <TasksView
          tasks={tasks}
          isAdminOrPM={adminOrPM}
          hasNotionPersonId={hasNotionPersonId}
        />
      )}
    </div>
  )
}
