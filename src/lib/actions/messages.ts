'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Message, Conversation, Profile } from '@/types'

export async function getConversations(): Promise<Conversation[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Get all unique users the current user has conversations with
  const { data: rawMessages, error } = await supabase
    .from('messages')
    .select('sender_id, receiver_id, content, created_at, deleted_at')
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getConversations:', error)
    return []
  }

  // Build a map of conversations
  const convMap = new Map<string, { lastMsg: string | null; lastTime: string | null; unreadCount: number }>()
  const otherUserIds = new Set<string>()

  for (const msg of rawMessages || []) {
    const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
    otherUserIds.add(otherUserId)

    if (!convMap.has(otherUserId)) {
      const isDeleted = msg.deleted_at !== null
      const lastMsg = isDeleted ? null : msg.content
      convMap.set(otherUserId, {
        lastMsg,
        lastTime: msg.created_at,
        unreadCount: msg.sender_id !== user.id ? 1 : 0,
      })
    }
  }

  // Fetch profile info for all other users
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, avatar_initials, created_at')
    .in('id', Array.from(otherUserIds))

  if (profileError) {
    console.error('getConversations (profiles):', profileError)
    return []
  }

  return (profiles || []).map((profile) => {
    const conv = convMap.get(profile.id)
    return {
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
        avatar_initials: profile.avatar_initials,
        created_at: profile.created_at,
      },
      lastMessage: conv?.lastMsg || null,
      lastMessageTime: conv?.lastTime || null,
      unreadCount: conv?.unreadCount || 0,
    }
  })
}

export async function getMessages(otherUserId: string): Promise<Message[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:profiles!messages_sender_id_fkey(id, email, full_name, role, avatar_initials, created_at)
    `)
    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('getMessages:', error)
    return []
  }

  return (data || []) as Message[]
}

export async function sendMessage(
  receiverId: string,
  content: string,
  fileUrl?: string,
  fileName?: string,
  fileType?: string
): Promise<Message | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: user.id,
      receiver_id: receiverId,
      content: content.trim() || null,
      file_url: fileUrl || null,
      file_name: fileName || null,
      file_type: fileType || null,
      created_at: new Date().toISOString(),
    })
    .select(`
      *,
      sender:profiles!messages_sender_id_fkey(id, email, full_name, role, avatar_initials, created_at)
    `)
    .single()

  if (error) {
    console.error('sendMessage:', error)
    return null
  }

  revalidatePath(`/dashboard/messages`)
  return data as Message
}

export async function softDeleteMessage(messageId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('messages')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
    })
    .eq('id', messageId)
    .eq('sender_id', user.id)

  if (error) {
    console.error('softDeleteMessage:', error)
    return false
  }

  revalidatePath(`/dashboard/messages`)
  return true
}

export async function getTeamMembersForMessaging(): Promise<Profile[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, avatar_initials, created_at')
    .neq('id', user.id)
    .order('full_name', { ascending: true })

  if (error) {
    console.error('getTeamMembersForMessaging:', error)
    return []
  }

  return (data || []) as Profile[]
}
