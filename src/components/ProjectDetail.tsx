'use client'

import { useState, useTransition } from 'react'
import { updateProjectStatus, updateProject } from '@/lib/actions/projects'
import AddNoteForm from './AddNoteForm'
import ProjectFiles from './ProjectFiles'
import type { NotionTask } from '@/lib/notion'

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

const NOTION_STATUS_COLORS: Record<string, string> = {
  'Waiting for info': '#ff9d4a',
  'Not started':      '#444444',
  'In progress':      '#4a9eff',
  'On Hold':          '#6b7280',
  'Inhouse Review':   '#a78bfa',
  'Feedback':         '#38bdf8',
  'Complete':         '#4ade80',
}

const NOTION_PRIORITY_COLORS: Record<string, string> = {
  'High':   '#ef4444',
  'Medium': '#ff9d4a',
  'Low':    '#666666',
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
  notion_project_id: string | null
  clients?: { id: string; name: string; brand_name: string | null } | null
}

interface Props {
  project: Project
  notes: Note[]
  activity: ActivityEntry[]
  links: ProjectLink[]
  projectFiles: ProjectFile[]
  notionTasks: NotionTask[]
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

export default function ProjectDetail({ project: initialProject, notes, activity, links, projectFiles, notionTasks }: Props) {
  const [tab, setTab] = useState<Tab>('overview')
  const [project, setProject] = useState(initialProject)
  const [editingDesc, setEditingDesc] = useState(false)
  const [descDraft, setDescDraft] = useState(initialProject.description || '')
  const [savingDesc, setSavingDesc] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)
  const [, startTransition] = useTransition()

  const client = project.clients
  const clientName = client?.brand_name || client?.name

  const activeTasks = notionTasks.filter((t) => ['In progress', 'Inhouse Review', 'Feedback', 'Waiting for info'].includes(t.status))
  const doneTasks = notionTasks.filter((t) => t.status === 'Complete')

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
          { label: 'Total Tasks', value: notionTasks.length, color: '#ffffff' },
          { label: 'In Progress', value: activeTasks.length, color: '#4a9eff' },
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
            {t === 'overview' ? 'Overview' : t === 'tasks' ? `Tasks (${notionTasks.length})` : 'Activity'}
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
          {!project.notion_project_id ? (
            <div style={{ backgroundColor: '#0e0e0e', border: '1px dashed #333333', padding: '32px', textAlign: 'center' }}>
              <p style={{ fontSize: '24px', margin: '0 0 12px 0' }}>☰</p>
              <p style={{ color: '#ffffff', fontWeight: 700, fontSize: '14px', margin: '0 0 8px 0' }}>Not linked to Notion</p>
              <p style={{ color: '#666666', fontSize: '13px', margin: '0 0 20px 0' }}>
                Link this project to a Notion page to pull tasks automatically from your Workload database.
              </p>
              <p style={{ color: '#555555', fontSize: '12px', margin: 0 }}>
                Go to project settings and add the Notion Project ID.
              </p>
            </div>
          ) : notionTasks.length === 0 ? (
            <div style={{ backgroundColor: '#0e0e0e', border: '1px solid #1a1a1a', padding: '32px', textAlign: 'center' }}>
              <p style={{ color: '#555555', fontSize: '13px', margin: 0 }}>No tasks found in Notion for this project.</p>
            </div>
          ) : (
            <>
              {/* Active */}
              {(['In progress', 'Inhouse Review', 'Feedback', 'Waiting for info', 'Not started', 'On Hold', 'Complete'] as const).map((statusKey) => {
                const group = notionTasks.filter((t) => t.status === statusKey)
                if (group.length === 0) return null
                const isDone = statusKey === 'Complete'
                return (
                  <SectionCard key={statusKey} title={`${statusKey} (${group.length})`}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {group.map((task) => (
                        <a
                          key={task.id}
                          href={task.notionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: '#111111', border: '1px solid #1a1a1a', minHeight: '44px', textDecoration: 'none' }}
                        >
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: NOTION_STATUS_COLORS[task.status] || '#666666', flexShrink: 0 }} />
                          <p style={{ margin: 0, fontSize: '13px', color: isDone ? '#555555' : '#ffffff', flex: 1, textDecoration: isDone ? 'line-through' : 'none', lineHeight: 1.4 }}>
                            {task.name}
                          </p>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                            {task.tags.slice(0, 2).map((tag) => (
                              <span key={tag} style={{ fontSize: '9px', fontWeight: 700, color: '#666666', backgroundColor: '#1a1a1a', padding: '2px 6px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                {tag}
                              </span>
                            ))}
                            {task.priority && (
                              <span style={{ fontSize: '10px', fontWeight: 700, color: NOTION_PRIORITY_COLORS[task.priority] || '#666666', textTransform: 'uppercase' }}>
                                {task.priority}
                              </span>
                            )}
                            {task.dueDate && (
                              <span style={{ fontSize: '10px', color: '#555555' }}>
                                {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                            <span style={{ fontSize: '10px', color: '#333333' }}>↗</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </SectionCard>
                )
              })}
            </>
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
