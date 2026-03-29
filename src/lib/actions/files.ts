'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const BUCKET = 'project-files'

export async function uploadFile(formData: FormData) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const file = formData.get('file') as File
  const projectId = formData.get('projectId') as string

  if (!file || !projectId) throw new Error('Missing file or projectId')

  const MAX_BYTES = 50 * 1024 * 1024
  if (file.size > MAX_BYTES) throw new Error('File too large. Max size is 50 MB.')

  const ext = file.name.split('.').pop()
  const path = `${projectId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type })

  if (storageError) throw new Error(storageError.message)

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path)

  const { error: dbError } = await supabase.from('project_files').insert({
    project_id: projectId,
    name: file.name,
    url: publicUrl,
    storage_path: path,
    size_bytes: file.size,
    file_type: file.type,
    uploaded_by: user.id,
  })

  if (dbError) {
    // Clean up the uploaded file if DB insert fails
    await supabase.storage.from(BUCKET).remove([path])
    throw new Error(dbError.message)
  }

  revalidatePath(`/dashboard/projects/${projectId}`)

  return { publicUrl, path, name: file.name, size: file.size, type: file.type }
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
