'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { updateProjectStatus, updateProject, deleteNote, deleteProjectFile } from '@/lib/actions/projects'
import { useTheme } from '@/context/ThemeContext'
import AddNoteForm from './AddNoteForm'
import ProjectFiles from './ProjectFiles'
import EditProjectModal from './EditProjectModal'
import ShareProjectModal from './ShareProjectModal'
import LaunchChecklist from './LaunchChecklist'
import TasksView from './TasksView'
import type { NotionTask } from '@/lib/notion'
import { isAdminOrPM, isDevRole, isDesignerRole, ROLE_LABELS } from '@/types'

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
  'Not started':      '#333333',
  'In progress':      '#4a9eff',
  'On Hold':          '#6b7280',
  'Inhouse Review':   '#a78bfa',
  'Feedback':         '#38bdf8',
  'Complete':         '#4ade80',
}

const NOTION_PRIORITY_COLORS: Record<string, string> = {
  'High':   '#ef4444',
  'Medium': '#ff9d4a',
  'Low':    '#555555',
}

// Status display order: active first, done last
const TASK_STATUS_ORDER = [
  'Not started', 'In progress', 'Waiting for info', 'Inhouse Review', 'Feedback', 'On Hold', 'Complete'
]
const SECONDARY_STATUSES = ['On Hold', 'Complete']

interface Profile { full_name: string | null }

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
  is_launch_checklist?: boolean
}

interface ProjectMember {
  id: string
  profile_id: string
  profiles: {
    id: string
    full_name: string | null
    email: string
    role: string
    initials?: string | null
    avatar_url?: string | null
  } | null
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
  projectMembers: ProjectMember[]
  userRole: string
  userFullName: string
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme()
  return (
    <div style={{ backgroundColor: colors.bgSecondary, padding: '20px', border: `1px solid ${colors.border}`, borderRadius: 16 }}>
      <h2 style={{ fontSize: '12px', fontWeight: 700, color: colors.accent, margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

export default function ProjectDetail({
  project: initialProject, notes: initialNotes, activity, links, projectFiles: initialFiles,
  notionTasks, projectMembers: initialMembers, userRole, userFullName
}: Props) {
  const { colors, theme } = useTheme()
  const [tab, setTab] = useState<Tab>('overview')
  const [project, setProject] = useState(initialProject)
  const [notes, setNotes] = useState(initialNotes)
  const [projectFiles, setProjectFiles] = useState(initialFiles)
  const [members, setMembers] = useState(initialMembers)
  const [editingDesc, setEditingDesc] = useState(false)
  const [descDraft, setDescDraft] = useState(initialProject.description || '')
  const [savingDesc, setSavingDesc] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showLaunchChecklist, setShowLaunchChecklist] = useState(false)
  const [showSecondaryTasks, setShowSecondaryTasks] = useState(false)
  const [, startTransition] = useTransition()

  const canEdit = isAdminOrPM(userRole as any)
  const canDelete = isAdminOrPM(userRole as any)
  const canLaunch = (isDevRole(userRole as any) || canEdit) && project.status !== 'live'
  const isDev = isDevRole(userRole as any)

  const client = project.clients
  const clientName = client?.brand_name || client?.name

  const primaryTasks = notionTasks.filter(t => !SECONDARY_STATUSES.includes(t.status))
  const secondaryTasks = notionTasks.filter(t => SECONDARY_STATUSES.includes(t.status))

  async function handleStatusChange(newStatus: string) {
    if (!canEdit) return
    setStatusSaving(true)
    const prev = project.status
    setProject(p => ({ ...p, status: newStatus }))
    try {
      await updateProjectStatus(project.id, newStatus)
    } catch {
      setProject(p => ({ ...p, status: prev }))
    } finally {
      setStatusSaving(false)
    }
  }

  async function handleSaveDesc() {
    setSavingDesc(true)
    const prev = project.description
    setProject(p => ({ ...p, description: descDraft }))
    setEditingDesc(false)
    try {
      await updateProject(project.id, { description: descDraft })
    } catch {
      setProject(p => ({ ...p, description: prev }))
      setDescDraft(prev || '')
    } finally {
      setSavingDesc(false)
    }
  }

  async function handleDeleteNote(noteId: string) {
    if (!canDelete) return
    if (!confirm('Delete this note?')) return
    try {
      await deleteNote(noteId, project.id)
      setNotes(prev => prev.filter(n => n.id !== noteId))
    } catch (err) {
      console.error(err)
    }
  }

  async function handleDeleteFile(fileId: string) {
    if (!canDelete) return
    if (!confirm('Delete this file? This cannot be undone.')) return
    try {
      await deleteProjectFile(fileId, project.id)
      setProjectFiles(prev => prev.filter(f => f.id !== fileId))
    } catch (err) {
      console.error(err)
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
      <Link href="/dashboard/projects" prefetch={true} style={{ color: colors.textMuted, textDecoration: 'none', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'inline-block', marginBottom: '20px', minHeight: '44px', lineHeight: '44px' }}>
        ← BACK TO PROJECTS
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 'clamp(24px, 6vw, 38px)', fontWeight: 900, color: colors.text, margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '-1px', wordBreak: 'break-word', lineHeight: 1.1 }}>
            {clientName || project.name}
          </h1>
          {clientName && (
            <p style={{ fontSize: '11px', fontWeight: 600, color: colors.textMuted, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {project.name}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ flexShrink: 0, alignSelf: 'flex-start', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Launch checklist — devs and PMs/admins */}
          {canLaunch && (
            <button
              onClick={() => setShowLaunchChecklist(true)}
              style={{
                padding: '3px 12px', backgroundColor: colors.accent, border: 'none',
                color: theme === 'dark' ? '#080808' : '#ffffff', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.5px', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', minHeight: '28px', borderRadius: 10000
              }}
            >
              LAUNCH
            </button>
          )}
          {/* Share — admin/PM only */}
          {canEdit && (
            <button
              onClick={() => setShowShareModal(true)}
              style={{
                padding: '3px 12px', backgroundColor: 'transparent', border: `1px solid ${colors.borderLight}`,
                color: colors.textSecondary, fontSize: '13px', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.5px', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', minHeight: '28px', borderRadius: 10000
              }}
            >
              SHARE ({members.length})
            </button>
          )}
          {/* Edit — admin/PM only */}
          {canEdit && (
            <button
              onClick={() => setShowEditModal(true)}
              style={{
                padding: '3px 12px', backgroundColor: 'transparent', border: `1px solid ${colors.borderLight}`,
                color: colors.textSecondary, fontSize: '13px', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.5px', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', minHeight: '28px', borderRadius: 10000
              }}
            >
              EDIT
            </button>
          )}
        </div>

        {/* Status dropdown — admin/PM only */}
        {canEdit && (
          <div style={{ flexShrink: 0, alignSelf: 'flex-start', position: 'relative' }}>
            <select
              value={project.status}
              onChange={e => handleStatusChange(e.target.value)}
              disabled={statusSaving}
              style={{
                padding: '3px 28px 3px 10px', backgroundColor: STATUS_COLORS[project.status] || colors.textMuted,
                color: theme === 'dark' ? '#080808' : '#ffffff', border: 'none', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.5px', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
                appearance: 'none', WebkitAppearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='${theme === 'dark' ? '%23080808' : '%23ffffff'}'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
                opacity: statusSaving ? 0.6 : 1,
                borderRadius: 10000
              }}
            >
              {ALL_STATUSES.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        )}
        {/* Status badge for non-editors */}
        {!canEdit && (
          <span style={{
            padding: '3px 10px', backgroundColor: STATUS_COLORS[project.status] || colors.textMuted,
            color: theme === 'dark' ? '#080808' : '#ffffff', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderRadius: 10000
          }}>
            {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
          </span>
        )}
      </div>

      {/* Members strip */}
      {members.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '10px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Team:</span>
          {members.map(m => {
            const p = m.profiles
            if (!p) return null
            const initials = p.initials || (p.full_name || p.email).slice(0, 2).toUpperCase()
            return (
              <div key={m.id} title={`${p.full_name || p.email} (${ROLE_LABELS[p.role as keyof typeof ROLE_LABELS] || p.role})`}
                style={{ width: '28px', height: '28px', backgroundColor: colors.bgTertiary, border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: colors.accent, cursor: 'default', borderRadius: '50%' }}>
                {initials}
              </div>
            )
          })}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total Tasks', value: notionTasks.length, color: colors.text },
          { label: 'In Progress', value: notionTasks.filter(t => t.status === 'In progress').length, color: '#4a9eff' },
          { label: 'Completed', value: notionTasks.filter(t => t.status === 'Complete').length, color: '#4ade80' },
        ].map(stat => (
          <div key={stat.label} style={{ backgroundColor: colors.bgSecondary, padding: '16px 20px', border: `1px solid ${colors.border}`, borderRadius: 16 }}>
            <p style={{ fontSize: '10px', color: colors.textMuted, margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</p>
            <p style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 800, color: stat.color, margin: 0 }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: `1px solid ${colors.border}` }}>
        {(['overview', 'tasks', 'activity'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 16px', backgroundColor: 'transparent',
            color: tab === t ? colors.accent : colors.textMuted, border: 'none',
            borderBottom: tab === t ? `2px solid ${colors.accent}` : '2px solid transparent',
            fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px',
            cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', transition: 'all 0.15s ease', marginBottom: '-1px',
          }}>
            {t === 'overview' ? 'Overview' : t === 'tasks' ? `Tasks (${notionTasks.length})` : 'Activity'}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: '20px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Description */}
            <SectionCard title="Description">
              {editingDesc && canEdit ? (
                <div>
                  <textarea value={descDraft} onChange={e => setDescDraft(e.target.value)} rows={4} autoFocus
                    style={{ width: '100%', padding: '12px', backgroundColor: colors.bgTertiary, border: `1px solid ${colors.borderLight}`, color: colors.text, fontSize: '13px', fontFamily: 'Montserrat, sans-serif', resize: 'vertical', lineHeight: '1.6', boxSizing: 'border-box', borderRadius: 12 }}
                  />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button onClick={handleSaveDesc} disabled={savingDesc} style={{ padding: '8px 16px', backgroundColor: colors.accent, color: theme === 'dark' ? '#080808' : '#ffffff', border: 'none', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', borderRadius: 10000, height: 40 }}>
                      {savingDesc ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => { setEditingDesc(false); setDescDraft(project.description || '') }} style={{ padding: '8px 16px', backgroundColor: 'transparent', color: colors.textMuted, border: `1px solid ${colors.borderLight}`, fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', borderRadius: 10000, height: 40 }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <p style={{ color: project.description ? colors.textSecondary : colors.textMuted, fontSize: '13px', lineHeight: 1.7, margin: 0, flex: 1 }}>
                    {project.description || 'No description.'}
                  </p>
                  {canEdit && (
                    <button onClick={() => setEditingDesc(true)} title="Edit description" style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', padding: '4px', fontSize: '14px', flexShrink: 0 }}>✎</button>
                  )}
                </div>
              )}
            </SectionCard>

            {/* Notes */}
            <SectionCard title={`Notes${notes.length > 0 ? ` (${notes.length})` : ''}`}>
              <AddNoteForm
                projectId={project.id}
                onNoteAdded={(note) => setNotes(prev => [note, ...prev])}
              />
              {notes.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                  {notes.map(note => {
                    const author = note.profiles?.full_name
                    return (
                      <div key={note.id} style={{ padding: '14px', backgroundColor: colors.bgTertiary, borderLeft: `3px solid ${colors.borderLight}`, position: 'relative', borderRadius: 12 }}>
                        <div className="tiptap-editor" style={{ margin: '0 0 10px 0', fontSize: '13px', color: colors.textSecondary, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: note.content }} />
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {author && <span style={{ fontSize: '11px', color: colors.accent, fontWeight: 600 }}>{author}</span>}
                            {author && <span style={{ fontSize: '11px', color: colors.borderLight }}>·</span>}
                            <span style={{ fontSize: '11px', color: colors.textMuted }}>
                              {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: '12px', padding: '2px 6px' }}
                              title="Delete note"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </SectionCard>

            {/* Files */}
            <SectionCard title={`Files${projectFiles.length > 0 ? ` (${projectFiles.length})` : ''}`}>
              <ProjectFiles projectId={project.id} initialFiles={projectFiles} canDelete={canDelete} onDelete={handleDeleteFile} />
            </SectionCard>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <SectionCard title="Details">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'Start', value: project.start_date ? new Date(project.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD' },
                  { label: 'Due', value: project.due_date ? new Date(project.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: colors.textMuted, textTransform: 'uppercase' }}>{item.label}</span>
                    <span style={{ fontSize: '12px', color: colors.text, fontWeight: 600 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            {allLinks.length > 0 && (
              <SectionCard title="Links">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {allLinks.map(link => (
                    <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: colors.bgTertiary, textDecoration: 'none', color: colors.text, fontSize: '12px', fontWeight: 600, minHeight: '44px', borderRadius: 12 }}>
                      <span>{link.label}</span>
                      <span style={{ color: colors.accent }}>↗</span>
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
            <div style={{ backgroundColor: colors.bgSecondary, border: `1px dashed ${colors.borderLight}`, padding: '32px', textAlign: 'center', borderRadius: 16 }}>
              <p style={{ fontSize: '24px', margin: '0 0 12px 0' }}>☰</p>
              <p style={{ color: colors.text, fontWeight: 700, fontSize: '14px', margin: '0 0 8px 0' }}>Not linked to Notion</p>
              <p style={{ color: colors.textMuted, fontSize: '13px', margin: '0 0 20px 0' }}>
                Link this project to a Notion page to pull tasks automatically from your Workload database.
              </p>
              {canEdit && (
                <p style={{ color: colors.textMuted, fontSize: '12px', margin: 0 }}>Use the EDIT button to link a Notion project.</p>
              )}
            </div>
          ) : notionTasks.length === 0 ? (
            <div style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}`, padding: '32px', textAlign: 'center', borderRadius: 16 }}>
              <p style={{ color: colors.textMuted, fontSize: '13px', margin: 0 }}>No tasks found in Notion for this project.</p>
            </div>
          ) : (
            <TasksView
              tasks={notionTasks}
              isAdminOrPM={canEdit}
              hasNotionPersonId={false}
            />
          )}
        </div>
      )}

      {/* ── ACTIVITY TAB ── */}
      {tab === 'activity' && (
        <SectionCard title="Activity Log">
          {activity.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {activity.map((entry, i) => (
                <div key={entry.id} style={{ display: 'flex', gap: '14px', paddingBottom: '20px', position: 'relative' }}>
                  {i < activity.length - 1 && (
                    <div style={{ position: 'absolute', left: '5px', top: '14px', bottom: 0, width: '1px', backgroundColor: colors.border }} />
                  )}
                  <div style={{ width: '11px', height: '11px', backgroundColor: colors.accent, borderRadius: '50%', flexShrink: 0, marginTop: '3px', zIndex: 1 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: colors.textSecondary, lineHeight: 1.5 }}>{entry.description}</p>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {entry.profiles?.full_name && (
                        <span style={{ fontSize: '11px', color: colors.accent, fontWeight: 600 }}>{entry.profiles.full_name}</span>
                      )}
                      <span style={{ fontSize: '11px', color: colors.textMuted }}>
                        {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: colors.textMuted, fontSize: '13px', margin: 0 }}>No activity yet.</p>
          )}
        </SectionCard>
      )}

      {/* Modals */}
      {showEditModal && canEdit && (
        <EditProjectModal
          project={project}
          onClose={() => setShowEditModal(false)}
          onSave={updates => setProject(p => ({ ...p, ...updates }))}
        />
      )}

      {showShareModal && canEdit && (
        <ShareProjectModal
          projectId={project.id}
          projectName={clientName || project.name}
          currentMembers={members}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {showLaunchChecklist && (
        <LaunchChecklist
          projectId={project.id}
          projectName={clientName || project.name}
          currentUserName={userFullName}
          projectMembers={members}
          onClose={() => setShowLaunchChecklist(false)}
        />
      )}
    </div>
  )
}

function TaskRow({ task, isDone = false }: { task: NotionTask; isDone?: boolean }) {
  const { colors } = useTheme()
  return (
    <a
      href={task.notionUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
        backgroundColor: colors.bgTertiary, border: `1px solid ${colors.border}`, minHeight: '44px', textDecoration: 'none', borderRadius: 12,
      }}
    >
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: NOTION_STATUS_COLORS[task.status] || colors.textMuted, flexShrink: 0 }} />
      <p style={{ margin: 0, fontSize: '13px', color: isDone ? colors.textMuted : colors.text, flex: 1, textDecoration: isDone ? 'line-through' : 'none', lineHeight: 1.4 }}>
        {task.name}
      </p>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
        {task.tags.slice(0, 2).map(tag => (
          <span key={tag} style={{ fontSize: '9px', fontWeight: 700, color: colors.textMuted, backgroundColor: colors.bgSecondary, padding: '2px 6px', textTransform: 'uppercase' }}>
            {tag}
          </span>
        ))}
        {task.priority && (
          <span style={{ fontSize: '10px', fontWeight: 700, color: NOTION_PRIORITY_COLORS[task.priority] || colors.textMuted, textTransform: 'uppercase' }}>
            {task.priority}
          </span>
        )}
        {task.dueDate && (
          <span style={{ fontSize: '10px', color: colors.textMuted }}>
            {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
        <span style={{ fontSize: '10px', color: colors.borderLight }}>↗</span>
      </div>
    </a>
  )
}
