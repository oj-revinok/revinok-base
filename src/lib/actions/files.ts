'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const BUCKET = 'project-files'

export async function saveFileRecord(
  projectId: string,
  fileName: string,
  storagePath: string,
  fileSize: number,
  mimeType: string,
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)

  const { error } = await supabase.from('project_files').insert({
    project_id: projectId,
    name: fileName,
    url: publicUrl,
    storage_path: storagePath,
    size: fileSize,
    type: mimeType,
    uploaded_by: user.id,
  })

  if (error) throw error

  revalidatePath(`/dashboard/projects/${projectId}`)
}

export async function deleteFile(projectId: string, fileId: string, storagePath: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Delete from storage (ignore errors — file may already be gone)
  await supabase.storage.from(BUCKET).remove([storagePath])

  // Delete DB record
  const { error } = await supabase.from('project_files').delete().eq('id', fileId)
  if (error) throw error

  revalidatePath(`/dashboard/projects/${projectId}`)
}
