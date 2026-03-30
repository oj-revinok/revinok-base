'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Profile } from '@/types'

export interface Group {
  id: string
  name: string
  created_by: string | null
  created_at: string
  members?: Profile[]
}

export async function getGroups(): Promise<Group[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('groups')
    .select('*, group_members(profile:profiles(id, email, full_name, role, created_at))')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getGroups:', error)
    return []
  }

  return (data || []).map((group: any) => ({
    id: group.id,
    name: group.name,
    created_by: group.created_by,
    created_at: group.created_at,
    members: (group.group_members || []).map((m: any) => m.profile).filter(Boolean),
  })) as Group[]
}

export async function createGroup(name: string, memberIds: string[]): Promise<Group | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Check if user is admin or PM
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'project_manager')) {
    return null
  }

  const now = new Date().toISOString()
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({
      name: name.trim(),
      created_by: user.id,
      created_at: now,
    })
    .select()
    .single()

  if (groupError || !group) {
    console.error('createGroup:', groupError)
    return null
  }

  // Insert members
  if (memberIds.length > 0) {
    const memberRecords = memberIds.map((memberId) => ({
      group_id: group.id,
      user_id: memberId,
    }))

    const { error: membersError } = await supabase
      .from('group_members')
      .insert(memberRecords)

    if (membersError) {
      console.error('createGroup - insert members:', membersError)
    }
  }

  revalidatePath('/dashboard/team')
  return {
    id: group.id,
    name: group.name,
    created_by: group.created_by,
    created_at: group.created_at,
    members: [],
  }
}

export async function updateGroup(groupId: string, name: string, memberIds: string[]): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  // Check if user is admin or PM
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'project_manager')) {
    return false
  }

  // Update group name
  const { error: updateError } = await supabase
    .from('groups')
    .update({ name: name.trim() })
    .eq('id', groupId)

  if (updateError) {
    console.error('updateGroup:', updateError)
    return false
  }

  // Delete all existing members
  const { error: deleteError } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)

  if (deleteError) {
    console.error('updateGroup - delete members:', deleteError)
  }

  // Insert new members
  if (memberIds.length > 0) {
    const memberRecords = memberIds.map((memberId) => ({
      group_id: groupId,
      user_id: memberId,
    }))

    const { error: insertError } = await supabase
      .from('group_members')
      .insert(memberRecords)

    if (insertError) {
      console.error('updateGroup - insert members:', insertError)
    }
  }

  revalidatePath('/dashboard/team')
  return true
}

export async function deleteGroup(groupId: string): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  // Check if user is admin or PM
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'project_manager')) {
    return false
  }

  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', groupId)

  if (error) {
    console.error('deleteGroup:', error)
    return false
  }

  revalidatePath('/dashboard/team')
  return true
}

export async function getGroupMembers(groupId: string): Promise<Profile[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('group_members')
    .select('profile:profiles(id, email, full_name, role, created_at)')
    .eq('group_id', groupId)

  if (error) {
    console.error('getGroupMembers:', error)
    return []
  }

  return (data || []).map((m: any) => m.profile).filter(Boolean) as Profile[]
}
