import { createClient } from '@supabase/supabase-js'

// Admin client uses service role key — only use in server actions / API routes
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!url || !serviceKey) {
    throw new Error('Invite failed: the SUPABASE_SERVICE_ROLE_KEY environment variable is not set. Add it in Netlify → Site settings → Environment variables, then redeploy.')
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
