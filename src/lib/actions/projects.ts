'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ── Fetch all projects (admin/PM see all; others see only their assigned projects) ──
export async function getProjects() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role
  const isAdminOrPM = role === 'admin' || role === 'project_manager'

  if (isAdminOrPM) {
    // See all projects
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
  } else {
    // See only projects they're a member of
    const { data: memberships } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('profile_id', user.id)

    const projectIds = (memberships || []).map((m: any) => m.project_id)

    if (projectIds.length === 0) return []

    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        clients ( id, name, brand_name ),
        project_members ( id, profile_id, role, profiles ( id, full_name, initials, avatar_url ) )
      `)
      .in('id', projectIds)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }
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

// ── Create project (admin/PM only — enforced in UI and here) ──
export async function createProject(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Role check
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'project_manager') {
    throw new Error('Only admins and project managers can create projects')
  }

  const values = {
    name: formData.get('name') as string,
    description: formData.get('description') as string,
    client_id: (formData.get('client_id') as string) || null,
    status: (formData.get('status') as string) || 'discovery',
    start_date: (formData.get('start_date') as string) || null,
    due_date: (formData.get('due_date') as string) || null,
    budget: formData.get('budget') ? Number(formData.get('budget')) : null,
    notion_url: (formData.get('notion_url') as string) || null,
    notion_project_id: (formData.get('notion_project_id') as string) || null,
    figma_url: (formData.get('figma_url') as string) || null,
    staging_url: (formData.get('staging_url') as string) || null,
    live_url: (formData.get('live_url') as string) || null,
    created_by: user.id,
  }

  const { data, error } = await supabase.from('projects').insert(values).select().single()
  if (error) throw error

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

// ── Get project members ──
export async function getProjectMembers(projectId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('project_members')
    .select('*, profiles ( id, full_name, email, role, initials, avatar_url )')
    .eq('project_id', projectId)

  if (error) throw error
  return data || []
}

// ── Get all team members (for sharing modal) ──
export async function getShareableTeamMembers() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, initials, avatar_url')
    .not('role', 'in', '("admin","project_manager","client")')
    .order('full_name')

  if (error) throw error
  return data || []
}

// ── Add member to project ──
export async function addProjectMember(projectId: string, profileId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Role check: only admin/PM can share
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'project_manager') {
    throw new Error('Only admins and project managers can share projects')
  }

  // Check not already a member
  const { data: existing } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('profile_id', profileId)
    .maybeSingle()

  if (existing) return { success: true, alreadyExists: true }

  const { error } = await supabase.from('project_members').insert({
    project_id: projectId,
    profile_id: profileId,
  })

  if (error) throw error

  // Fetch project name + added profile name for notification
  const [{ data: addedProfile }, { data: projectData }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', profileId).single(),
    supabase.from('projects').select('name').eq('id', projectId).single(),
  ])

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: projectId,
    actor_id: user.id,
    activity_type: 'member_added',
    description: `${addedProfile?.full_name || 'Team member'} added to project`,
  })

  // Notify the added person
  await supabase.from('notifications').insert({
    recipient_id: profileId,
    sender_id: user.id,
    type: 'project_added',
    project_id: projectId,
    data: {
      project_name: projectData?.name || 'a project',
    },
  })

  revalidatePath(`/dashboard/projects/${projectId}`)
  return { success: true }
}

// ── Remove member from project ──
export async function removeProjectMember(projectId: string, profileId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Role check
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'project_manager') {
    throw new Error('Only admins and project managers can manage project members')
  }

  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('profile_id', profileId)

  if (error) throw error

  revalidatePath(`/dashboard/projects/${projectId}`)
  return { success: true }
}

// ── Save launch checklist to project files ──
export async function saveLaunchChecklistToFiles(
  projectId: string,
  checklistJson: string,
  projectName: string
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const fileName = `Go-Live Checklist — ${projectName} — ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}.json`

  // Upload JSON to Supabase storage so it has a real public URL
  const storagePath = `checklists/${projectId}/${Date.now()}.json`
  const buffer = Buffer.from(checklistJson, 'utf-8')
  const { error: storageError } = await supabase.storage
    .from('project-files')
    .upload(storagePath, buffer, { contentType: 'application/json' })

  if (storageError) throw new Error(storageError.message)

  const { data: { publicUrl } } = supabase.storage.from('project-files').getPublicUrl(storagePath)

  const { error } = await supabase.from('project_files').insert({
    project_id: projectId,
    name: fileName,
    url: publicUrl,
    storage_path: storagePath,
    file_type: 'application/json',
    size_bytes: checklistJson.length,
    is_launch_checklist: true,
    uploaded_by: user.id,
  })

  if (error) throw error

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: projectId,
    actor_id: user.id,
    activity_type: 'launch',
    description: 'Webflow Go-Live checklist completed and saved to project files',
  })

  revalidatePath(`/dashboard/projects/${projectId}`)
  return { success: true, fileName }
}

// ── Delete a project file (admin/PM only) ──
export async function deleteProjectFile(fileId: string, projectId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Role check
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'project_manager') {
    throw new Error('Only admins and project managers can delete files')
  }

  const { error } = await supabase.from('project_files').delete().eq('id', fileId)
  if (error) throw error

  revalidatePath(`/dashboard/projects/${projectId}`)
  return { success: true }
}

// ── Delete a note (admin/PM only) ──
export async function deleteNote(noteId: string, projectId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'project_manager') {
    throw new Error('Only admins and project managers can delete notes')
  }

  const { error } = await supabase.from('notes').delete().eq('id', noteId)
  if (error) throw error

  revalidatePath(`/dashboard/projects/${projectId}`)
  return { success: true }
}
