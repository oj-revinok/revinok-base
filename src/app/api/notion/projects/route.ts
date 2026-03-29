import { NextResponse } from 'next/server'
import { fetchNotionProjects } from '@/lib/actions/notion'

export async function GET() {
  try {
    const projects = await fetchNotionProjects()
    return NextResponse.json(projects)
  } catch (err) {
    console.error('Notion projects API error:', err)
    return NextResponse.json([], { status: 200 })
  }
}
