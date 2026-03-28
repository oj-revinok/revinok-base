'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ── Fetch all projects (respects RLS — clients see only theirs) ──
export async function getProjects() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      clients ( id, name, brand_name ),
      project_members ( id, profile_id, role, profiles ( id, full_name, initials, avatar_url ) )
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// ── Fetch single project ──
export async function getProject(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      clients ( * ),
      project_members ( *, profiles ( * ) ),
      tasks ( *, profiles!tasks_assignee_id_fkey ( id, full_name, initials ) ),
      notes ( *, profiles!notes_author_id_fkey ( id, full_name, initials ) ),
      project_files ( * ),
      project_links ( * ),
      activity_log ( *, profiles!activity_log_actor_id_fkey ( id, full_name, initials ) )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

// ── Create project ──
export async function createProject(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const values = {
    name: formData.get('name') as string,
    description: formData.get('description') as string,
    client_id: (formData.get('client_id') as string) || null,
    status: (formData.get('status') as string) || 'discovery',
    start_date: (formData.get('start_date') as string) || null,
    due_date: (formData.get('due_date') as string) || null,
    budget: formData.get('budget') ? Number(formData.get('budget')) : null,
    notion_url: (formData.get('notion_url') as string) || null,
    figma_url: (formData.get('figma_url') as string) || null,
    staging_url: (formData.get('staging_url') as string) || null,
    live_url: (formData.get('live_url') as string) || null,
    created_by: user.id,
  }

  const { data, error } = await supabase.from('projects').insert(values).select().single()
  if (error) throw error

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: data.id,
    actor_id: user.id,
    activity_type: 'project_created',
    description: `Project "${values.name}" created`,
  })

  revalidatePath('/dashboard/projects')
  redirect(`/dashboard/projects/${data.id}`)
}

// ── Update project ──
export async function updateProject(id: string, updates: Record<string, unknown>) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('projects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error

  await supabase.from('activity_log').insert({
    project_id: id,
    actor_id: user.id,
    activity_type: 'project_updated',
    description: 'Project details updated',
    metadata: updates,
  })

  revalidatePath(`/dashboard/projects/${id}`)
}

// ── Update project status ──
export async function updateProjectStatus(id: string, status: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('projects')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error

  await supabase.from('activity_log').insert({
    project_id: id,
    actor_id: user.id,
    activity_type: 'status_changed',
    description: `Project status changed to ${status}`,
    metadata: { status },
  })

  revalidatePath(`/dashboard/projects/${id}`)
  revalidatePath('/dashboard/projects')
}
