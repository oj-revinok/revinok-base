import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * POST /api/feedback
 * Receives { userId, userName, comment } and creates a notification
 * for every admin user so they see the feedback in their notifications.
 */
export async function POST(req: Request) {
  try {
    const { userId, userName, comment } = await req.json();

    if (!userId || !userName || !comment) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Use service role to bypass RLS — we need to find all admins
    // and insert notifications for them.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Get all admin users
    const { data: admins, error: adminErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin');

    if (adminErr) {
      console.error('Feedback: failed to fetch admins', adminErr);
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }

    if (!admins || admins.length === 0) {
      // No admins found — still accept the feedback silently
      return NextResponse.json({ success: true });
    }

    // 2. Insert a notification for each admin
    const notifications = admins.map((admin) => ({
      recipient_id: admin.id,
      sender_id: userId,
      type: 'feedback',
      is_read: false,
      data: {
        user_name: userName,
        comment,
      },
    }));

    const { error: insertErr } = await supabase
      .from('notifications')
      .insert(notifications);

    if (insertErr) {
      console.error('Feedback: failed to insert notifications', insertErr);
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Feedback route error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
