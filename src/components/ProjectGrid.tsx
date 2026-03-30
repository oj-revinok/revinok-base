'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTheme } from '@/context/ThemeContext'
import AddProjectModal from './AddProjectModal'

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
  clients?: { id: string; name: string; brand_name: string | null } | { id: string; name: string; brand_name: string | null }[] | null
  project_members?: { id: string }[] | null
  notes?: { id: string }[] | null
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

function QuickLink({ href, label, colors }: { href: string; label: string; colors: any }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 8px',
        backgroundColor: colors.bgTertiary,
        color: colors.textSecondary,
        fontSize: '9px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        textDecoration: 'none',
        flexShrink: 0,
        transition: 'color 0.15s ease, background-color 0.15s ease',
        fontFamily: 'Montserrat, sans-serif',
        borderRadius: 10000,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.backgroundColor = colors.bgHover
        ;(e.currentTarget as HTMLAnchorElement).style.color = colors.accent
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.backgroundColor = colors.bgTertiary
        ;(e.currentTarget as HTMLAnchorElement).style.color = colors.textSecondary
      }}
    >
      {label}
    </a>
  )
}

export default function ProjectGrid({ projects, canCreate }: ProjectGridProps) {
  const { colors, theme } = useTheme()
  const [activeFilter, setActiveFilter] = useState('All')
  const [showCreateModal, setShowCreateModal] = useState(false)

  const filtered = activeFilter === 'All'
    ? projects
    : projects.filter((p) => p.status?.toLowerCase() === activeFilter.toLowerCase())

  return (
    <div style={{ padding: '20px 16px 40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 900, color: colors.text, margin: 0, textTransform: 'uppercase', letterSpacing: '-1px' }}>
          PROJECTS
        </h1>
        {canCreate && (
          <button
            onClick={() => setShowCreateModal(true)}
            style={{ padding: '10px 16px', backgroundColor: colors.accent, color: theme === 'dark' ? '#080808' : '#ffffff', border: 'none', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', whiteSpace: 'nowrap', height: '40px', borderRadius: 10000 }}
          >
            + NEW PROJECT
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="filter-tabs" style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
        {ALL_STATUSES.map((status) => {
          const isActive = activeFilter === status
          return (
            <button
              key={status}
              onClick={() => setActiveFilter(status)}
              className="tag filter-tab-btn"
              style={{ padding: '4px 9px', backgroundColor: isActive ? colors.accent : 'transparent', color: isActive ? (theme === 'dark' ? '#080808' : '#ffffff') : colors.textSecondary, border: isActive ? 'none' : `1px solid ${colors.bgHover}`, fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', transition: 'all 0.15s ease', flexShrink: 0, lineHeight: '1.4', borderRadius: 10000 }}
            >
              {status}
            </button>
          )
        })}
      </div>

      {/* Project grid */}
      <div className="project-grid">
        {filtered && filtered.length > 0 ? (
          filtered.map((project) => {
            const clientObj = Array.isArray(project.clients) ? project.clients[0] : project.clients
            const clientName = clientObj?.brand_name || clientObj?.name
            const quickLinks = [
              project.live_url && { href: project.live_url, label: 'Live' },
              project.staging_url && { href: project.staging_url, label: 'Staging' },
              project.figma_url && { href: project.figma_url, label: 'Figma' },
              project.notion_url && { href: project.notion_url, label: 'Notion' },
            ].filter(Boolean) as { href: string; label: string }[]

            return (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                prefetch={true}
                style={{ textDecoration: 'none', display: 'block' }}
              >
                <div
                  style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}`, padding: '18px', cursor: 'pointer', transition: 'border-color 0.2s ease', height: '100%', display: 'flex', flexDirection: 'column', gap: '10px', boxSizing: 'border-box', borderRadius: 16, position: 'relative' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = colors.borderLight }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = colors.border }}
                >
                  {/* Status badge — top right */}
                  <span className="tag" style={{ position: 'absolute', top: '14px', right: '14px', display: 'inline-block', padding: '3px 10px', backgroundColor: statusColors[project.status?.toLowerCase()] || colors.textMuted, color: theme === 'dark' ? '#080808' : '#ffffff', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderRadius: 10000 }}>
                    {project.status}
                  </span>

                  {/* Client / project name */}
                  <div style={{ paddingRight: '90px' }}>
                    {clientName ? (
                      <>
                        <h2 style={{ fontSize: '22px', fontWeight: 800, color: colors.text, margin: '0 0 4px 0', lineHeight: 1.2, letterSpacing: '-0.3px', wordBreak: 'break-word', textTransform: 'uppercase' }}>
                          {clientName}
                        </h2>
                        <p style={{ fontSize: '11px', fontWeight: 600, color: colors.textMuted, margin: 0, textTransform: 'uppercase', letterSpacing: '0.4px', wordBreak: 'break-word' }}>
                          {project.name}
                        </p>
                      </>
                    ) : (
                      <h2 style={{ fontSize: '22px', fontWeight: 800, color: colors.text, margin: 0, lineHeight: 1.2, letterSpacing: '-0.3px', wordBreak: 'break-word', textTransform: 'uppercase' }}>
                        {project.name}
                      </h2>
                    )}
                  </div>

                  {/* Description */}
                  {project.description && (
                    <p style={{ color: colors.textSecondary, fontSize: '12px', lineHeight: '1.6', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1, wordBreak: 'break-word' }}>
                      {project.description}
                    </p>
                  )}

                  {/* Quick links */}
                  {quickLinks.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {quickLinks.map((link) => (
                        <QuickLink key={link.label} href={link.href} label={link.label} colors={colors} />
                      ))}
                    </div>
                  )}

                  {/* Footer: stats + date */}
                  <div style={{ paddingTop: '10px', borderTop: `1px solid ${colors.border}`, fontSize: '11px', color: colors.textMuted, marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {(project.project_members?.length ?? 0) > 0 && (
                        <span title="Team members">{project.project_members!.length} member{project.project_members!.length !== 1 ? 's' : ''}</span>
                      )}
                      {(project.notes?.length ?? 0) > 0 && (
                        <span title="Notes">{project.notes!.length} note{project.notes!.length !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                    <span>
                      {project.due_date
                        ? `Due ${new Date(project.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                        : project.start_date
                        ? `Started ${new Date(project.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                        : 'No dates set'}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })
        ) : (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: colors.textMuted }}>
            <p style={{ fontSize: '14px', margin: 0 }}>
              {activeFilter === 'All' ? 'No projects yet' : `No ${activeFilter} projects`}
            </p>
          </div>
        )}
      </div>

      {showCreateModal && <AddProjectModal onClose={() => setShowCreateModal(false)} />}
    </div>
  )
}
