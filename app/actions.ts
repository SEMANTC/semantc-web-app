'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
// import { auth } from '@/auth'
import { type Chat } from '@/lib/types'
// import { kv } from '@vercel/kv'

const CLOUD_RUN_API_URL = process.env.CLOUD_RUN_API_URL

if (!CLOUD_RUN_API_URL) {
  throw new Error('CLOUD_RUN_API_URL is not set in the environment variables')
}

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
  // if (!userId) {
  //   return []
  // }

  try {
    return await fetchFromCloudRun(`/api/get-chats`, 'GET')
  } catch (error) {
    console.error('Error fetching chats:', error)
    return []
  }
}

export async function getChat(id: string /*, userId: string */) {
  try {
    return await fetchFromCloudRun(`/api/get-chat?id=${id}`, 'GET')
  } catch (error) {
    console.error('Error fetching chat:', error)
    return null
  }
}

export async function removeChat({ id, path }: { id: string; path: string }) {
  // const session = await auth()

  // if (!session?.user?.id) {
  //   return {
  //     error: 'Unauthorized'
  //   }
  // }

  try {
    await fetchFromCloudRun(`/api/remove-chat`, 'POST', { id /*, userId: session.user.id */ })
    revalidatePath('/')
    return revalidatePath(path)
  } catch (error) {
    return {
      error: 'Failed to remove chat'
    }
  }
}

export async function clearChats() {
  // const session = await auth()

  // if (!session?.user?.id) {
  //   return {
  //     error: 'Unauthorized'
  //   }
  // }

  try {
    await fetchFromCloudRun(`/api/clear-chats`, 'POST' /*, { userId: session.user.id } */)
    revalidatePath('/')
    return redirect('/')
  } catch (error) {
    return {
      error: 'Failed to clear chats'
    }
  }
}

export async function getSharedChat(id: string) {
  try {
    const chat = await fetchFromCloudRun(`/api/get-shared-chat?id=${id}`, 'GET')
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
  // const session = await auth()

  // if (!session?.user?.id) {
  //   return {
  //     error: 'Unauthorized'
  //   }
  // }

  try {
    return await fetchFromCloudRun(`/api/share-chat`, 'POST', { id /*, userId: session.user.id */ })
  } catch (error) {
    return {
      error: 'Failed to share chat'
    }
  }
}

export async function saveChat(chat: Chat) {
  // const session = await auth()

  // if (session && session.user) {
  //   const pipeline = kv.pipeline()
  //   pipeline.hmset(`chat:${chat.id}`, chat)
  //   pipeline.zadd(`user:chat:${chat.userId}`, {
  //     score: Date.now(),
  //     member: `chat:${chat.id}`
  //   })
  //   await pipeline.exec()
  // } else {
  //   return
  // }
  try {
    await fetchFromCloudRun(`/api/save-chat`, 'POST', chat)
  } catch (error) {
    console.error('Error saving chat:', error)
  }
}