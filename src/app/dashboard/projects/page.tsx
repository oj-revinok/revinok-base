import { createClient } from '@/lib/supabase/server'

interface Project {
  id: string
  name: string
  client_name: string
  description: string
  status: string
  start_date: string
  end_date: string
  team_members: string[]
}

export default async function ProjectsPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single()

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  const statusColors: Record<string, string> = {
    designing: '#BDD630',
    developing: '#4a9eff',
    reviewing: '#ff9d4a',
    live: '#4ade80',
  }

  const statuses = ['All', 'Designing', 'Developing', 'Reviewing', 'Live']

  return (
    <div style={{ padding: '40px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '40px',
        }}
      >
        <h1
          style={{
            fontSize: '32px',
            fontWeight: 900,
            color: '#ffffff',
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '-1px',
          }}
        >
          PROJECTS
        </h1>
        {(profile?.role === 'admin' || profile?.role === 'pm') && (
          <button
            style={{
              padding: '12px 24px',
              backgroundColor: '#BDD630',
              color: '#080808',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
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
            + NEW PROJECT
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '40px', overflowX: 'auto' }}>
        {statuses.map((status) => (
          <button
            key={status}
            style={{
              padding: '8px 16px',
              backgroundColor: status === 'All' ? '#BDD630' : 'transparent',
              color: status === 'All' ? '#080808' : '#999999',
              border: status === 'All' ? 'none' : '1px solid #1a1a1a',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              cursor: 'pointer',
              fontFamily: 'Montserrat, sans-serif',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              if (status !== 'All') {
                (e.target as HTMLButtonElement).style.backgroundColor = '#1a1a1a'
                ;(e.target as HTMLButtonElement).style.color = '#BDD630'
              }
            }}
            onMouseLeave={(e) => {
              if (status !== 'All') {
                (e.target as HTMLButtonElement).style.backgroundColor = 'transparent'
                ;(e.target as HTMLButtonElement).style.color = '#999999'
              }
            }}
          >
            {status}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '24px',
        }}
      >
        {projects && projects.length > 0 ? (
          projects.map((project: Project) => (
            <a
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              style={{
                textDecoration: 'none',
                display: 'block',
              }}
            >
              <div
                style={{
                  backgroundColor: '#0e0e0e',
                  border: '1px solid #1a1a1a',
                  borderRadius: '8px',
                  padding: '24px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.borderColor = '#333333'
                  el.style.backgroundColor = '#151515'
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.borderColor = '#1a1a1a'
                  el.style.backgroundColor = '#0e0e0e'
                }}
              >
                <div style={{ marginBottom: '16px' }}>
                  <h3
                    style={{
                      fontSize: '14px',
                      fontWeight: 800,
                      color: '#BDD630',
                      margin: 0,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '4px',
                    }}
                  >
                    {project.client_name}
                  </h3>
                  <h2
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: '#ffffff',
                      margin: 0,
                    }}
                  >
                    {project.name}
                  </h2>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      backgroundColor: statusColors[project.status?.toLowerCase()] || '#666666',
                      color: '#080808',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {project.status}
                  </span>
                </div>

                {project.description && (
                  <p
                    style={{
                      color: '#999999',
                      fontSize: '13px',
                      lineHeight: '1.5',
                      margin: '0 0 16px 0',
                    }}
                  >
                    {project.description}
                  </p>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '16px',
                    borderTop: '1px solid #1a1a1a',
                    fontSize: '12px',
                    color: '#666666',
                  }}
                >
                  <span>
                    {project.start_date
                      ? new Date(project.start_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'TBD'}
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {project.team_members && project.team_members.length > 0 && (
                      project.team_members.slice(0, 3).map((_, i) => (
                        <div
                          key={i}
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: '#BDD630',
                            fontSize: '9px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#080808',
                            fontWeight: 700,
                          }}
                        >
                          {String.fromCharCode(65 + i)}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </a>
          ))
        ) : (
          <div
            style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '60px 40px',
              color: '#666666',
            }}
          >
            <p style={{ fontSize: '14px', margin: 0 }}>No projects yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
