import { Client } from '@notionhq/client'

// Notion collection (data source) IDs for Voxal | Revinok Workspace
export const NOTION_DB = {
  projects: '24c391cd-225f-8038-8d80-000bacadc183',
  workload: '24d391cd-225f-805a-b6f1-000b483af790',
  team: '24d391cd-225f-803f-a3b5-000b9b80ab78',
}

export function getNotionClient(apiKey?: string) {
  const key = apiKey || process.env.NOTION_API_KEY
  if (!key) return null
  return new Client({ auth: key })
}

export interface NotionTask {
  id: string
  name: string
  status: string
  priority: string | null
  dueDate: string | null
  assignedTo: string[]
  assignedNames: string[]
  tags: string[]
  notionUrl: string
  projectIds: string[]
}

export const ACTIVE_STATUSES = ['Not started', 'In progress', 'Inhouse Review', 'Feedback', 'Waiting for info', 'On Hold']
export const DONE_STATUSES = ['Complete']
export const PRIORITY_STATUSES_ORDER = ['Not started', 'In progress', 'Waiting for info', 'Inhouse Review', 'Feedback', 'On Hold', 'Complete']

export async function getTasksForProject(
  notionProjectPageId: string,
  apiKey?: string
): Promise<NotionTask[]> {
  const notion = getNotionClient(apiKey)
  if (!notion) return []

  try {
    const response = await notion.dataSources.query({
      data_source_id: NOTION_DB.workload,
      filter: {
        property: '🏆 Projects ',
        relation: {
          contains: notionProjectPageId,
        },
      },
      sorts: [
        { property: 'Status ', direction: 'ascending' },
        { property: 'Due Date', direction: 'ascending' },
      ],
    } as any)

    return response.results.map((page: any) => parseNotionTask(page))
  } catch (err) {
    console.error('Notion fetch error:', err)
    return []
  }
}

export async function getAllTasks(
  apiKey?: string,
  notionPersonId?: string | null
): Promise<NotionTask[]> {
  const notion = getNotionClient(apiKey)
  if (!notion) return []

  try {
    const queryOptions: any = {
      data_source_id: NOTION_DB.workload,
      sorts: [
        { property: 'Status ', direction: 'ascending' },
        { property: 'Due Date', direction: 'ascending' },
      ],
    }

    // If a notion person ID is provided, filter to their tasks only
    if (notionPersonId) {
      queryOptions.filter = {
        property: '🎨 Assigned to',
        relation: {
          contains: notionPersonId,
        },
      }
    }

    const response = await notion.dataSources.query(queryOptions)
    return response.results.map((page: any) => parseNotionTask(page))
  } catch (err) {
    console.error('Notion getAllTasks error:', err)
    return []
  }
}

// Pick the first property whose name matches any of the candidates. Notion
// schemas in this workspace are emoji-prefixed and frequently include trailing
// whitespace ('🏆 Projects ', 'Status '), and either of those can silently
// break a property lookup if the property is later renamed. Defensive: try a
// few common variants so a rename doesn't quietly hide every relation.
function pickProp(props: any, candidates: string[]): any {
  if (!props) return undefined
  for (const name of candidates) {
    if (props[name] !== undefined) return props[name]
  }
  // Last-ditch: fuzzy match — strip emoji + trim + lowercase, compare to each
  // candidate's normalized form. Catches cases like a rename from
  // '🏆 Projects ' to 'Projects' or 'Project' even if the candidate list
  // missed the exact new name.
  const normalize = (s: string) => s.replace(/[^\p{L}\p{N}]+/gu, '').toLowerCase()
  const targets = candidates.map(normalize)
  for (const key of Object.keys(props)) {
    if (targets.includes(normalize(key))) return props[key]
  }
  return undefined
}

function parseNotionTask(page: any): NotionTask {
  const props = page.properties

  const name =
    pickProp(props, ['Task Name', 'Name'])?.title?.[0]?.plain_text ||
    'Untitled'

  const status = pickProp(props, ['Status ', 'Status'])?.status?.name || 'Not started'
  const priority = pickProp(props, ['Priority Level', 'Priority'])?.select?.name || null
  const dueDate = pickProp(props, ['Due Date', 'Due'])?.date?.start || null

  const assignedTo = (pickProp(props, ['🎨 Assigned to', 'Assigned to', 'Assignees', 'Assignee'])?.relation || [])
    .map((r: any) => r.id)

  // Resolved later by enrichTasksWithNames against the team DB / profiles.
  const assignedNames: string[] = []

  const tags = (pickProp(props, ['Tags', 'Tag'])?.multi_select || []).map((t: any) => t.name)

  const projectIds = (pickProp(props, ['🏆 Projects ', '🏆 Projects', 'Projects', 'Project'])?.relation || [])
    .map((r: any) => r.id)

  return {
    id: page.id,
    name,
    status,
    priority,
    dueDate,
    assignedTo,
    assignedNames,
    tags,
    notionUrl: page.url,
    projectIds,
  }
}

export interface NotionTeamPerson {
  id: string
  name: string
  email: string | null
  role: string | null
}

export async function getNotionTeamPersons(
  apiKey?: string
): Promise<NotionTeamPerson[]> {
  const notion = getNotionClient(apiKey)
  if (!notion) return []

  try {
    const response = await notion.dataSources.query({
      data_source_id: NOTION_DB.team,
      sorts: [{ property: 'Name', direction: 'ascending' }],
    } as any)

    return response.results.map((page: any) => {
      const props = page.properties
      const name = props['Name']?.title?.[0]?.plain_text || 'Unnamed'
      const email = props['Email']?.email || null
      const role = props['Role']?.select?.name || props['Role']?.rich_text?.[0]?.plain_text || null
      return { id: page.id, name, email, role }
    })
  } catch (err) {
    console.error('Notion team persons fetch error:', err)
    return []
  }
}

export async function addCommentToNotionTask(
  taskPageId: string,
  comment: string,
  apiKey?: string
): Promise<boolean> {
  const notion = getNotionClient(apiKey)
  if (!notion) return false

  try {
    await (notion as any).comments.create({
      parent: { page_id: taskPageId },
      rich_text: [{ type: 'text', text: { content: comment } }],
    })
    return true
  } catch (err) {
    console.error('Notion add comment error:', err)
    return false
  }
}

export async function getNotionProjectsPage(
  apiKey?: string
): Promise<{ id: string; name: string }[]> {
  const notion = getNotionClient(apiKey)
  if (!notion) return []

  try {
    const response = await notion.dataSources.query({
      data_source_id: NOTION_DB.projects,
      sorts: [{ property: ' Project Name ', direction: 'ascending' }],
    } as any)

    return response.results.map((page: any) => ({
      id: page.id,
      name:
        page.properties[' Project Name ']?.title?.[0]?.plain_text ||
        'Untitled',
    }))
  } catch (err) {
    console.error('Notion projects fetch error:', err)
    return []
  }
}
