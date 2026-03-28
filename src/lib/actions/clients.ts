'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createClientRecord(formData: FormData) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const name = (formData.get('name') as string)?.trim()
  const brand_name = (formData.get('brand_name') as string)?.trim() || null
  const email = (formData.get('email') as string)?.trim() || null
  const industry = (formData.get('industry') as string)?.trim() || null
  const website = (formData.get('website') as string)?.trim() || null

  if (!name) throw new Error('Client name is required')

  const { error } = await supabase.from('clients').insert({
    name,
    brand_name,
    email,
    industry,
    website,
  })

  if (error) throw error

  revalidatePath('/dashboard/clients')
}
