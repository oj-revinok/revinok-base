'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getNotionClient, getNotionTeamPersons, type NotionTeamPerson } from '@/lib/notion'
export type { NotionTeamPerson }
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export interface NotionPerson {
  id: string
  name: string
  email: string | null
}

async function getAdminNotionKey(): Promise<string | undefined> {
  const supabase = createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('notion_api_key')
    .eq('role', 'admin')
    .limit(1)
    .single()
  return profile?.notion_api_key || undefined
}

export async function getNotionPersons(): Promise<NotionPerson[]> {
  const key = await getAdminNotionKey()
  const notion = getNotionClient(key)
  if (!notion) return []

  try {
    const response = await notion.users.list({ page_size: 100 })
    return response.results
      .filter((u: any) => u.type === 'person')
      .map((u: any) => ({
        id: u.id,
        name: u.name || u.person?.email || u.id,
        email: u.person?.email || null,
      }))
  } catch {
    return []
  }
}

// Fetch persons from Notion Team Database (not just workspace users)
// These IDs match the relation IDs used in the 🎨 Assigned to field in Workload
export async function getNotionTeamPersonsFromDB(): Promise<NotionTeamPerson[]> {
  const key = await getAdminNotionKey()
  return getNotionTeamPersons(key)
}

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

export async function updateMemberNotionId(profileId: string, notionPersonId: string | null) {
  const supabase = createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ notion_person_id: notionPersonId || null } as never)
    .eq('id', profileId)

  if (error) throw error
  revalidatePath('/dashboard/team')
}

export async function inviteMember(formData: FormData) {
  const supabase = createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const role = formData.get('role') as string
  const fullName = (formData.get('full_name') as string)?.trim() || null
  const notionPersonId = (formData.get('notion_person_id') as string)?.trim() || null

  if (!email || !role) {
    throw new Error('Email and role are required')
  }

  // Check if user already exists
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', email)
    .maybeSingle()

  if (existingProfile) {
    throw new Error('A team member with this email already exists')
  }

  // Send invite via Supabase Auth Admin API (uses service role)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://revinok-base.netlify.app'

  const { data: inviteData, error: authError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      role,
      full_name: fullName,
      invited_by: user.id,
    },
    redirectTo: `${siteUrl}/auth/callback?next=/dashboard`,
  })

  if (authError) {
    // Surface a clear, actionable message for common misconfigurations
    const msg = authError.message || ''
    if (msg.includes('service role') || msg.includes('service_role') || msg.toLowerCase().includes('unauthorized') || authError.status === 401 || authError.status === 503) {
      throw new Error('Invite failed: the SUPABASE_SERVICE_ROLE_KEY environment variable is missing or incorrect. Add it in your Netlify site settings under Environment Variables, then redeploy.')
    }
    throw new Error(`Failed to send invite: ${authError.message}`)
  }

  // Store invitation record
  await supabase
    .from('invitations')
    .insert({
      email,
      role,
      invited_by: user.id,
    })
    .select()
    .maybeSingle()

  // Pre-set the role in profiles (the trigger creates the profile on signup)
  // If the user was already created (invite creates auth user immediately), update their profile
  if (inviteData?.user?.id) {
    await admin
      .from('profiles')
      .update({ role, full_name: fullName, email, notion_person_id: notionPersonId } as never)
      .eq('id', inviteData.user.id)
  }

  revalidatePath('/dashboard/team')
  return { success: true, email }
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

// ── Password management (admin only) ─────────────────────────────────────

export async function resetMemberPassword(
  memberId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Verify caller is admin
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerProfile?.role !== 'admin') return { success: false, error: 'Unauthorized' }

  if (newPassword.length < 8) return { success: false, error: 'Password must be at least 8 characters' }

  try {
    const adminClient = createAdminClient()
    const { error } = await adminClient.auth.admin.updateUserById(memberId, { password: newPassword })
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to reset password' }
  }
}

export async function generatePassword(name: string): Promise<string> {
  const base = name.replace(/\s+/g, '').replace(/[^a-zA-Z]/g, '')
  const cap = base.charAt(0).toUpperCase() + base.slice(1).toLowerCase()
  const year = new Date().getFullYear()
  const specials = ['!', '@', '#', '$']
  const special = specials[Math.floor(Math.random() * specials.length)]
  return `${cap}${year}${special}`
}
