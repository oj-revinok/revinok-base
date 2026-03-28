'use client'

import { useState } from 'react'

interface Project {
  id: string
  name: string
  description: string | null
  status: string
  start_date: string | null
  due_date: string | null
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
    <div style={{ padding: '24px 20px 40px', maxWidth: '1400px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '28px',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <h1
          style={{
            fontSize: 'clamp(24px, 5vw, 32px)',
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
            className="btn-primary"
            style={{
              padding: '12px 20px',
              backgroundColor: '#BDD630',
              color: '#080808',
              border: 'none',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              cursor: 'pointer',
              fontFamily: 'Montserrat, sans-serif',
              whiteSpace: 'nowrap',
              minHeight: '44px',
            }}
          >
            + NEW PROJECT
          </button>
        )}
      </div>

      {/* Filter tabs — scrollable on mobile */}
      <div
        className="filter-tabs"
        style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}
      >
        {ALL_STATUSES.map((status) => {
          const isActive = activeFilter === status
          return (
            <button
              key={status}
              onClick={() => setActiveFilter(status)}
              className="tag"
              style={{
                padding: '10px 16px',
                backgroundColor: isActive ? '#BDD630' : 'transparent',
                color: isActive ? '#080808' : '#999999',
                border: isActive ? 'none' : '1px solid #1a1a1a',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                cursor: 'pointer',
                fontFamily: 'Montserrat, sans-serif',
                transition: 'all 0.15s ease',
                minHeight: '44px',
                flexShrink: 0,
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
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))',
          gap: '16px',
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
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
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
                {/* Project name — the hero */}
                <div>
                  <h2
                    style={{
                      fontSize: '20px',
                      fontWeight: 800,
                      color: '#ffffff',
                      margin: '0 0 6px 0',
                      lineHeight: 1.2,
                      letterSpacing: '-0.5px',
                      wordBreak: 'break-word',
                    }}
                  >
                    {project.name}
                  </h2>
                  {/* Client — secondary label */}
                  {(project.clients?.brand_name || project.clients?.name) && (
                    <p
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        color: '#666666',
                        margin: 0,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {project.clients?.brand_name || project.clients?.name}
                    </p>
                  )}
                </div>

                {/* Status badge */}
                <div>
                  <span
                    className="tag"
                    style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      backgroundColor: statusColors[project.status?.toLowerCase()] || '#666666',
                      color: '#080808',
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
                      margin: 0,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      flex: 1,
                    }}
                  >
                    {project.description}
                  </p>
                )}

                {/* Footer: date only (no budget) */}
                <div
                  style={{
                    paddingTop: '12px',
                    borderTop: '1px solid #1a1a1a',
                    fontSize: '11px',
                    color: '#555555',
                    marginTop: 'auto',
                  }}
                >
                  {project.due_date
                    ? `Due ${new Date(project.due_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}`
                    : project.start_date
                    ? `Started ${new Date(project.start_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}`
                    : 'No dates set'}
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
