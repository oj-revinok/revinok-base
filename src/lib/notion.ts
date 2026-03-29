import { Client } from '@notionhq/client'

// Notion database IDs for Voxal | Revinok Workspace
export const NOTION_DB = {
  clients:  '24c391cd-225f-8050-b7a1-df681237bc48',
  projects: '24c391cd-225f-8004-b9fe-d7e31edccf82',
  team:     '24d391cd-225f-80ff-8b27-ec902f0a07a0',
  workload: '24d391cd-225f-80ee-93e8-e8ebdd978cb3',
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
  tags: string[]
  notionUrl: string
}

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
        property: 'Projects',
        relation: {
          contains: notionProjectPageId,
        },
      },
      sorts: [
        { property: 'Status', direction: 'ascending' },
        { property: 'Due Date', direction: 'ascending' },
      ],
    } as any)

    return response.results.map((page: any) => {
      const props = page.properties

      const name =
        props['Task Name']?.title?.[0]?.plain_text ||
        props['Name']?.title?.[0]?.plain_text ||
        'Untitled'

      const status = props['Status']?.status?.name || 'Not started'

      const priority = props['Priority Level']?.select?.name || null

      const dueDate = props['Due Date']?.date?.start || null

      const assignedTo = (props['Assigned to']?.relation || []).map(
        (r: any) => r.id
      )

      const tags = (props['Tags']?.multi_select || []).map((t: any) => t.name)

      return {
        id: page.id,
        name,
        status,
        priority,
        dueDate,
        assignedTo,
        tags,
        notionUrl: page.url,
      }
    })
  } catch (err) {
    console.error('Notion fetch error:', err)
    return []
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
      sorts: [{ property: 'Project Name', direction: 'ascending' }],
    } as any)

    return response.results.map((page: any) => ({
      id: page.id,
      name:
        page.properties['Project Name']?.title?.[0]?.plain_text ||
        'Untitled',
    }))
  } catch (err) {
    console.error('Notion projects fetch error:', err)
    return []
  }
}
