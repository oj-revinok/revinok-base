import { createClient } from '@/lib/supabase/server'
import { fetchAllNotionTasks } from '@/lib/actions/notion'
import TasksView from '@/components/TasksView'

export const dynamic = 'force-dynamic'

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

  // Fetch tasks — track whether fetch succeeded or failed
  let tasks: Awaited<ReturnType<typeof fetchAllNotionTasks>> = []
  let notionFailed = false
  try {
    tasks = await fetchAllNotionTasks()
  } catch {
    notionFailed = true
  }

  // No Notion profile linked and not admin
  if (!adminOrPM && !hasNotionPersonId) {
    return (
      <div style={{ padding: '20px 16px 80px' }}>
        <h1 style={{ fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 28px 0', textTransform: 'uppercase', letterSpacing: '-1px' }}>
          TASKS
        </h1>
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
      </div>
    )
  }

  return (
    <div style={{ padding: '20px 16px 80px' }}>
      <h1 style={{ fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 28px 0', textTransform: 'uppercase', letterSpacing: '-1px' }}>
        TASKS
      </h1>
      {notionFailed ? (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px dashed var(--border)', padding: '40px', textAlign: 'center' }}>
          <p style={{ fontSize: '24px', margin: '0 0 12px 0' }}>⚠️</p>
          <p style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '14px', margin: '0 0 8px 0' }}>Could not load tasks</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 20px 0' }}>
            Notion is temporarily unreachable. Your data is safe — try refreshing in a moment.
          </p>
          <a href="/dashboard/tasks" style={{
            display: 'inline-block', padding: '10px 20px', backgroundColor: 'var(--brand)', color: 'var(--bg)',
            textDecoration: 'none', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderRadius: 10000,
          }}>
            Refresh →
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
