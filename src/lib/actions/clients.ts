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
  const phone = (formData.get('phone') as string)?.trim() || null
  const industry = (formData.get('industry') as string)?.trim() || null
  const website = (formData.get('website') as string)?.trim() || null
  const contact_name = (formData.get('contact_name') as string)?.trim() || null

  if (!name) throw new Error('Client name is required')

  const { error } = await supabase.from('clients').insert({
    name,
    brand_name,
    email,
    phone,
    industry,
    website,
    contact_name,
  } as any)

  if (error) throw error

  revalidatePath('/dashboard/clients')
}

export async function updateClientRecord(id: string, formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'project_manager') {
    throw new Error('Unauthorized')
  }

  const values = {
    name: (formData.get('name') as string)?.trim(),
    brand_name: (formData.get('brand_name') as string)?.trim() || null,
    email: (formData.get('email') as string)?.trim() || null,
    phone: (formData.get('phone') as string)?.trim() || null,
    industry: (formData.get('industry') as string)?.trim() || null,
    website: (formData.get('website') as string)?.trim() || null,
    contact_name: (formData.get('contact_name') as string)?.trim() || null,
  }

  if (!values.name) throw new Error('Client name is required')

  const { error } = await supabase.from('clients').update(values).eq('id', id)
  if (error) throw error

  revalidatePath('/dashboard/clients')
}

export async function deleteClientRecord(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'project_manager') {
    throw new Error('Unauthorized')
  }

  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (error) throw error

  revalidatePath('/dashboard/clients')
}
