import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminSupa } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { comment } = await req.json()
    if (!comment?.trim()) return NextResponse.json({ error: 'Missing comment' }, { status: 400 })

    const { data: senderProfile } = await supabase
      .from('profiles').select('full_name, email').eq('id', user.id).single()
    const senderName = senderProfile?.full_name || senderProfile?.email || 'Unknown'

    const adminSupa = createAdminSupa(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: admins, error: adminErr } = await adminSupa.from('profiles').select('id').eq('role', 'admin')
    if (adminErr) return NextResponse.json({ error: 'Server error' }, { status: 500 })
    if (!admins || admins.length === 0) return NextResponse.json({ success: true })

    const { error: insertErr } = await adminSupa.from('notifications').insert(
      admins.map(a => ({ recipient_id: a.id, sender_id: user.id, type: 'feedback', is_read: false, data: { user_name: senderName, comment: comment.trim() } }))
    )
    if (insertErr) return NextResponse.json({ error: 'Server error' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Feedback route error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}