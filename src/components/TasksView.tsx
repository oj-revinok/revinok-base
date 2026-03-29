'use client'

import { useState, useMemo } from 'react'
import type { NotionTask } from '@/lib/notion'

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
  'Medium': '#ff9d4a',
  'Low':    '#555555',
}

const PRIMARY_STATUSES = ['Not started', 'In progress', 'Waiting for info', 'Inhouse Review', 'Feedback']
const SECONDARY_STATUSES = ['On Hold', 'Complete']

interface Props {
  tasks: NotionTask[]
  isAdminOrPM: boolean
  hasNotionPersonId: boolean
}

export default function TasksView({ tasks, isAdminOrPM, hasNotionPersonId }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [search, setSearch] = useState('')
  const [showSecondary, setShowSecondary] = useState(false)
  const [loadMoreCount, setLoadMoreCount] = useState<Record<string, number>>({})

  const INITIAL_VISIBLE = 15

  const filteredTasks = useMemo(() => {
    if (!search.trim()) return tasks
    const q = search.toLowerCase()
    return tasks.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.tags.some(tag => tag.toLowerCase().includes(q)) ||
      (t.priority || '').toLowerCase().includes(q)
    )
  }, [tasks, search])

  const groupedByStatus = useMemo(() => {
    const groups: Record<string, NotionTask[]> = {}
    STATUS_COLUMNS.forEach(s => {
      groups[s] = filteredTasks
        .filter(t => t.status === s)
        .sort((a, b) => (PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER] ?? 3) - (PRIORITY_ORDER[b.priority as keyof typeof PRIORITY_ORDER] ?? 3))
    })
    return groups
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
      <div style={{ padding: '40px 20px', textAlign: 'center', backgroundColor: '#0e0e0e', border: '1px dashed #333' }}>
        <p style={{ color: '#ffffff', fontWeight: 700, fontSize: '14px', margin: '0 0 8px 0' }}>No tasks assigned to you yet</p>
        <p style={{ color: '#555555', fontSize: '13px', margin: '0 0 16px 0' }}>
          To see your Notion tasks here, link your Notion profile in Settings.
        </p>
        <a href="/dashboard/settings" style={{
          display: 'inline-block', padding: '8px 20px', backgroundColor: '#BDD630', color: '#080808',
          textDecoration: 'none', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
        }}>
          Go to Settings
        </a>
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
            flex: 1, minWidth: '200px', padding: '8px 14px', backgroundColor: '#0e0e0e',
            border: '1px solid #222', color: '#ffffff', fontSize: '13px',
            fontFamily: 'Montserrat, sans-serif', outline: 'none',
          }}
        />
        {/* View toggle — list/kanban for admin/PM */}
        {isAdminOrPM && (
          <div style={{ display: 'flex', border: '1px solid #222' }}>
            {(['list', 'kanban'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '8px 16px', backgroundColor: viewMode === mode ? '#BDD630' : 'transparent',
                  border: 'none', color: viewMode === mode ? '#080808' : '#555555',
                  fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                  cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
                }}
              >
                {mode === 'list' ? '≡ List' : '⊞ Kanban'}
              </button>
            ))}
          </div>
        )}
        <span style={{ color: '#444444', fontSize: '11px', whiteSpace: 'nowrap' }}>
          {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filteredTasks.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#0e0e0e', border: '1px solid #1a1a1a' }}>
          <p style={{ color: '#444444', fontSize: '13px', margin: 0 }}>No tasks found{search ? ` for "${search}"` : ''}.</p>
        </div>
      ) : viewMode === 'kanban' && isAdminOrPM ? (
        <KanbanView groupedByStatus={groupedByStatus} />
      ) : (
        <ListView
          primaryTasks={primaryTasks}
          secondaryTasks={secondaryTasks}
          showSecondary={showSecondary}
          setShowSecondary={setShowSecondary}
          groupedByStatus={groupedByStatus}
          getVisible={getVisible}
          loadMore={loadMore}
        />
      )}
    </div>
  )
}

function KanbanView({ groupedByStatus }: { groupedByStatus: Record<string, NotionTask[]> }) {
  return (
    <div style={{ overflowX: 'auto', paddingBottom: '20px' }}>
      <div style={{ display: 'flex', gap: '12px', minWidth: `${STATUS_COLUMNS.length * 240}px` }}>
        {STATUS_COLUMNS.map(status => {
          const tasks = groupedByStatus[status] || []
          return (
            <div key={status} style={{ flex: '0 0 240px', minWidth: '240px' }}>
              {/* Column header */}
              <div style={{
                padding: '8px 12px', marginBottom: '8px', backgroundColor: '#0e0e0e',
                borderBottom: `2px solid ${STATUS_COLORS[status] || '#333'}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: STATUS_COLORS[status] || '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {status}
                </span>
                <span style={{ fontSize: '10px', color: '#444444' }}>{tasks.length}</span>
              </div>
              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {tasks.map(task => (
                  <KanbanCard key={task.id} task={task} />
                ))}
                {tasks.length === 0 && (
                  <div style={{ padding: '20px', textAlign: 'center', border: '1px dashed #1a1a1a' }}>
                    <span style={{ color: '#333333', fontSize: '11px' }}>—</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function KanbanCard({ task }: { task: NotionTask }) {
  return (
    <a
      href={task.notionUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: 'block', padding: '12px', backgroundColor: '#0e0e0e', border: '1px solid #1a1a1a', textDecoration: 'none' }}
    >
      <p style={{ fontSize: '12px', color: '#ffffff', margin: '0 0 8px 0', lineHeight: 1.4 }}>{task.name}</p>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
        {task.priority && (
          <span style={{ fontSize: '9px', fontWeight: 700, color: PRIORITY_COLORS[task.priority] || '#555', textTransform: 'uppercase' }}>
            ● {task.priority}
          </span>
        )}
        {task.dueDate && (
          <span style={{ fontSize: '10px', color: '#555555' }}>
            {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
        {task.tags.slice(0, 1).map(tag => (
          <span key={tag} style={{ fontSize: '8px', fontWeight: 700, color: '#555555', backgroundColor: '#1a1a1a', padding: '2px 5px', textTransform: 'uppercase' }}>
            {tag}
          </span>
        ))}
      </div>
    </a>
  )
}

function ListView({
  primaryTasks, secondaryTasks, showSecondary, setShowSecondary,
  groupedByStatus, getVisible, loadMore,
}: {
  primaryTasks: NotionTask[]
  secondaryTasks: NotionTask[]
  showSecondary: boolean
  setShowSecondary: (v: boolean) => void
  groupedByStatus: Record<string, NotionTask[]>
  getVisible: (s: string) => number
  loadMore: (s: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Primary statuses */}
      {PRIMARY_STATUSES.map(status => {
        const tasks = groupedByStatus[status] || []
        if (tasks.length === 0) return null
        const visible = getVisible(status)
        const shown = tasks.slice(0, visible)
        return (
          <div key={status} style={{ backgroundColor: '#0e0e0e', border: '1px solid #1a1a1a', padding: '0' }}>
            <div style={{
              padding: '12px 16px', borderBottom: '1px solid #1a1a1a', display: 'flex',
              alignItems: 'center', gap: '10px',
            }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: STATUS_COLORS[status] || '#444' }} />
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{status}</span>
              <span style={{ fontSize: '10px', color: '#444444', marginLeft: 'auto' }}>{tasks.length}</span>
            </div>
            {shown.map(task => <TaskListRow key={task.id} task={task} />)}
            {tasks.length > visible && (
              <button
                onClick={() => loadMore(status)}
                style={{
                  width: '100%', padding: '10px', backgroundColor: 'transparent', border: 'none',
                  borderTop: '1px solid #1a1a1a', color: '#555555', cursor: 'pointer',
                  fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                  fontFamily: 'Montserrat, sans-serif',
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
              padding: '10px 16px', backgroundColor: '#0e0e0e', border: '1px solid #1a1a1a',
              color: '#555555', cursor: 'pointer', fontSize: '11px', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'Montserrat, sans-serif',
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
                  <div key={status} style={{ backgroundColor: '#0e0e0e', border: '1px solid #1a1a1a' }}>
                    <div style={{ padding: '10px 16px', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: STATUS_COLORS[status] || '#444' }} />
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#555555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{status}</span>
                      <span style={{ fontSize: '10px', color: '#333333', marginLeft: 'auto' }}>{tasks.length}</span>
                    </div>
                    {shown.map(task => <TaskListRow key={task.id} task={task} faded />)}
                    {tasks.length > visible && (
                      <button onClick={() => loadMore(status)} style={{ width: '100%', padding: '10px', backgroundColor: 'transparent', border: 'none', borderTop: '1px solid #1a1a1a', color: '#444444', cursor: 'pointer', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'Montserrat, sans-serif' }}>
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

function TaskListRow({ task, faded = false }: { task: NotionTask; faded?: boolean }) {
  return (
    <a
      href={task.notionUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
        textDecoration: 'none', borderBottom: '1px solid #111111',
        backgroundColor: 'transparent',
        opacity: faded ? 0.5 : 1,
      }}
    >
      <p style={{ margin: 0, fontSize: '13px', color: faded ? '#555555' : '#ffffff', flex: 1, lineHeight: 1.4, textDecoration: faded ? 'line-through' : 'none' }}>
        {task.name}
      </p>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
        {task.tags.slice(0, 2).map(tag => (
          <span key={tag} style={{ fontSize: '9px', fontWeight: 700, color: '#444444', backgroundColor: '#111111', padding: '2px 6px', textTransform: 'uppercase', border: '1px solid #1a1a1a' }}>
            {tag}
          </span>
        ))}
        {task.priority && (
          <span style={{ fontSize: '10px', fontWeight: 700, color: PRIORITY_COLORS[task.priority] || '#555', textTransform: 'uppercase' }}>
            {task.priority}
          </span>
        )}
        {task.dueDate && (
          <span style={{ fontSize: '10px', color: '#444444' }}>
            {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
        <span style={{ fontSize: '10px', color: '#333333' }}>↗</span>
      </div>
    </a>
  )
}
