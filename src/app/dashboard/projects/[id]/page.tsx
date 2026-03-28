import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

const STATUS_COLORS: Record<string, string> = {
  discovery: '#a78bfa',
  design: '#38bdf8',
  development: '#4a9eff',
  review: '#ff9d4a',
  live: '#4ade80',
  paused: '#6b7280',
  cancelled: '#ef4444',
}

const TASK_STATUS_COLORS: Record<string, string> = {
  todo: '#666666',
  in_progress: '#4a9eff',
  done: '#4ade80',
}

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params
  const supabase = createClient()

  const [{ data: project }, { data: tasks }, { data: notes }, { data: activity }, { data: links }] =
    await Promise.all([
      supabase
        .from('projects')
        .select('*, clients ( id, name, brand_name )')
        .eq('id', id)
        .single(),
      supabase
        .from('tasks')
        .select('*')
        .eq('project_id', id)
        .order('sort_order'),
      supabase
        .from('notes')
        .select('*, profiles!notes_author_id_fkey ( full_name )')
        .eq('project_id', id)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('activity_log')
        .select('*, profiles!activity_log_actor_id_fkey ( full_name )')
        .eq('project_id', id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('project_links')
        .select('*')
        .eq('project_id', id)
        .order('sort_order'),
    ])

  if (!project) notFound()

  const inProgressTasks = tasks?.filter((t) => t.status === 'in_progress') ?? []
  const doneTasks = tasks?.filter((t) => t.status === 'done') ?? []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = (project as any).clients

  return (
    <div style={{ padding: '24px 20px 60px' }}>
      {/* Back + header */}
      <div style={{ marginBottom: '28px' }}>
        <a
          href="/dashboard/projects"
          style={{
            color: '#666666',
            textDecoration: 'none',
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'inline-block',
            marginBottom: '20px',
            minHeight: '44px',
            lineHeight: '44px',
          }}
          className="nav-link"
        >
          ← BACK TO PROJECTS
        </a>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            {client && (
              <p style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#BDD630',
                margin: '0 0 8px 0',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                {client.brand_name || client.name}
              </p>
            )}
            <h1 style={{
              fontSize: 'clamp(22px, 5vw, 32px)',
              fontWeight: 900,
              color: '#ffffff',
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '-1px',
              wordBreak: 'break-word',
            }}>
              {project.name}
            </h1>
            {project.description && (
              <p style={{ color: '#999999', margin: '12px 0 0 0', fontSize: '14px', lineHeight: 1.6, maxWidth: '600px' }}>
                {project.description}
              </p>
            )}
          </div>
          <span
            className="tag"
            style={{
              padding: '8px 14px',
              backgroundColor: STATUS_COLORS[project.status] || '#666666',
              color: '#080808',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              flexShrink: 0,
              alignSelf: 'flex-start',
            }}
          >
            {project.status}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
          marginBottom: '28px',
        }}
      >
        {[
          { label: 'Total Tasks', value: tasks?.length ?? 0, color: '#ffffff' },
          { label: 'In Progress', value: inProgressTasks.length, color: '#4a9eff' },
          { label: 'Completed', value: doneTasks.length, color: '#4ade80' },
          { label: 'Budget', value: project.budget ? `$${Number(project.budget).toLocaleString()}` : 'TBD', color: '#BDD630' },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{ backgroundColor: '#0e0e0e', padding: '16px 20px', border: '1px solid #1a1a1a' }}
          >
            <p style={{ fontSize: '10px', color: '#666666', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {stat.label}
            </p>
            <p style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 800, color: stat.color, margin: 0 }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Main content — stack on mobile */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* Left: Tasks + Notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ backgroundColor: '#0e0e0e', padding: '20px', border: '1px solid #1a1a1a' }}>
            <h2 style={{ fontSize: '12px', fontWeight: 700, color: '#BDD630', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              TASKS ({tasks?.length ?? 0})
            </h2>

            {tasks && tasks.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      backgroundColor: '#111111',
                      border: '1px solid #1a1a1a',
                      minHeight: '44px',
                    }}
                  >
                    <div
                      className="avatar"
                      style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: TASK_STATUS_COLORS[task.status] || '#666666',
                        flexShrink: 0,
                      }}
                    />
                    <p style={{ margin: 0, fontSize: '13px', color: task.status === 'done' ? '#666666' : '#ffffff', flex: 1, textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>
                      {task.title}
                    </p>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: task.priority === 'urgent' ? '#ef4444' : task.priority === 'high' ? '#ff9d4a' : '#666666',
                        textTransform: 'uppercase',
                        flexShrink: 0,
                      }}
                    >
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#666666', fontSize: '13px', margin: 0 }}>No tasks yet</p>
            )}
          </div>

          {/* Notes */}
          {notes && notes.length > 0 && (
            <div style={{ backgroundColor: '#0e0e0e', padding: '20px', border: '1px solid #1a1a1a' }}>
              <h2 style={{ fontSize: '12px', fontWeight: 700, color: '#BDD630', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                NOTES
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {notes.map((note) => (
                  <div key={note.id} style={{ padding: '14px', backgroundColor: '#111111', borderLeft: '3px solid #BDD630' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#cccccc', lineHeight: 1.6 }}>{note.content}</p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#555555' }}>
                      {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Details + Links + Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Project details */}
          <div style={{ backgroundColor: '#0e0e0e', padding: '20px', border: '1px solid #1a1a1a' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#BDD630', margin: '0 0 14px 0', textTransform: 'uppercase' }}>
              DETAILS
            </h3>
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
          </div>

          {/* Links */}
          {(project.notion_url || project.figma_url || project.staging_url || project.live_url || (links && links.length > 0)) && (
            <div style={{ backgroundColor: '#0e0e0e', padding: '20px', border: '1px solid #1a1a1a' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#BDD630', margin: '0 0 14px 0', textTransform: 'uppercase' }}>
                LINKS
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { label: 'Notion', url: project.notion_url },
                  { label: 'Figma', url: project.figma_url },
                  { label: 'Staging', url: project.staging_url },
                  { label: 'Live Site', url: project.live_url },
                ]
                  .filter((l) => l.url)
                  .map((link) => (
                    <a
                      key={link.label}
                      href={link.url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        backgroundColor: '#111111',
                        textDecoration: 'none',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 600,
                        minHeight: '44px',
                      }}
                      className="card-hover"
                    >
                      <span>{link.label}</span>
                      <span style={{ color: '#BDD630' }}>↗</span>
                    </a>
                  ))}
              </div>
            </div>
          )}

          {/* Activity */}
          {activity && activity.length > 0 && (
            <div style={{ backgroundColor: '#0e0e0e', padding: '20px', border: '1px solid #1a1a1a' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#BDD630', margin: '0 0 14px 0', textTransform: 'uppercase' }}>
                ACTIVITY
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activity.map((entry) => (
                  <div key={entry.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div className="avatar" style={{ width: '6px', height: '6px', backgroundColor: '#BDD630', marginTop: '5px', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: '12px', color: '#cccccc', lineHeight: 1.5 }}>{entry.description}</p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#555555' }}>
                        {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
