'use client'

import { useState, useMemo, useEffect, useTransition } from 'react'
import type { NotionTask } from '@/lib/notion'
import { getTaskComments, addTaskComment, type TaskComment } from '@/lib/actions/taskComments'
import { getTaskDescription, syncNotionTasksNow } from '@/lib/actions/notion'
import { useTheme } from '@/context/ThemeContext'
import { useRouter } from 'next/navigation'

type ViewMode = 'list' | 'kanban'

const STATUS_COLUMNS = [
  'Not started',
  'In progress',
  'Waiting for info',
  'Inhouse Review',
  'Feedback',
  'On Hold',
  'Complete',
]

const PRIORITY_ORDER = { 'High': 0, 'Medium': 1, 'Low': 2, '': 3 }

const STATUS_COLORS: Record<string, string> = {
  'Not started':      '#333333',
  'In progress':      '#4a9eff',
  'Waiting for info': '#ff9d4a',
  'Inhouse Review':   '#a78bfa',
  'Feedback':         '#38bdf8',
  'On Hold':          '#6b7280',
  'Complete':         '#4ade80',
}

const PRIORITY_COLORS: Record<string, string> = {
  'High':   '#ef4444',
  'Medium': '#22c55e',
  'Low':    '#eab308',
}

// Priority-tinted card backgrounds. Mix the priority hue with the surface
// colour so the card reads "this is a HIGH" at a glance without becoming a
// solid block of red. Gradient sits on top of the existing surface so light
// mode still looks reasonable.
function priorityCardTint(priority: string | null, fallbackBg: string): {
  background: string
  borderColor: string
} {
  if (!priority || !PRIORITY_COLORS[priority]) {
    return { background: fallbackBg, borderColor: '' }
  }
  // (r, g, b) for the rgba blends — keep them in sync with PRIORITY_COLORS.
  const rgb: Record<string, string> = {
    High:   '239, 68, 68',
    Medium: '34, 197, 94',
    Low:    '234, 179, 8',
  }
  const c = rgb[priority]
  return {
    background: `linear-gradient(135deg, rgba(${c}, 0.20) 0%, rgba(${c}, 0.06) 55%, ${fallbackBg} 100%)`,
    borderColor: `rgba(${c}, 0.45)`,
  }
}

// Lighter version for the list view — a left-edge accent rather than a full
// gradient, so densely packed rows stay scannable.
function priorityRowTint(priority: string | null): { background: string; borderLeftColor: string } {
  if (!priority || !PRIORITY_COLORS[priority]) {
    return { background: 'transparent', borderLeftColor: 'transparent' }
  }
  const rgb: Record<string, string> = {
    High:   '239, 68, 68',
    Medium: '34, 197, 94',
    Low:    '234, 179, 8',
  }
  const c = rgb[priority]
  return {
    background: `linear-gradient(90deg, rgba(${c}, 0.10) 0%, transparent 60%)`,
    borderLeftColor: `rgba(${c}, 0.65)`,
  }
}

const PRIMARY_STATUSES = ['Not started', 'In progress', 'Waiting for info', 'Inhouse Review', 'Feedback']
const SECONDARY_STATUSES = ['On Hold', 'Complete']

interface Props {
  tasks: NotionTask[]
  isAdminOrPM: boolean
  hasNotionPersonId: boolean
}

export default function TasksView({ tasks, isAdminOrPM, hasNotionPersonId }: Props) {
  const { colors, theme } = useTheme()
  const router = useRouter()
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  const [search, setSearch] = useState('')
  const [showSecondary, setShowSecondary] = useState(false)
  const [loadMoreCount, setLoadMoreCount] = useState<Record<string, number>>({})
  const [selectedTask, setSelectedTask] = useState<NotionTask | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState<string | null>(null)

  const INITIAL_VISIBLE = 10

  const filteredTasks = useMemo(() => {
    if (!search.trim()) return tasks
    const q = search.toLowerCase()
    return tasks.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.tags.some(tag => tag.toLowerCase().includes(q)) ||
      (t.priority || '').toLowerCase().includes(q)
    )
  }, [tasks, search])

  const { groupedByStatus, kanbanColumns } = useMemo(() => {
    const groups: Record<string, NotionTask[]> = {}
    const knownStatuses = new Set(STATUS_COLUMNS)
    STATUS_COLUMNS.forEach(s => {
      groups[s] = filteredTasks
        .filter(t => t.status === s)
        .sort((a, b) => (PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER] ?? 3) - (PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER] ?? 3))
    })
    // Catch any tasks whose status doesn't match a predefined column
    const extraStatuses = [...new Set(filteredTasks.map(t => t.status).filter(s => s && !knownStatuses.has(s)))]
    extraStatuses.forEach(s => {
      groups[s] = filteredTasks
        .filter(t => t.status === s)
        .sort((a, b) => (PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER] ?? 3) - (PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER] ?? 3))
    })
    const allColumns = [...STATUS_COLUMNS, ...extraStatuses]
    return { groupedByStatus: groups, kanbanColumns: allColumns }
  }, [filteredTasks])

  const primaryTasks = filteredTasks.filter(t => PRIMARY_STATUSES.includes(t.status))
  const secondaryTasks = filteredTasks.filter(t => SECONDARY_STATUSES.includes(t.status))

  function getVisible(status: string): number {
    return loadMoreCount[status] ?? INITIAL_VISIBLE
  }

  function loadMore(status: string) {
    setLoadMoreCount(prev => ({ ...prev, [status]: (prev[status] ?? INITIAL_VISIBLE) + 20 }))
  }

  if (tasks.length === 0 && !isAdminOrPM && !hasNotionPersonId) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', backgroundColor: colors.bg, border: `1px dashed ${colors.borderLight}`, borderRadius: 16 }}>
        <p style={{ color: colors.text, fontWeight: 700, fontSize: '14px', margin: '0 0 8px 0' }}>No tasks assigned to you yet</p>
        <p style={{ color: colors.textMuted, fontSize: '13px', margin: 0 }}>
          Ask your admin to link your Notion profile so your tasks appear here.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
        {/* Search */}
        <input
          type="text"
          placeholder="Search tasks…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: '200px', padding: '8px 14px', backgroundColor: colors.bg,
            border: `1px solid ${colors.bgSecondary}`, color: colors.text, fontSize: '13px',
            fontFamily: 'Montserrat, sans-serif', outline: 'none', borderRadius: 12,
          }}
        />
        {/* View toggle — available to all users */}
        <div style={{ display: 'flex', border: `1px solid ${colors.bgSecondary}` }}>
          {(['list', 'kanban'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: '8px 16px', backgroundColor: viewMode === mode ? colors.accent : 'transparent',
                border: 'none', color: viewMode === mode ? (theme === 'dark' ? '#080808' : '#ffffff') : colors.textMuted,
                fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', borderRadius: 10000,
              }}
            >
              {mode === 'list' ? '≡ List' : '⊞ Kanban'}
            </button>
          ))}
        </div>
        <span style={{ color: colors.textMuted, fontSize: '11px', whiteSpace: 'nowrap' }}>
          {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
        </span>
        {/* Sync button — top right */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {lastSynced && (
            <span style={{ fontSize: '10px', color: colors.textMuted, whiteSpace: 'nowrap' }}>
              Last synced: {new Date(lastSynced).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={async () => {
              setSyncing(true)
              try {
                const result = await syncNotionTasksNow()
                setLastSynced(result.timestamp)
                router.refresh()
              } finally {
                setSyncing(false)
              }
            }}
            disabled={syncing}
            style={{
              padding: '8px 16px', backgroundColor: 'transparent',
              border: `1px solid ${colors.bgSecondary}`, color: colors.textMuted,
              fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
              cursor: syncing ? 'not-allowed' : 'pointer', fontFamily: 'Montserrat, sans-serif',
              borderRadius: 10000, opacity: syncing ? 0.6 : 1, whiteSpace: 'nowrap',
            }}
          >
            {syncing ? '↻ Syncing…' : '↻ Sync'}
          </button>
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', backgroundColor: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 12 }}>
          <p style={{ color: colors.textMuted, fontSize: '13px', margin: 0 }}>No tasks found{search ? ` for "${search}"` : ''}.</p>
        </div>
      ) : viewMode === 'kanban' ? (
        <KanbanView groupedByStatus={groupedByStatus} kanbanColumns={kanbanColumns} onTaskClick={setSelectedTask} getVisible={getVisible} loadMore={loadMore} />
      ) : (
        <ListView
          primaryTasks={primaryTasks}
          secondaryTasks={secondaryTasks}
          showSecondary={showSecondary}
          setShowSecondary={setShowSecondary}
          groupedByStatus={groupedByStatus}
          getVisible={getVisible}
          loadMore={loadMore}
          onTaskClick={setSelectedTask}
        />
      )}

      {/* Task detail modal */}
      {selectedTask && (
        <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
    </div>
  )
}

/* ── Task Detail Modal ─────────────────────────────────────── */

function TaskDetailModal({ task, onClose }: { task: NotionTask; onClose: () => void }) {
  const { colors, theme } = useTheme()
  const [comments, setComments] = useState<TaskComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loadingComments, setLoadingComments] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [description, setDescription] = useState<string | null>(null)
  const [loadingDesc, setLoadingDesc] = useState(true)

  useEffect(() => {
    getTaskComments(task.id)
      .then(setComments)
      .catch(() => {})
      .finally(() => setLoadingComments(false))
  }, [task.id])

  useEffect(() => {
    getTaskDescription(task.id)
      .then(setDescription)
      .catch(() => setDescription(''))
      .finally(() => setLoadingDesc(false))
  }, [task.id])

  function handleAddComment(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim()) return
    startTransition(async () => {
      try {
        const comment = await addTaskComment(task.id, newComment.trim())
        setComments(prev => [...prev, comment])
        setNewComment('')
      } catch (err) {
        console.error(err)
      }
    })
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 2000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}
    >
      <div style={{
        backgroundColor: colors.bg, border: `1px solid ${colors.border}`,
        width: '100%', maxWidth: '580px', padding: '28px 24px', position: 'relative',
        maxHeight: '90vh', overflowY: 'auto', borderRadius: 16,
      }}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'none', border: 'none', color: colors.textMuted, fontSize: '18px',
            cursor: 'pointer', lineHeight: 1, padding: '4px 8px', minHeight: '32px', minWidth: '32px',
          }}
        >
          ✕
        </button>

        {/* Status + Priority row */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-block', padding: '4px 10px', fontSize: '10px', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.5px',
            backgroundColor: colors.bgTertiary, color: STATUS_COLORS[task.status] || '#666',
            border: `1px solid ${STATUS_COLORS[task.status] || colors.borderLight}22`, borderRadius: 10000,
          }}>
            {task.status}
          </span>
          {task.priority && (
            <span style={{
              display: 'inline-block', padding: '4px 10px', fontSize: '10px', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.5px',
              backgroundColor: colors.bgTertiary, color: PRIORITY_COLORS[task.priority] || colors.textMuted, borderRadius: 10000,
            }}>
              {task.priority}
            </span>
          )}
        </div>

        {/* Task name */}
        <h2 style={{
          fontSize: '18px', fontWeight: 800, color: colors.text,
          margin: '0 0 20px 0', lineHeight: 1.4, textTransform: 'uppercase', letterSpacing: '-0.3px',
          paddingRight: '32px',
        }}>
          {task.name}
        </h2>

        {/* Details grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          {task.dueDate && (
            <DetailRow label="Due Date">
              <span style={{ color: colors.text, fontSize: '13px' }}>
                {new Date(task.dueDate).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </DetailRow>
          )}
          {(task.assignedNames.length > 0 || task.assignedTo.length > 0) && (
            <DetailRow label="Assigned To">
              <span style={{ color: colors.accent, fontSize: '13px', fontWeight: 600 }}>
                {task.assignedNames.length > 0
                  ? task.assignedNames.join(', ')
                  : `${task.assignedTo.length} person${task.assignedTo.length > 1 ? 's' : ''}`}
              </span>
            </DetailRow>
          )}
          {task.tags.length > 0 && (
            <DetailRow label="Tags">
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {task.tags.map(tag => (
                  <span key={tag} style={{
                    fontSize: '9px', fontWeight: 700, color: colors.textSecondary,
                    backgroundColor: colors.bgTertiary, padding: '3px 8px',
                    textTransform: 'uppercase', letterSpacing: '0.5px',
                    border: `1px solid ${colors.bgHover}`, borderRadius: 10000,
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            </DetailRow>
          )}
        </div>

        {/* Description — always render while loading; show placeholder when empty */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '11px', fontWeight: 700, color: colors.accent, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Description
          </p>
          {loadingDesc ? (
            <p style={{ fontSize: '12px', color: colors.textMuted, margin: 0 }}>Loading…</p>
          ) : description ? (
            <p style={{ fontSize: '13px', color: colors.textSecondary, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
              {description}
            </p>
          ) : (
            <p style={{ fontSize: '12px', color: colors.textMuted, margin: 0, fontStyle: 'italic' }}>
              No description added in Notion.
            </p>
          )}
        </div>

        {/* Divider */}
        <div style={{ borderTop: `1px solid ${colors.border}`, marginBottom: '20px' }} />

        {/* Comments section — single source of truth (Supabase task_comments).
            Notion comments were removed from the UI in 5.4.0 because every
            comment was being displayed twice: addTaskComment writes through to
            Notion, then the next render fetched and showed the same content
            both as "Notion Comments" and "Comments". The Notion write-through
            is preserved so Notion users still see the conversation. */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ margin: '0 0 12px 0', fontSize: '11px', fontWeight: 700, color: colors.accent, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Comments {comments.length > 0 ? `(${comments.length})` : ''}
          </p>

          {loadingComments ? (
            <p style={{ fontSize: '12px', color: colors.textMuted }}>Loading…</p>
          ) : comments.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
              {comments.map(c => (
                <div key={c.id} style={{ padding: '10px 14px', backgroundColor: colors.bgSecondary, borderLeft: `3px solid ${colors.border}`, borderRadius: 12 }}>
                  <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: colors.textSecondary, lineHeight: 1.5 }}>
                    <span style={{ color: colors.accent, fontWeight: 700 }}>{c.author_name}:</span>{' '}
                    {c.content}
                  </p>
                  <p style={{ margin: 0, fontSize: '10px', color: colors.textMuted }}>
                    {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '14px' }}>No comments yet.</p>
          )}

          {/* Add comment form */}
          <form onSubmit={handleAddComment}>
            <textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Add a comment…"
              rows={2}
              style={{
                width: '100%', backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}`,
                color: colors.text, fontSize: '13px', padding: '10px 12px',
                fontFamily: 'Montserrat, sans-serif', resize: 'none',
                display: 'block', boxSizing: 'border-box', lineHeight: 1.5, borderRadius: 12,
              }}
            />
            <button
              type="submit"
              disabled={isPending || !newComment.trim()}
              style={{
                marginTop: '8px', padding: '8px 18px',
                backgroundColor: newComment.trim() ? colors.accent : colors.bgTertiary,
                color: newComment.trim() ? (theme === 'dark' ? '#080808' : '#ffffff') : colors.textMuted,
                border: 'none', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.5px', cursor: newComment.trim() ? 'pointer' : 'not-allowed',
                fontFamily: 'Montserrat, sans-serif', opacity: isPending ? 0.7 : 1, borderRadius: 10000, height: 40,
              }}
            >
              {isPending ? 'Posting…' : 'POST COMMENT'}
            </button>
          </form>
        </div>

        {/* No external Notion link — all interaction stays in the portal */}
      </div>
    </div>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors } = useTheme()
  return (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
      <span style={{
        fontSize: '10px', fontWeight: 700, color: colors.textMuted,
        textTransform: 'uppercase', letterSpacing: '0.5px',
        minWidth: '80px', paddingTop: '2px', flexShrink: 0,
      }}>
        {label}
      </span>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}

/* ── Kanban View ───────────────────────────────────────────── */

function KanbanView({
  groupedByStatus,
  kanbanColumns,
  onTaskClick,
  getVisible,
  loadMore,
}: {
  groupedByStatus: Record<string, NotionTask[]>
  kanbanColumns: string[]
  onTaskClick: (t: NotionTask) => void
  getVisible: (s: string) => number
  loadMore: (s: string) => void
}) {
  const { colors } = useTheme()
  // Only show columns that have tasks
  const visibleColumns = kanbanColumns.filter(s => (groupedByStatus[s] || []).length > 0)

  if (visibleColumns.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', backgroundColor: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 12 }}>
        <p style={{ color: colors.textMuted, fontSize: '13px', margin: 0 }}>No tasks to display.</p>
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto', paddingBottom: '20px' }}>
      <div style={{ display: 'flex', gap: '12px', minWidth: `${visibleColumns.length * 260}px` }}>
        {visibleColumns.map(status => {
          const tasks = groupedByStatus[status] || []
          const visible = getVisible(status)
          const shown = tasks.slice(0, visible)
          const remaining = tasks.length - visible
          return (
            <div key={status} style={{ flex: '0 0 260px', minWidth: '260px' }}>
              {/* Column header */}
              <div style={{
                padding: '8px 12px', marginBottom: '8px', backgroundColor: colors.bg,
                borderBottom: `2px solid ${STATUS_COLORS[status] || colors.borderLight}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: STATUS_COLORS[status] || colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {status}
                </span>
                <span style={{ fontSize: '11px', color: colors.textMuted }}>{tasks.length}</span>
              </div>
              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {shown.map(task => (
                  <KanbanCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
                ))}
                {remaining > 0 && (
                  <button
                    onClick={() => loadMore(status)}
                    style={{
                      width: '100%', padding: '10px', backgroundColor: 'transparent',
                      border: `1px dashed ${colors.bgHover}`, color: colors.textMuted, cursor: 'pointer',
                      fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.5px', fontFamily: 'Montserrat, sans-serif', borderRadius: 10000,
                    }}
                  >
                    + {remaining} more
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function KanbanCard({ task, onClick }: { task: NotionTask; onClick: () => void }) {
  const { colors } = useTheme()
  const tint = priorityCardTint(task.priority, colors.bg)
  const restingBorder = tint.borderColor || colors.border
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        padding: '12px', background: tint.background, border: `1px solid ${restingBorder}`,
        cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
        transition: 'border-color 0.15s, transform 0.15s', borderRadius: 16,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.borderLight }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = restingBorder }}
    >
      <p style={{ fontSize: '14px', color: colors.text, margin: '0 0 10px 0', lineHeight: 1.4 }}>{task.name}</p>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
        {task.priority && (
          <span style={{ fontSize: '11px', fontWeight: 700, color: PRIORITY_COLORS[task.priority] || colors.textMuted, textTransform: 'uppercase' }}>
            {task.priority}
          </span>
        )}
        {task.dueDate && (
          <span style={{ fontSize: '11px', color: colors.textMuted }}>
            {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
        {task.tags.slice(0, 1).map(tag => (
          <span key={tag} style={{ fontSize: '10px', fontWeight: 700, color: colors.textMuted, backgroundColor: colors.bgTertiary, padding: '3px 6px', textTransform: 'uppercase', borderRadius: 10000 }}>
            {tag}
          </span>
        ))}
        {task.assignedNames.length > 0 && (
          <span style={{ fontSize: '10px', color: colors.accent, fontWeight: 600 }}>
            {task.assignedNames.join(', ')}
          </span>
        )}
      </div>
    </button>
  )
}

/* ── List View ─────────────────────────────────────────────── */

function ListView({
  primaryTasks, secondaryTasks, showSecondary, setShowSecondary,
  groupedByStatus, getVisible, loadMore, onTaskClick,
}: {
  primaryTasks: NotionTask[]
  secondaryTasks: NotionTask[]
  showSecondary: boolean
  setShowSecondary: (v: boolean) => void
  groupedByStatus: Record<string, NotionTask[]>
  getVisible: (s: string) => number
  loadMore: (s: string) => void
  onTaskClick: (t: NotionTask) => void
}) {
  const { colors } = useTheme()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Primary statuses */}
      {PRIMARY_STATUSES.map(status => {
        const tasks = groupedByStatus[status] || []
        if (tasks.length === 0) return null
        const visible = getVisible(status)
        const shown = tasks.slice(0, visible)
        return (
          <div key={status} style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}`, padding: '0', borderRadius: 12 }}>
            <div style={{
              padding: '12px 16px', borderBottom: `1px solid ${colors.border}`, display: 'flex',
              alignItems: 'center', gap: '10px',
            }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: STATUS_COLORS[status] || colors.textMuted }} />
              <span style={{ fontSize: '11px', fontWeight: 700, color: colors.text, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{status}</span>
              <span style={{ fontSize: '10px', color: colors.textMuted, marginLeft: 'auto' }}>{tasks.length}</span>
            </div>
            {shown.map(task => <TaskListRow key={task.id} task={task} onClick={() => onTaskClick(task)} />)}
            {tasks.length > visible && (
              <button
                onClick={() => loadMore(status)}
                style={{
                  width: '100%', padding: '10px', backgroundColor: 'transparent', border: 'none',
                  borderTop: `1px solid ${colors.border}`, color: colors.textMuted, cursor: 'pointer',
                  fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                  fontFamily: 'Montserrat, sans-serif', borderRadius: 10000,
                }}
              >
                Load {Math.min(tasks.length - visible, 20)} more ({tasks.length - visible} remaining)
              </button>
            )}
          </div>
        )
      })}

      {/* Secondary toggle */}
      {secondaryTasks.length > 0 && (
        <div>
          <button
            onClick={() => setShowSecondary(!showSecondary)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
              padding: '10px 16px', backgroundColor: colors.bg, border: `1px solid ${colors.border}`,
              color: colors.textMuted, cursor: 'pointer', fontSize: '11px', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'Montserrat, sans-serif', borderRadius: 10000,
            }}
          >
            <span>{showSecondary ? '▲' : '▼'} On Hold & Completed ({secondaryTasks.length})</span>
          </button>
          {showSecondary && (
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {SECONDARY_STATUSES.map(status => {
                const tasks = groupedByStatus[status] || []
                if (tasks.length === 0) return null
                const visible = getVisible(status)
                const shown = tasks.slice(0, visible)
                return (
                  <div key={status} style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 12 }}>
                    <div style={{ padding: '10px 16px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: STATUS_COLORS[status] || colors.textMuted }} />
                      <span style={{ fontSize: '11px', fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{status}</span>
                      <span style={{ fontSize: '10px', color: colors.borderLight, marginLeft: 'auto' }}>{tasks.length}</span>
                    </div>
                    {shown.map(task => <TaskListRow key={task.id} task={task} faded onClick={() => onTaskClick(task)} />)}
                    {tasks.length > visible && (
                      <button onClick={() => loadMore(status)} style={{ width: '100%', padding: '10px', backgroundColor: 'transparent', border: 'none', borderTop: `1px solid ${colors.border}`, color: colors.textMuted, cursor: 'pointer', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'Montserrat, sans-serif', borderRadius: 10000 }}>
                        Load more ({tasks.length - visible} remaining)
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TaskListRow({ task, faded = false, onClick }: { task: NotionTask; faded?: boolean; onClick: () => void }) {
  const { colors } = useTheme()
  const tint = priorityRowTint(task.priority)
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
        width: '100%', textAlign: 'left', background: tint.background, border: 'none',
        borderLeft: `3px solid ${tint.borderLeftColor}`,
        borderBottom: `1px solid ${colors.bgSecondary}`, cursor: 'pointer',
        fontFamily: 'Montserrat, sans-serif',
        opacity: faded ? 0.5 : 1, borderRadius: 10000,
      }}
    >
      <p style={{ margin: 0, fontSize: '13px', color: faded ? colors.textMuted : colors.text, flex: 1, lineHeight: 1.4, textDecoration: faded ? 'line-through' : 'none' }}>
        {task.name}
      </p>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
        {task.assignedNames.length > 0 && (
          <span style={{ fontSize: '10px', color: colors.textMuted, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {task.assignedNames.join(', ')}
          </span>
        )}
        {task.tags.slice(0, 2).map(tag => (
          <span key={tag} style={{ fontSize: '9px', fontWeight: 700, color: colors.textMuted, backgroundColor: colors.bgSecondary, padding: '2px 6px', textTransform: 'uppercase', border: `1px solid ${colors.border}`, borderRadius: 10000 }}>
            {tag}
          </span>
        ))}
        {task.priority && (
          <span style={{ fontSize: '10px', fontWeight: 700, color: PRIORITY_COLORS[task.priority] || colors.textMuted, textTransform: 'uppercase' }}>
            {task.priority}
          </span>
        )}
        {task.dueDate && (
          <span style={{ fontSize: '10px', color: colors.textMuted }}>
            {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
        <span style={{ fontSize: '10px', color: colors.borderLight }}>›</span>
      </div>
    </button>
  )
}
