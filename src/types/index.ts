export type Role = 'admin' | 'project_manager' | 'designer' | 'developer' | 'designer_dev' | 'viewer' | 'client'

export type ProjectStatus = 'Designing' | 'Developing' | 'Reviewing' | 'Live'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: Role
  avatar_initials: string
  notion_person_id?: string | null
  created_at: string
}

export interface Project {
  id: string
  name: string
  client_name: string
  description: string
  status: ProjectStatus
  staging_url: string | null
  live_url: string | null
  drive_url: string | null
  notion_id: string | null
  start_date: string | null
  target_date: string | null
  launched_at: string | null
  created_at: string
  created_by: string
}

export interface ProjectMember {
  project_id: string
  user_id: string
  profile?: Profile
}

export interface Client {
  id: string
  full_name: string
  company: string
  email: string
  role_title: string
  status: 'active' | 'invited' | 'inactive'
  user_id: string | null
  created_at: string
}

export interface ClientProject {
  client_id: string
  project_id: string
  project?: Project
}

export interface Note {
  id: string
  project_id: string
  content: string
  created_by: string
  created_at: string
  author?: Profile
}

export interface ProjectFile {
  id: string
  project_id: string
  name: string
  size: number
  type: string
  url: string
  created_by: string
  created_at: string
  uploader?: Profile
  is_launch_checklist?: boolean
  protected?: boolean
}

export interface ProjectLink {
  id: string
  project_id: string
  title: string
  url: string
  created_by: string
  created_at: string
}

export interface ActivityLog {
  id: string
  project_id: string
  type: 'create' | 'status' | 'launch' | 'update' | 'note' | 'file' | 'link'
  description: string
  created_by: string
  created_at: string
  author?: Profile
}

// Role helpers
export function canCreateProjects(role: Role): boolean {
  return role === 'admin' || role === 'project_manager'
}

export function canDeleteContent(role: Role): boolean {
  return role === 'admin' || role === 'project_manager'
}

export function canManageTeam(role: Role): boolean {
  return role === 'admin' || role === 'project_manager'
}

export function isDevRole(role: Role): boolean {
  return role === 'developer' || role === 'designer_dev'
}

export function isDesignerRole(role: Role): boolean {
  return role === 'designer' || role === 'designer_dev'
}

export function isAdminOrPM(role: Role): boolean {
  return role === 'admin' || role === 'project_manager'
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  project_manager: 'Project Manager',
  designer: 'Designer',
  developer: 'Developer',
  designer_dev: 'Designer / Dev',
  viewer: 'Viewer',
  client: 'Client',
}
