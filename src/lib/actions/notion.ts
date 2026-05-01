'use server'
import { unstable_cache, revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getTasksForProject, getNotionProjectsPage, getAllTasks, getNotionTeamPersons, NotionTask, getNotionClient } from '@/lib/notion'

// Hard ceiling on any Notion API call. Without this, a slow Notion can
// hang the request long enough that the user sees a blank page.
const NOTION_TIMEOUT_MS = 8000

function withTimeout<T>(p: Promise<T>, ms: number, label = 'Notion'): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)
    ),
  ])
}

const getCachedAllTasks = unstable_cache(
  async (notionKey: string | undefined, personId: string | null) => getAllTasks(notionKey, personId),
  ['notion-all-tasks'],
  { revalidate: 900 }
)

const getCachedTeamPersons = unstable_cache(
  async (notionKey: string | undefined) => getNotionTeamPersons(notionKey),
  ['notion-team-persons'],
  { revalidate: 900 }
)

// Enrich tasks with assignee names — Team DB first, Supabase profiles as fallback
async function enrichTasksWithNames(tasks: NotionTask[], notionKey?: string): Promise<NotionTask[]> {
  if (tasks.length === 0) return tasks
  const hasAssignees = tasks.some(t => t.assignedTo.length > 0)
  if (!hasAssignees) return tasks
  try {
    const teamPersons = await getCachedTeamPersons(notionKey)
    const nameMap = new Map(teamPersons.map(p => [p.id, p.name]))

    // Fallback: resolve remaining IDs from Supabase profiles.notion_person_id
    const supabase = createClient()
    const { data: profiles } = await supabase
      .from('profiles')
      .select('notion_person_id, full_name')
      .not('notion_person_id', 'is', null)
    if (profiles) {
      profiles.forEach(p => {
        if (p.notion_person_id && p.full_name && !nameMap.has(p.notion_person_id)) {
          nameMap.set(p.notion_person_id, p.full_name)
        }
      })
    }

    return tasks.map(t => ({
      ...t,
      // Never fall back to raw UUIDs — unresolved IDs are dropped silently
      assignedNames: t.assignedTo
        .map(id => nameMap.get(id) ?? null)
        .filter((n): n is string => n !== null),
    }))
  } catch {
    return tasks
  }
}

// ── Persistent fallback cache (notion_tasks_cache + notion_sync_meta) ──────
//
// Pattern: write-through. Live Notion calls are wrapped in a timeout. On
// success we update the cache and return live data. On failure we return
// whatever is in the cache so the UI never goes empty when Notion is slow.

interface CacheRow {
  id: string
  name: string
  status: string
  priority: string | null
  due_date: string | null
  assigned_to: string[]
  tags: string[]
  project_notion_ids: string[]
  notion_url: string
  synced_at: string
}

function cacheRowToTask(row: CacheRow): NotionTask {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    assignedTo: row.assigned_to ?? [],
    assignedNames: [],
    tags: row.tags ?? [],
    notionUrl: row.notion_url,
    projectIds: row.project_notion_ids ?? [],
  }
}

function taskToCacheRow(t: NotionTask): CacheRow {
  return {
    id: t.id,
    name: t.name,
    status: t.status,
    priority: t.priority,
    due_date: t.dueDate,
    assigned_to: t.assignedTo,
    tags: t.tags,
    project_notion_ids: t.projectIds,
    notion_url: t.notionUrl,
    synced_at: new Date().toISOString(),
  }
}

async function bumpLastSync(): Promise<void> {
  try {
    const supabase = createClient()
    await supabase
      .from('notion_sync_meta')
      .update({ last_synced_at: new Date().toISOString(), last_error_message: null })
      .eq('id', 1)
  } catch {}
}

// Replace the entire cache with the current full task set. Used when the
// admin/PM (who sees everything) successfully fetches from Notion.
async function replaceAllTasksInCache(tasks: NotionTask[]): Promise<void> {
  try {
    const supabase = createClient()
    if (tasks.length > 0) {
      const rows = tasks.map(taskToCacheRow)
      const { error: upsertErr } = await supabase
        .from('notion_tasks_cache')
        .upsert(rows, { onConflict: 'id' })
      if (upsertErr) throw upsertErr
      // Drop rows not in current set so deletions in Notion propagate.
      const ids = tasks.map(t => t.id)
      const idList = `(${ids.map(i => `"${i}"`).join(',')})`
      await supabase.from('notion_tasks_cache').delete().not('id', 'in', idList)
    } else {
      // Empty result is still a successful sync — wipe the cache.
      await supabase.from('notion_tasks_cache').delete().neq('id', '__never__')
    }
    await bumpLastSync()
  } catch (err) {
    console.error('replaceAllTasksInCache error:', err)
  }
}

// Upsert a partial slice (e.g. one user's tasks) without deleting other rows.
async function upsertPartialTasksInCache(tasks: NotionTask[]): Promise<void> {
  if (tasks.length === 0) return
  try {
    const supabase = createClient()
    const rows = tasks.map(taskToCacheRow)
    await supabase.from('notion_tasks_cache').upsert(rows, { onConflict: 'id' })
    await bumpLastSync()
  } catch (err) {
    console.error('upsertPartialTasksInCache error:', err)
  }
}

// Replace cache for a single project (used by project detail page).
async function replaceProjectTasksInCache(projectNotionId: string, tasks: NotionTask[]): Promise<void> {
  try {
    const supabase = createClient()
    if (tasks.length > 0) {
      const rows = tasks.map(taskToCacheRow)
      const { error: upsertErr } = await supabase
        .from('notion_tasks_cache')
        .upsert(rows, { onConflict: 'id' })
      if (upsertErr) throw upsertErr
    }
    // Drop cached rows for this project that aren't in the new set.
    const keepIds = tasks.map(t => t.id)
    let q = supabase
      .from('notion_tasks_cache')
      .delete()
      .contains('project_notion_ids', [projectNotionId])
    if (keepIds.length > 0) {
      const idList = `(${keepIds.map(i => `"${i}"`).join(',')})`
      q = q.not('id', 'in', idList)
    }
    await q
    await bumpLastSync()
  } catch (err) {
    console.error('replaceProjectTasksInCache error:', err)
  }
}

async function loadAllTasksFromCache(personId?: string | null): Promise<NotionTask[]> {
  try {
    const supabase = createClient()
    let q = supabase.from('notion_tasks_cache').select('*')
    if (personId) {
      q = q.contains('assigned_to', [personId])
    }
    const { data, error } = await q
    if (error || !data) return []
    return (data as CacheRow[]).map(cacheRowToTask)
  } catch {
    return []
  }
}

async function loadProjectTasksFromCache(projectNotionId: string): Promise<NotionTask[]> {
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from('notion_tasks_cache')
      .select('*')
      .contains('project_notion_ids', [projectNotionId])
    if (!data) return []
    return (data as CacheRow[]).map(cacheRowToTask)
  } catch {
    return []
  }
}

async function recordNotionError(message: string): Promise<void> {
  try {
    const supabase = createClient()
    await supabase
      .from('notion_sync_meta')
      .update({ last_error_at: new Date().toISOString(), last_error_message: message.slice(0, 500) })
      .eq('id', 1)
  } catch {}
}

export async function getLastNotionSync(): Promise<{
  lastSyncedAt: string | null
  lastErrorAt: string | null
  lastErrorMessage: string | null
}> {
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from('notion_sync_meta')
      .select('last_synced_at, last_error_at, last_error_message')
      .eq('id', 1)
      .single()
    return {
      lastSyncedAt: data?.last_synced_at ?? null,
      lastErrorAt: data?.last_error_at ?? null,
      lastErrorMessage: data?.last_error_message ?? null,
    }
  } catch {
    return { lastSyncedAt: null, lastErrorAt: null, lastErrorMessage: null }
  }
}

// ── Public fetch API (cache-aware) ─────────────────────────────────────────

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

export async function fetchNotionTasksForProject(projectId: string): Promise<NotionTask[]> {
  const supabase = createClient()
  const [{ data: project }, notionKey] = await Promise.all([
    supabase.from('projects').select('notion_project_id').eq('id', projectId).single(),
    getAdminNotionKey(),
  ])
  if (!project?.notion_project_id) return []

  try {
    const tasks = await withTimeout(
      getTasksForProject(project.notion_project_id, notionKey),
      NOTION_TIMEOUT_MS,
      'Notion getTasksForProject'
    )
    // Fire-and-forget cache write — don't block the response on it.
    replaceProjectTasksInCache(project.notion_project_id, tasks).catch(() => {})
    return enrichTasksWithNames(tasks, notionKey)
  } catch (err) {
    console.error('Notion getTasksForProject failed, falling back to cache:', err)
    recordNotionError(`getTasksForProject: ${(err as Error).message}`).catch(() => {})
    const cached = await loadProjectTasksFromCache(project.notion_project_id)
    return enrichTasksWithNames(cached, notionKey)
  }
}

export async function fetchNotionProjects(): Promise<{ id: string; name: string }[]> {
  const notionKey = await getAdminNotionKey()
  try {
    return await withTimeout(getNotionProjectsPage(notionKey), NOTION_TIMEOUT_MS, 'Notion projects')
  } catch (err) {
    console.error('Notion projects fetch failed:', err)
    recordNotionError(`getNotionProjectsPage: ${(err as Error).message}`).catch(() => {})
    return []
  }
}

export async function fetchAllNotionTasks(): Promise<NotionTask[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, notion_person_id')
    .eq('id', user.id)
    .single()
  const notionKey = await getAdminNotionKey()
  const isAdminOrPM = profile?.role === 'admin' || profile?.role === 'project_manager'
  const personId = isAdminOrPM ? null : profile?.notion_person_id || null

  try {
    const tasks = await withTimeout(
      getCachedAllTasks(notionKey, personId),
      NOTION_TIMEOUT_MS,
      'Notion getAllTasks'
    )
    // Admin/PM has the full set → safe to replace cache (propagates deletions).
    // Other roles see only their slice → upsert without deleting others' rows.
    if (isAdminOrPM) {
      replaceAllTasksInCache(tasks).catch(() => {})
    } else {
      upsertPartialTasksInCache(tasks).catch(() => {})
    }
    return enrichTasksWithNames(tasks, notionKey)
  } catch (err) {
    console.error('Notion getAllTasks failed, falling back to cache:', err)
    recordNotionError(`getAllTasks: ${(err as Error).message}`).catch(() => {})
    const cached = await loadAllTasksFromCache(personId)
    return enrichTasksWithNames(cached, notionKey)
  }
}

export async function getTaskNotionComments(taskId: string): Promise<{ author: string; text: string; date: string }[]> {
  const notionKey = await getAdminNotionKey()
  const notion = getNotionClient(notionKey)
  if (!notion) return []
  try {
    const response = await withTimeout(
      (notion as any).comments.list({ block_id: taskId }) as Promise<any>,
      NOTION_TIMEOUT_MS,
      'Notion comments.list'
    )
    return (response.results as any[])
      .map((c: any) => ({
        author: c.created_by?.name || 'Notion User',
        text: (c.rich_text ?? []).map((t: any) => t.plain_text).join(''),
        date: c.created_time || '',
      }))
      .filter(c => c.text.trim())
  } catch {
    return []
  }
}

export async function syncNotionTasksNow(): Promise<{ synced: true; timestamp: string }> {
  revalidateTag('notion-all-tasks')
  // Also force-refresh the persistent cache so users immediately see fresh data.
  try {
    const notionKey = await getAdminNotionKey()
    const tasks = await withTimeout(getAllTasks(notionKey, null), NOTION_TIMEOUT_MS, 'Notion sync')
    await replaceAllTasksInCache(tasks)
  } catch (err) {
    console.error('syncNotionTasksNow refresh failed:', err)
    recordNotionError(`syncNotionTasksNow: ${(err as Error).message}`).catch(() => {})
  }
  return { synced: true, timestamp: new Date().toISOString() }
}

export async function getTaskDescription(taskId: string): Promise<string> {
  const notionKey = await getAdminNotionKey()
  const notion = getNotionClient(notionKey)
  if (!notion) return ''
  try {
    const response = await withTimeout(
      (notion as any).blocks.children.list({ block_id: taskId }) as Promise<any>,
      NOTION_TIMEOUT_MS,
      'Notion blocks.children.list'
    )
    return (response.results as any[])
      .filter((b: any) => ['paragraph','bulleted_list_item','numbered_list_item','heading_1','heading_2','heading_3'].includes(b.type))
      .map((b: any) => {
        const line = (b[b.type]?.rich_text ?? []).map((t: any) => t.plain_text).join('')
        if (b.type === 'bulleted_list_item') return `• ${line}`
        if (b.type === 'numbered_list_item') return ` ${line}`
        return line
      })
      .filter((t: string) => t.trim())
      .join('\n')
  } catch {
    return ''
  }
}
