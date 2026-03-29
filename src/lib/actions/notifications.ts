'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export interface Notification {
  id: string
  recipient_id: string
  sender_id: string | null
  type: string
  project_id: string | null
  data: Record<string, any>
  is_read: boolean
  created_at: string
  sender?: { full_name: string | null; email: string } | null
  project?: { name: string } | null
}

export async function getMyNotifications(): Promise<Notification[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('notifications')
    .select('*, sender:profiles!notifications_sender_id_fkey(full_name, email), project:projects(name)')
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (data || []) as Notification[]
}

export async function getUnreadCount(): Promise<number> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', user.id)
    .eq('is_read', false)

  return count ?? 0
}

export async function markAllRead(): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', user.id)
    .eq('is_read', false)

  revalidatePath('/dashboard/notifications')
}

export async function markRead(notificationId: string): Promise<void> {
  const supabase = createClient()
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
  revalidatePath('/dashboard/notifications')
}

// ── Launch Review Actions ────────────────────────────────────────────────────

export async function sendLaunchForReview(
  projectId: string,
  projectName: string,
  reviewerId: string,
  checklistData: object,
  submitterName: string
): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Create launch_review record
  const { data: review, error: reviewError } = await supabase
    .from('launch_reviews')
    .insert({
      project_id: projectId,
      submitted_by: user.id,
      reviewer_id: reviewerId,
      status: 'pending',
      checklist_data: checklistData,
    })
    .select('id')
    .single()

  if (reviewError) throw new Error(reviewError.message)

  // Create notification for the reviewer
  const { error: notifError } = await supabase
    .from('notifications')
    .insert({
      recipient_id: reviewerId,
      sender_id: user.id,
      type: 'launch_review_request',
      project_id: projectId,
      data: {
        review_id: review.id,
        project_name: projectName,
        submitted_by_name: submitterName,
      },
    })

  if (notifError) throw new Error(notifError.message)

  revalidatePath('/dashboard/notifications')
  return review.id
}

export async function getLaunchReview(reviewId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('launch_reviews')
    .select('*, submitter:profiles!launch_reviews_submitted_by_fkey(full_name, email), project:projects(name)')
    .eq('id', reviewId)
    .single()
  return data
}

export async function approveLaunchReview(reviewId: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: review } = await supabase
    .from('launch_reviews')
    .select('*, project:projects(name)')
    .eq('id', reviewId)
    .single()

  if (!review) throw new Error('Review not found')

  // Update review status
  await supabase
    .from('launch_reviews')
    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', reviewId)

  // Save checklist to project files
  const checklistJson = JSON.stringify(review.checklist_data, null, 2)
  const projectName = review.project?.name || 'Project'
  const fileName = `Go-Live Checklist — ${projectName} — ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}.json`

  await supabase.from('project_files').insert({
    project_id: review.project_id,
    name: fileName,
    url: `data:application/json;base64,${Buffer.from(checklistJson).toString('base64')}`,
    storage_path: `checklists/${review.project_id}/${Date.now()}.json`,
    file_type: 'application/json',
    size_bytes: checklistJson.length,
    is_launch_checklist: true,
    uploaded_by: user.id,
  })

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: review.project_id,
    actor_id: user.id,
    activity_type: 'launch',
    description: `Go-Live checklist approved and saved for ${projectName}`,
  }).catch(() => {})

  // Notify submitter of approval
  if (review.submitted_by) {
    const { data: reviewer } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    await supabase.from('notifications').insert({
      recipient_id: review.submitted_by,
      sender_id: user.id,
      type: 'launch_approved',
      project_id: review.project_id,
      data: {
        review_id: reviewId,
        project_name: projectName,
        reviewer_name: reviewer?.full_name || reviewer?.email || 'Reviewer',
      },
    })
  }

  revalidatePath('/dashboard/notifications')
  revalidatePath(`/dashboard/projects/${review.project_id}`)
}

export async function declineLaunchReview(reviewId: string, message: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: review } = await supabase
    .from('launch_reviews')
    .select('*, project:projects(name)')
    .eq('id', reviewId)
    .single()

  if (!review) throw new Error('Review not found')

  // Update review status
  await supabase
    .from('launch_reviews')
    .update({
      status: 'declined',
      decline_message: message,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', reviewId)

  // Notify submitter of decline
  if (review.submitted_by) {
    const { data: reviewer } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    await supabase.from('notifications').insert({
      recipient_id: review.submitted_by,
      sender_id: user.id,
      type: 'launch_declined',
      project_id: review.project_id,
      data: {
        review_id: reviewId,
        project_name: review.project?.name || 'Project',
        reviewer_name: reviewer?.full_name || reviewer?.email || 'Reviewer',
        message,
      },
    })
  }

  revalidatePath('/dashboard/notifications')
}
