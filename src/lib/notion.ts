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

function parseNotionTask(page: any): NotionTask {
  const props = page.properties

  const name =
    props['Task Name']?.title?.[0]?.plain_text ||
    props['Name']?.title?.[0]?.plain_text ||
    'Untitled'

  const status = props['Status ']?.status?.name || 'Not started'
  const priority = props['Priority Level']?.select?.name || null
  const dueDate = props['Due Date']?.date?.start || null

  const assignedTo = (props['🎨 Assigned to']?.relation || []).map(
    (r: any) => r.id
  )

  // Try to get assigned person names if available
  const assignedNames: string[] = []

  const tags = (props['Tags']?.multi_select || []).map((t: any) => t.name)

  const projectIds = (props['🏆 Projects ']?.relation || []).map((r: any) => r.id)

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
