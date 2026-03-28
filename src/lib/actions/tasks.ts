'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createTask(projectId: string, formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const values = {
    project_id: projectId,
    title: formData.get('title') as string,
    description: (formData.get('description') as string) || null,
    status: 'todo' as const,
    priority: (formData.get('priority') as string) || 'medium',
    assignee_id: (formData.get('assignee_id') as string) || null,
    due_date: (formData.get('due_date') as string) || null,
    created_by: user.id,
  }

  const { data, error } = await supabase.from('tasks').insert(values).select().single()
  if (error) throw error

  await supabase.from('activity_log').insert({
    project_id: projectId,
    actor_id: user.id,
    activity_type: 'task_added',
    description: `Task "${values.title}" added`,
  })

  revalidatePath(`/dashboard/projects/${projectId}`)
  return data
}

export async function updateTaskStatus(taskId: string, status: string, projectId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: task } = await supabase.from('tasks').select('title').eq('id', taskId).single()

  const { error } = await supabase
    .from('tasks')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', taskId)

  if (error) throw error

  if (status === 'done') {
    await supabase.from('activity_log').insert({
      project_id: projectId,
      actor_id: user.id,
      activity_type: 'task_completed',
      description: `Task "${task?.title}" completed`,
    })
  } else {
    await supabase.from('activity_log').insert({
      project_id: projectId,
      actor_id: user.id,
      activity_type: 'task_updated',
      description: `Task "${task?.title}" moved to ${status}`,
    })
  }

  revalidatePath(`/dashboard/projects/${projectId}`)
}

export async function deleteTask(taskId: string, projectId: string) {
  const supabase = createClient()
  const { error } = await supabase.from('tasks').delete().eq('id', taskId)
  if (error) throw error
  revalidatePath(`/dashboard/projects/${projectId}`)
}
