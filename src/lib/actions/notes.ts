'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function addNote(projectId: string, content: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const trimmed = content.trim()
  if (!trimmed) throw new Error('Note content cannot be empty')

  const { error } = await supabase.from('notes').insert({
    project_id: projectId,
    content: trimmed,
    author_id: user.id,
  })

  if (error) throw error

  revalidatePath(`/dashboard/projects/${projectId}`)
}
