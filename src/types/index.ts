export type Role = 'admin' | 'project_manager' | 'designer_dev' | 'viewer' | 'client'

export type ProjectStatus = 'Designing' | 'Developing' | 'Reviewing' | 'Live'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: Role
  avatar_initials: string
  created_at: string
}

export interface Project {
  id: string
  name: string           // what we do: "Website Redesign"
  client_name: string    // brand: "Paragon Capital Group"
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
  user_id: string | null  // linked Supabase auth user
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
