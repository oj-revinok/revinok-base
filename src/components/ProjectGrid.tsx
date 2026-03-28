'use client'

import { useState } from 'react'

interface Project {
  id: string
  name: string
  description: string | null
  status: string
  start_date: string | null
  due_date: string | null
  budget: number | null
  clients?: { id: string; name: string; brand_name: string | null } | null
}

interface ProjectGridProps {
  projects: Project[]
  canCreate: boolean
}

const statusColors: Record<string, string> = {
  discovery: '#a78bfa',
  design: '#38bdf8',
  development: '#4a9eff',
  review: '#ff9d4a',
  live: '#4ade80',
  paused: '#6b7280',
  cancelled: '#ef4444',
}

const ALL_STATUSES = ['All', 'Discovery', 'Design', 'Development', 'Review', 'Live', 'Paused']

export default function ProjectGrid({ projects, canCreate }: ProjectGridProps) {
  const [activeFilter, setActiveFilter] = useState('All')

  const filtered = activeFilter === 'All'
    ? projects
    : projects.filter((p) => p.status?.toLowerCase() === activeFilter.toLowerCase())

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
        {canCreate && (
          <button
            onClick={() => alert('Create project form coming soon')}
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
            }}
            onMouseEnter={(e) => { (e.currentTarget).style.backgroundColor = '#d4e650' }}
            onMouseLeave={(e) => { (e.currentTarget).style.backgroundColor = '#BDD630' }}
          >
            + NEW PROJECT
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '40px', flexWrap: 'wrap' }}>
        {ALL_STATUSES.map((status) => {
          const isActive = activeFilter === status
          return (
            <button
              key={status}
              onClick={() => setActiveFilter(status)}
              style={{
                padding: '8px 16px',
                backgroundColor: isActive ? '#BDD630' : 'transparent',
                color: isActive ? '#080808' : '#999999',
                border: isActive ? 'none' : '1px solid #1a1a1a',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                cursor: 'pointer',
                fontFamily: 'Montserrat, sans-serif',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget).style.backgroundColor = '#1a1a1a'
                  ;(e.currentTarget).style.color = '#BDD630'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget).style.backgroundColor = 'transparent'
                  ;(e.currentTarget).style.color = '#999999'
                }
              }}
            >
              {status}
            </button>
          )
        })}
      </div>

      {/* Project grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '24px',
        }}
      >
        {filtered && filtered.length > 0 ? (
          filtered.map((project) => (
            <a
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <div
                style={{
                  backgroundColor: '#0e0e0e',
                  border: '1px solid #1a1a1a',
                  borderRadius: '8px',
                  padding: '24px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  height: '100%',
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
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#BDD630',
                      margin: '0 0 6px 0',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {project.clients?.brand_name || project.clients?.name || 'Internal'}
                  </h3>
                  <h2
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: '#ffffff',
                      margin: 0,
                      lineHeight: 1.3,
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
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
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
                    fontSize: '11px',
                    color: '#666666',
                  }}
                >
                  <span>
                    {project.start_date
                      ? new Date(project.start_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'TBD'}
                  </span>
                  {project.budget && (
                    <span style={{ color: '#555555', fontWeight: 600 }}>
                      ${project.budget.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </a>
          ))
        ) : (
          <div
            style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '80px 40px',
              color: '#555555',
            }}
          >
            <p style={{ fontSize: '14px', margin: 0 }}>
              {activeFilter === 'All' ? 'No projects yet' : `No ${activeFilter} projects`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
