'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createClientRecord(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'project_manager') {
    throw new Error('Unauthorized')
  }

  const name = (formData.get('name') as string)?.trim()
  const email = (formData.get('email') as string)?.trim() || null
  const phone = (formData.get('phone') as string)?.trim() || null
  const industry = (formData.get('industry') as string)?.trim() || null
  const website = (formData.get('website') as string)?.trim() || null
  if (!name) throw new Error('Client name is required')

  const { error } = await supabase.from('clients').insert({ name, email, phone, industry, website } as any)
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
    email: (formData.get('email') as string)?.trim() || null,
    phone: (formData.get('phone') as string)?.trim() || null,
    industry: (formData.get('industry') as string)?.trim() || null,
    website: (formData.get('website') as string)?.trim() || null,
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