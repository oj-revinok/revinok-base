'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function getTeamMembers() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name')

  if (error) throw error
  return data
}

export async function updateMemberRole(profileId: string, role: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', profileId)

  if (error) throw error
  revalidatePath('/dashboard/team')
}

export async function inviteMember(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const email = formData.get('email') as string
  const role = formData.get('role') as string
  const projectId = (formData.get('project_id') as string) || null

  // Create invitation record
  const { data: invite, error: inviteError } = await supabase
    .from('invitations')
    .insert({ email, role, invited_by: user.id, project_id: projectId })
    .select()
    .single()

  if (inviteError) throw inviteError

  // Send invite via Supabase Auth (magic link / invite)
  const { error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { role, invited_by: user.id },
  })

  if (authError) throw authError

  revalidatePath('/dashboard/team')
  return invite
}

export async function getClients() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clients')
    .select(`*, projects ( id, name, status )`)
    .order('name')

  if (error) throw error
  return data
}

export async function createClient_action(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const values = {
    name: formData.get('name') as string,
    brand_name: (formData.get('brand_name') as string) || null,
    email: (formData.get('email') as string) || null,
    phone: (formData.get('phone') as string) || null,
    website: (formData.get('website') as string) || null,
    industry: (formData.get('industry') as string) || null,
    notes: (formData.get('notes') as string) || null,
    created_by: user.id,
  }

  const { data, error } = await supabase.from('clients').insert(values).select().single()
  if (error) throw error

  revalidatePath('/dashboard/clients')
  redirect(`/dashboard/clients/${data.id}`)
}
