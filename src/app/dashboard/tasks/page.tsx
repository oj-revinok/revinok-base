import { createClient } from '@/lib/supabase/server'
import { fetchAllNotionTasks, getLastNotionSync } from '@/lib/actions/notion'
import TasksView from '@/components/TasksView'

export const dynamic = 'force-dynamic'

// Render "X minutes ago" / "2 hours ago" / "yesterday" etc.
function timeAgo(iso: string | null): string | null {
  if (!iso) return null
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return null
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

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

  // fetchAllNotionTasks now never throws — it falls back to the persistent
  // notion_tasks_cache if Notion is slow or down. So we always have something
  // to render.
  const tasks = await fetchAllNotionTasks()
  const sync = await getLastNotionSync()

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

  // "Stale" = last error is more recent than last successful sync, within
  // the last 30 minutes. We're showing cached data in that case.
  const lastSyncedMs = sync.lastSyncedAt ? new Date(sync.lastSyncedAt).getTime() : 0
  const lastErrorMs = sync.lastErrorAt ? new Date(sync.lastErrorAt).getTime() : 0
  const isStale = lastErrorMs > lastSyncedMs && lastErrorMs > Date.now() - 1000 * 60 * 30

  return (
    <div style={{ padding: '20px 16px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, margin: '0 0 28px 0' }}>
        <h1 style={{ fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 900, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '-1px' }}>
          TASKS
        </h1>
        {sync.lastSyncedAt && (
          <span
            title={isStale && sync.lastErrorMessage
              ? `Notion error: ${sync.lastErrorMessage}`
              : `Last synced ${new Date(sync.lastSyncedAt).toLocaleString()}`}
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              padding: '4px 10px',
              borderRadius: 10000,
              backgroundColor: isStale ? 'rgba(255, 165, 0, 0.12)' : 'var(--surface)',
              color: isStale ? 'orange' : 'var(--text-secondary)',
              border: `1px solid ${isStale ? 'rgba(255, 165, 0, 0.4)' : 'var(--border)'}`,
              whiteSpace: 'nowrap',
            }}
          >
            {isStale ? '⚠ Stale · ' : '✓ Synced '}{timeAgo(sync.lastSyncedAt)}
          </span>
        )}
      </div>
      <TasksView
        tasks={tasks}
        isAdminOrPM={adminOrPM}
        hasNotionPersonId={hasNotionPersonId}
      />
    </div>
  )
}
