import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params
  const supabase = createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (!project) {
    notFound()
  }

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  const { data: resources } = await supabase
    .from('resources')
    .select('*')
    .eq('project_id', id)

  return (
    <div style={{ padding: '40px' }}>
      <div style={{ marginBottom: '40px' }}>
        <a
          href="/dashboard/projects"
          style={{
            color: '#BDD630',
            textDecoration: 'none',
            fontSize: '12px',
            fontWeight: 600,
            textTransform: 'uppercase',
            marginBottom: '24px',
            display: 'inline-block',
          }}
        >
          ← BACK TO PROJECTS
        </a>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#BDD630',
                margin: '0 0 8px 0',
                textTransform: 'uppercase',
              }}
            >
              {project.client_name}
            </h3>
            <h1
              style={{
                fontSize: '32px',
                fontWeight: 900,
                color: '#ffffff',
                margin: 0,
                textTransform: 'uppercase',
              }}
            >
              {project.name}
            </h1>
          </div>
          <span
            style={{
              padding: '8px 16px',
              backgroundColor:
                project.status === 'designing'
                  ? '#BDD630'
                  : project.status === 'developing'
                    ? '#4a9eff'
                    : project.status === 'reviewing'
                      ? '#ff9d4a'
                      : '#4ade80',
              color: '#080808',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            {project.status}
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '32px',
          marginBottom: '40px',
        }}
      >
        <div>
          <div style={{ backgroundColor: '#0e0e0e', borderRadius: '8px', padding: '24px' }}>
            <h2
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: '#ffffff',
                margin: '0 0 16px 0',
                textTransform: 'uppercase',
              }}
            >
              OVERVIEW
            </h2>
            {project.description && (
              <p style={{ color: '#999999', lineHeight: '1.6', marginBottom: '24px' }}>
                {project.description}
              </p>
            )}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                paddingTop: '24px',
                borderTop: '1px solid #1a1a1a',
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: '11px',
                    color: '#666666',
                    margin: '0 0 8px 0',
                    textTransform: 'uppercase',
                  }}
                >
                  START DATE
                </p>
                <p style={{ fontSize: '14px', color: '#ffffff', margin: 0, fontWeight: 600 }}>
                  {project.start_date
                    ? new Date(project.start_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'TBD'}
                </p>
              </div>
              <div>
                <p
                  style={{
                    fontSize: '11px',
                    color: '#666666',
                    margin: '0 0 8px 0',
                    textTransform: 'uppercase',
                  }}
                >
                  END DATE
                </p>
                <p style={{ fontSize: '14px', color: '#ffffff', margin: 0, fontWeight: 600 }}>
                  {project.end_date
                    ? new Date(project.end_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'TBD'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div
            style={{
              backgroundColor: '#0e0e0e',
              borderRadius: '8px',
              padding: '24px',
              borderLeft: '4px solid #BDD630',
            }}
          >
            <h3
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#BDD630',
                margin: '0 0 16px 0',
                textTransform: 'uppercase',
              }}
            >
              LAUNCH
            </h3>
            <button
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: '#BDD630',
                color: '#080808',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                cursor: 'pointer',
                fontFamily: 'Montserrat, sans-serif',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor = '#d4e650'
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor = '#BDD630'
              }}
            >
              VIEW LIVE SITE
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '24px',
        }}
      >
        <div style={{ backgroundColor: '#0e0e0e', borderRadius: '8px', padding: '24px' }}>
          <h3
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#BDD630',
              margin: '0 0 16px 0',
              textTransform: 'uppercase',
            }}
          >
            TASKS
          </h3>
          {tasks && tasks.length > 0 ? (
            <div>
              {tasks.slice(0, 3).map((task: any) => (
                <div
                  key={task.id}
                  style={{
                    padding: '8px 0',
                    borderBottom: '1px solid #1a1a1a',
                    fontSize: '13px',
                    color: '#999999',
                  }}
                >
                  {task.title}
                </div>
              ))}
              {tasks.length > 3 && (
                <p style={{ margin: '16px 0 0 0', color: '#666666', fontSize: '12px' }}>
                  +{tasks.length - 3} more
                </p>
              )}
            </div>
          ) : (
            <p style={{ color: '#666666', fontSize: '13px', margin: 0 }}>No tasks yet</p>
          )}
        </div>

        <div style={{ backgroundColor: '#0e0e0e', borderRadius: '8px', padding: '24px' }}>
          <h3
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#BDD630',
              margin: '0 0 16px 0',
              textTransform: 'uppercase',
            }}
          >
            RESOURCES
          </h3>
          {resources && resources.length > 0 ? (
            <div>
              {resources.slice(0, 3).map((resource: any) => (
                <div
                  key={resource.id}
                  style={{
                    padding: '8px 0',
                    borderBottom: '1px solid #1a1a1a',
                    fontSize: '13px',
                    color: '#999999',
                  }}
                >
                  {resource.title}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#666666', fontSize: '13px', margin: 0 }}>No resources yet</p>
          )}
        </div>

        <div style={{ backgroundColor: '#0e0e0e', borderRadius: '8px', padding: '24px' }}>
          <h3
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#BDD630',
              margin: '0 0 16px 0',
              textTransform: 'uppercase',
            }}
          >
            ACTIVITY
          </h3>
          <p style={{ color: '#666666', fontSize: '13px', margin: 0 }}>
            No recent activity
          </p>
        </div>
      </div>
    </div>
  )
}
