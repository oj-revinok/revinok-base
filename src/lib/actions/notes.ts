'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function addNote(projectId: string, content: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const trimmed = content.trim()
  if (!trimmed) throw new Error('Note content cannot be empty')

  const { data: note, error } = await supabase
    .from('notes')
    .insert({ project_id: projectId, content: trimmed, author_id: user.id })
    .select('*, profiles!notes_author_id_fkey(full_name)')
    .single()

  if (error) throw error

  revalidatePath(`/dashboard/projects/${projectId}`)
  return note
}

export async function deleteNote(noteId: string, projectId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase.from('notes').delete().eq('id', noteId)
  if (error) throw error

  revalidatePath(`/dashboard/projects/${projectId}`)
}
