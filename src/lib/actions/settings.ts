'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getAppSetting(key: string): Promise<string | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle()
  return data?.value ?? null
}

export async function saveAppSetting(key: string, value: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('app_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/settings')
}
