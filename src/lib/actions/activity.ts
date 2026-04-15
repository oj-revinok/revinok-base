'use server'
import { createClient } from '@/lib/supabase/server'

export async function logActivity(page?: string): Promise<void> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { count } = await supabase
      .from('user_activity_log')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', fiveMinAgo)
    if ((count ?? 0) > 0) return
    await supabase.from('user_activity_log').insert({
      user_id: user.id,
      event_type: 'page_view',
      page: page || '/dashboard',
    })
  } catch { /* non-critical */ }
}

export async function getTeamActivity(): Promise<Record<string, { created_at: string; page: string | null }[]>> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return {}
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin' && profile?.role !== 'project_manager') return {}
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('user_activity_log')
      .select('user_id, event_type, page, created_at')
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })
      .limit(1000)
    const grouped: Record<string, { created_at: string; page: string | null }[]> = {}
    for (const row of data ?? []) {
      if (!grouped[row.user_id]) grouped[row.user_id] = []
      grouped[row.user_id].push({ created_at: row.created_at, page: row.page })
    }
    return grouped
  } catch { return {} }
}