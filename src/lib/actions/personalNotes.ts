'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type PersonalNote = {
  id: string
  user_id: string
  title: string
  content: string
  created_at: string
  updated_at: string
  owner?: { full_name: string | null; email: string }
  shares?: PersonalNoteShare[]
}

export type PersonalNoteShare = {
  id: string
  note_id: string
  shared_with_id: string
  access_level: 'view' | 'edit'
  created_at: string
  profile?: { full_name: string | null; email: string }
}

export type SharedPersonalNote = PersonalNote & { access_level: 'view' | 'edit' }

export async function getMyPersonalNotes(): Promise<PersonalNote[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('personal_notes')
    .select('*, shares:personal_note_shares(id, note_id, shared_with_id, access_level, created_at, profile:profiles(full_name, email))')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) { console.error('getMyPersonalNotes:', error); return [] }
  return (data || []) as PersonalNote[]
}

export async function getSharedPersonalNotes(): Promise<SharedPersonalNote[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('personal_note_shares')
    .select('access_level, note:personal_notes(*, owner:profiles!personal_notes_user_id_fkey(full_name, email))')
    .eq('shared_with_id', user.id)
    .order('created_at', { ascending: false })

  if (error) { console.error('getSharedPersonalNotes:', error); return [] }

  return (data || []).map((row: any) => ({
    ...row.note,
    access_level: row.access_level,
  })) as SharedPersonalNote[]
}

export async function createPersonalNote(title: string, content: string): Promise<PersonalNote | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('personal_notes')
    .insert({
      user_id: user.id,
      title: title.trim() || 'Untitled',
      content,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single()

  if (error) { console.error('createPersonalNote:', error); return null }
  revalidatePath('/dashboard/notes')
  return data as PersonalNote
}

export async function updatePersonalNote(id: string, title: string, content: string): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('personal_notes')
    .update({ title: title.trim() || 'Untitled', content, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) { console.error('updatePersonalNote:', error); return false }
  revalidatePath('/dashboard/notes')
  return true
}

export async function updateSharedPersonalNote(id: string, title: string, content: string): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: share } = await supabase
    .from('personal_note_shares')
    .select('id')
    .eq('note_id', id)
    .eq('shared_with_id', user.id)
    .eq('access_level', 'edit')
    .single()

  if (!share) return false

  const { error } = await supabase
    .from('personal_notes')
    .update({ title: title.trim() || 'Untitled', content, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) { console.error('updateSharedPersonalNote:', error); return false }
  revalidatePath('/dashboard/notes')
  return true
}

export async function deletePersonalNote(id: string): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('personal_notes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) { console.error('deletePersonalNote:', error); return false }
  revalidatePath('/dashboard/notes')
  return true
}

export async function sharePersonalNote(
  noteId: string,
  sharedWithId: string,
  accessLevel: 'view' | 'edit'
): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: note } = await supabase
    .from('personal_notes')
    .select('id, title')
    .eq('id', noteId)
    .eq('user_id', user.id)
    .single()

  if (!note) return false

  const { error } = await supabase
    .from('personal_note_shares')
    .upsert(
      { note_id: noteId, shared_with_id: sharedWithId, access_level: accessLevel },
      { onConflict: 'note_id,shared_with_id' }
    )

  if (error) { console.error('sharePersonalNote:', error); return false }

  const { data: sharerProfile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  await supabase.from('notifications').insert({
    recipient_id: sharedWithId,
    sender_id: user.id,
    type: 'note_shared',
    is_read: false,
    data: {
      note_id: noteId,
      note_title: note.title,
      shared_by_name: sharerProfile?.full_name || sharerProfile?.email || 'Someone',
      access_level: accessLevel,
    },
  })

  revalidatePath('/dashboard/notes')
  return true
}

export async function updatePersonalNoteShareAccess(
  shareId: string,
  noteId: string,
  accessLevel: 'view' | 'edit'
): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('personal_note_shares')
    .update({ access_level: accessLevel })
    .eq('id', shareId)
    .eq('note_id', noteId)

  if (error) { console.error('updatePersonalNoteShareAccess:', error); return false }
  revalidatePath('/dashboard/notes')
  return true
}

export async function removePersonalNoteShare(shareId: string, noteId: string): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('personal_note_shares')
    .delete()
    .eq('id', shareId)
    .eq('note_id', noteId)

  if (error) { console.error('removePersonalNoteShare:', error); return false }
  revalidatePath('/dashboard/notes')
  return true
}

export async function getShareableMembers(): Promise<{ id: string; full_name: string | null; email: string; role: string }[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .neq('id', user.id)
    .order('full_name', { ascending: true })

  if (error) { console.error('getShareableMembers:', error); return [] }
  return (data || []) as { id: string; full_name: string | null; email: string; role: string }[]
}
