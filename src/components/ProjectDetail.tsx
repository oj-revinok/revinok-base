'use client'

import { useState, useTransition } from 'react'
import { updateProjectStatus, updateProject } from '@/lib/actions/projects'
import AddNoteForm from './AddNoteForm'
import ProjectFiles from './ProjectFiles'

type Tab = 'overview' | 'tasks' | 'activity'

const STATUS_COLORS: Record<string, string> = {
  discovery: '#a78bfa',
  design: '#38bdf8',
  development: '#4a9eff',
  review: '#ff9d4a',
  live: '#4ade80',
  paused: '#6b7280',
  cancelled: '#ef4444',
}

const ALL_STATUSES = ['discovery', 'design', 'development', 'review', 'live', 'paused', 'cancelled']

const TASK_STATUS_COLORS: Record<string, string> = {
  todo: '#666666',
  in_progress: '#4a9eff',
  done: '#4ade80',
}

interface Profile { full_name: string | null }

interface Task {
  id: string
  title: string
  status: string
  priority: string | null
  due_date: string | null
}

interface Note {
  id: string
  content: string
  created_at: string
  profiles?: Profile | null
}

interface ActivityEntry {
  id: string
  description: string
  created_at: string
  activity_type: string
  profiles?: Profile | null
}

interface ProjectLink {
  id: string
  label: string
  url: string
}

interface ProjectFile {
  id: string
  name: string
  url: string
  storage_path: string
  size_bytes: number | null
  file_type: string | null
  created_at: string
}

interface Project {
  id: string
  name: string
  description: string | null
  status: string
  start_date: string | null
  due_date: string | null
  figma_url: string | null
  staging_url: string | null
  live_url: string | null
  notion_url: string | null
  clients?: { id: string; name: string; brand_name: string | null } | null
}

interface Props {
  project: Project
  tasks: Task[]
  notes: Note[]
  activity: ActivityEntry[]
  links: ProjectLink[]
  projectFiles: ProjectFile[]
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: '#0e0e0e', padding: '20px', border: '1px solid #1a1a1a' }}>
      <h2 style={{ fontSize: '12px', fontWeight: 700, color: '#BDD630', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

export default function ProjectDetail({ project: initialProject, tasks, notes, activity, links, projectFiles }: Props) {
  const [tab, setTab] = useState<Tab>('overview')
  const [project, setProject] = useState(initialProject)
  const [editingDesc, setEditingDesc] = useState(false)
  const [descDraft, setDescDraft] = useState(initialProject.description || '')
  const [savingDesc, setSavingDesc] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)
  const [, startTransition] = useTransition()

  const client = project.clients
  const clientName = client?.brand_name || client?.name

  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress')
  const doneTasks = tasks.filter((t) => t.status === 'done')

  async function handleStatusChange(newStatus: string) {
    setStatusSaving(true)
    const prev = project.status
    setProject((p) => ({ ...p, status: newStatus }))
    try {
      await updateProjectStatus(project.id, newStatus)
    } catch {
      setProject((p) => ({ ...p, status: prev }))
    } finally {
      setStatusSaving(false)
    }
  }

  async function handleSaveDesc() {
    setSavingDesc(true)
    const prev = project.description
    setProject((p) => ({ ...p, description: descDraft }))
    setEditingDesc(false)
    try {
      await updateProject(project.id, { description: descDraft })
    } catch {
      setProject((p) => ({ ...p, description: prev }))
      setDescDraft(prev || '')
    } finally {
      setSavingDesc(false)
    }
  }

  const builtInLinks = [
    project.live_url && { label: '↗ Live Site', url: project.live_url },
    project.staging_url && { label: '⚙ Staging', url: project.staging_url },
    project.figma_url && { label: '✦ Figma', url: project.figma_url },
    project.notion_url && { label: '☰ Notion', url: project.notion_url },
  ].filter(Boolean) as { label: string; url: string }[]

  const allLinks = [...builtInLinks, ...(links || [])]

  return (
    <div style={{ padding: '20px 16px 80px', maxWidth: '100%', overflowX: 'hidden' }}>
      {/* Back */}
      <a href="/dashboard/projects" style={{ color: '#666666', textDecoration: 'none', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'inline-block', marginBottom: '20px', minHeight: '44px', lineHeight: '44px' }}>
        ← BACK TO PROJECTS
      </a>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 'clamp(24px, 6vw, 38px)', fontWeight: 900, color: '#ffffff', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '-1px', wordBreak: 'break-word', lineHeight: 1.1 }}>
            {clientName || project.name}
          </h1>
          {clientName && (
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#666666', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {project.name}
            </p>
          )}
        </div>

        {/* Status dropdown */}
        <div style={{ flexShrink: 0, alignSelf: 'flex-start', position: 'relative' }}>
          <select
            value={project.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={statusSaving}
            style={{
              padding: '3px 28px 3px 10px',
              backgroundColor: STATUS_COLORS[project.status] || '#666666',
              color: '#080808',
              border: 'none',
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              cursor: 'pointer',
              fontFamily: 'Montserrat, sans-serif',
              appearance: 'none',
              WebkitAppearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%23080808'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 8px center',
              opacity: statusSaving ? 0.6 : 1,
            }}
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total Tasks', value: tasks.length, color: '#ffffff' },
          { label: 'In Progress', value: inProgressTasks.length, color: '#4a9eff' },
          { label: 'Completed', value: doneTasks.length, color: '#4ade80' },
        ].map((stat) => (
          <div key={stat.label} style={{ backgroundColor: '#0e0e0e', padding: '16px 20px', border: '1px solid #1a1a1a' }}>
            <p style={{ fontSize: '10px', color: '#666666', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</p>
            <p style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 800, color: stat.color, margin: 0 }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid #1a1a1a', paddingBottom: '0' }}>
        {(['overview', 'tasks', 'activity'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 16px',
              backgroundColor: 'transparent',
              color: tab === t ? '#BDD630' : '#555555',
              border: 'none',
              borderBottom: tab === t ? '2px solid #BDD630' : '2px solid transparent',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              cursor: 'pointer',
              fontFamily: 'Montserrat, sans-serif',
              transition: 'all 0.15s ease',
              marginBottom: '-1px',
            }}
          >
            {t === 'overview' ? 'Overview' : t === 'tasks' ? `Tasks (${tasks.length})` : 'Activity'}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: '20px', alignItems: 'start' }}>
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Description */}
            <SectionCard title="Description">
              {editingDesc ? (
                <div>
                  <textarea
                    value={descDraft}
                    onChange={(e) => setDescDraft(e.target.value)}
                    rows={4}
                    style={{ width: '100%', padding: '12px', backgroundColor: '#111111', border: '1px solid #333333', color: '#ffffff', fontSize: '13px', fontFamily: 'Montserrat, sans-serif', resize: 'vertical', lineHeight: '1.6', boxSizing: 'border-box' }}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button onClick={handleSaveDesc} disabled={savingDesc} style={{ padding: '8px 16px', backgroundColor: '#BDD630', color: '#080808', border: 'none', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
                      {savingDesc ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => { setEditingDesc(false); setDescDraft(project.description || '') }} style={{ padding: '8px 16px', backgroundColor: 'transparent', color: '#666666', border: '1px solid #333333', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <p style={{ color: project.description ? '#999999' : '#444444', fontSize: '13px', lineHeight: 1.7, margin: 0, flex: 1 }}>
                    {project.description || 'No description. Click to add one.'}
                  </p>
                  <button onClick={() => setEditingDesc(true)} title="Edit description" style={{ background: 'none', border: 'none', color: '#444444', cursor: 'pointer', padding: '4px', fontSize: '14px', flexShrink: 0 }}>
                    ✎
                  </button>
                </div>
              )}
            </SectionCard>

            {/* Notes */}
            <SectionCard title={`Notes${notes.length > 0 ? ` (${notes.length})` : ''}`}>
              <AddNoteForm projectId={project.id} />
              {notes.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {notes.map((note) => {
                    const author = note.profiles?.full_name
                    return (
                      <div key={note.id} style={{ padding: '14px', backgroundColor: '#111111', borderLeft: '3px solid #333333' }}>
                        <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#cccccc', lineHeight: 1.6 }}>{note.content}</p>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {author && <span style={{ fontSize: '11px', color: '#BDD630', fontWeight: 600 }}>{author}</span>}
                          {author && <span style={{ fontSize: '11px', color: '#333333' }}>·</span>}
                          <span style={{ fontSize: '11px', color: '#555555' }}>
                            {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p style={{ color: '#555555', fontSize: '13px', margin: 0 }}>No notes yet.</p>
              )}
            </SectionCard>

            {/* Files */}
            <SectionCard title={`Files${projectFiles.length > 0 ? ` (${projectFiles.length})` : ''}`}>
              <ProjectFiles projectId={project.id} initialFiles={projectFiles} />
            </SectionCard>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Details */}
            <SectionCard title="Details">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'Start', value: project.start_date ? new Date(project.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD' },
                  { label: 'Due', value: project.due_date ? new Date(project.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD' },
                ].map((item) => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#666666', textTransform: 'uppercase' }}>{item.label}</span>
                    <span style={{ fontSize: '12px', color: '#ffffff', fontWeight: 600 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Links */}
            {allLinks.length > 0 && (
              <SectionCard title="Links">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {allLinks.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#111111', textDecoration: 'none', color: '#ffffff', fontSize: '12px', fontWeight: 600, minHeight: '44px' }}
                    >
                      <span>{link.label}</span>
                      <span style={{ color: '#BDD630' }}>↗</span>
                    </a>
                  ))}
                </div>
              </SectionCard>
            )}
          </div>
        </div>
      )}

      {/* ── TASKS TAB ── */}
      {tab === 'tasks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Group by status */}
          {(['in_progress', 'todo', 'done'] as const).map((statusKey) => {
            const group = tasks.filter((t) => t.status === statusKey)
            if (group.length === 0) return null
            const labels: Record<string, string> = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' }
            return (
              <SectionCard key={statusKey} title={`${labels[statusKey]} (${group.length})`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {group.map((task) => (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: '#111111', border: '1px solid #1a1a1a', minHeight: '44px' }}>
                      <div style={{ width: '8px', height: '8px', backgroundColor: TASK_STATUS_COLORS[task.status] || '#666666', flexShrink: 0 }} />
                      <p style={{ margin: 0, fontSize: '13px', color: task.status === 'done' ? '#666666' : '#ffffff', flex: 1, textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>
                        {task.title}
                      </p>
                      {task.priority && (
                        <span style={{ fontSize: '10px', fontWeight: 700, color: task.priority === 'urgent' ? '#ef4444' : task.priority === 'high' ? '#ff9d4a' : '#666666', textTransform: 'uppercase', flexShrink: 0 }}>
                          {task.priority}
                        </span>
                      )}
                      {task.due_date && (
                        <span style={{ fontSize: '10px', color: '#555555', flexShrink: 0 }}>
                          {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </SectionCard>
            )
          })}
          {tasks.length === 0 && (
            <p style={{ color: '#555555', fontSize: '13px' }}>No tasks yet.</p>
          )}
        </div>
      )}

      {/* ── ACTIVITY TAB ── */}
      {tab === 'activity' && (
        <SectionCard title="Activity Log">
          {activity.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {activity.map((entry, i) => (
                <div key={entry.id} style={{ display: 'flex', gap: '14px', paddingBottom: '20px', position: 'relative' }}>
                  {/* Timeline line */}
                  {i < activity.length - 1 && (
                    <div style={{ position: 'absolute', left: '5px', top: '14px', bottom: 0, width: '1px', backgroundColor: '#1a1a1a' }} />
                  )}
                  <div style={{ width: '11px', height: '11px', backgroundColor: '#BDD630', borderRadius: '50%', flexShrink: 0, marginTop: '3px', zIndex: 1 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#cccccc', lineHeight: 1.5 }}>{entry.description}</p>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {entry.profiles?.full_name && (
                        <span style={{ fontSize: '11px', color: '#BDD630', fontWeight: 600 }}>{entry.profiles.full_name}</span>
                      )}
                      <span style={{ fontSize: '11px', color: '#555555' }}>
                        {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#555555', fontSize: '13px', margin: 0 }}>No activity yet.</p>
          )}
        </SectionCard>
      )}
    </div>
  )
}
