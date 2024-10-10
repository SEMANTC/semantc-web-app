'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { auth } from '@/auth'
import { type Chat } from '@/lib/types'

const CLOUD_RUN_API_URL = process.env.CLOUD_RUN_API_URL || 'http://your-cloud-run-url.com/api'

async function fetchFromCloudRun(endpoint: string, method: string, body?: any) {
  const response = await fetch(`${CLOUD_RUN_API_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export async function getChats(userId?: string | null) {
  if (!userId) {
    return []
  }

  try {
    return await fetchFromCloudRun(`/chats/${userId}`, 'GET')
  } catch (error) {
    console.error('Error fetching chats:', error)
    return []
  }
}

export async function getChat(id: string, userId: string) {
  try {
    const chat = await fetchFromCloudRun(`/chat/${id}`, 'GET')
    if (!chat || (userId && chat.userId !== userId)) {
      return null
    }
    return chat
  } catch (error) {
    console.error('Error fetching chat:', error)
    return null
  }
}

export async function removeChat({ id, path }: { id: string; path: string }) {
  const session = await auth()

  if (!session) {
    return {
      error: 'Unauthorized'
    }
  }

  try {
    await fetchFromCloudRun(`/chat/${id}`, 'DELETE', { userId: session.user.id })
    revalidatePath('/')
    return revalidatePath(path)
  } catch (error) {
    console.error('Error removing chat:', error)
    return { error: 'Failed to remove chat' }
  }
}

export async function clearChats() {
  const session = await auth()

  if (!session?.user?.id) {
    return {
      error: 'Unauthorized'
    }
  }

  try {
    await fetchFromCloudRun(`/chats/${session.user.id}`, 'DELETE')
    revalidatePath('/')
    return redirect('/')
  } catch (error) {
    console.error('Error clearing chats:', error)
    return { error: 'Failed to clear chats' }
  }
}

export async function getSharedChat(id: string) {
  try {
    const chat = await fetchFromCloudRun(`/shared-chat/${id}`, 'GET')
    if (!chat || !chat.sharePath) {
      return null
    }
    return chat
  } catch (error) {
    console.error('Error fetching shared chat:', error)
    return null
  }
}

export async function shareChat(id: string) {
  const session = await auth()

  if (!session?.user?.id) {
    return {
      error: 'Unauthorized'
    }
  }

  try {
    return await fetchFromCloudRun(`/share-chat/${id}`, 'POST', { userId: session.user.id })
  } catch (error) {
    console.error('Error sharing chat:', error)
    return { error: 'Failed to share chat' }
  }
}

export async function saveChat(chat: Chat) {
  const session = await auth()

  if (!session || !session.user) {
    return
  }

  try {
    await fetchFromCloudRun('/save-chat', 'POST', { chat, userId: session.user.id })
  } catch (error) {
    console.error('Error saving chat:', error)
  }
}

export async function refreshHistory(path: string) {
  redirect(path)
}

export async function getMissingKeys() {
  // This function is no longer needed as we're not using the Google Generative AI API
  return []
}