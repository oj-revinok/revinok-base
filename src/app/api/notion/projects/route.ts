export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchNotionProjects } from '@/lib/actions/notion'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const projects = await fetchNotionProjects()
    return NextResponse.json(projects)
  } catch (err) {
    console.error('Notion projects API error:', err)
    return NextResponse.json([], { status: 200 })
  }
}