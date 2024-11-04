// app/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/server-auth';
import { Chat } from '@/lib/types';

const CLOUD_RUN_API_URL = process.env.CLOUD_RUN_API_URL;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'; // Add this line

if (!CLOUD_RUN_API_URL) {
  throw new Error('CLOUD_RUN_API_URL is not set in the environment variables');
}

async function fetchFromCloudRun(endpoint: string, method: string, body?: any) {
  const response = await fetch(`${CLOUD_RUN_API_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    // Add timeout and retry logic
    signal: AbortSignal.timeout(60000), // 60 seconds timeout
    next: { revalidate: 0 } // Disable cache
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API error: ${response.status} ${response.statusText}`);
    console.error(`Error body: ${errorText}`);
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export async function getChats() {
  const user = await getServerUser();

  if (!user) {
    return [];
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/get-chats`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      console.error('Failed to fetch chats:', await response.text());
      return [];
    }

    const data = await response.json();
    return data.chats || [];
  } catch (error) {
    console.error('Error fetching chats:', error);
    return [];
  }
}

export async function getChat(id: string, userId: string) {
  try {
    const response = await fetch(`${APP_URL}/api/get-chats?chatId=${id}`, { // Add absolute URL
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    const chats = await response.json();
    return chats.find((chat: Chat) => chat.id === id) || null;
  } catch (error) {
    console.error('Error fetching chat:', error);
    return null;
  }
}

export async function removeChat({ id, path }: { id: string; path: string }) {
  const user = await getServerUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  try {
    const response = await fetch(`${APP_URL}/api/save-chat?chatId=${id}`, { // Add absolute URL
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to remove chat');
    }

    revalidatePath('/');
    return revalidatePath(path);
  } catch (error) {
    return { error: 'Failed to remove chat' };
  }
}

export async function clearChats() {
  const user = await getServerUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  try {
    const response = await fetch(`${APP_URL}/api/clear-chats`, { // Add absolute URL
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to clear chats');
    }

    revalidatePath('/');
    return redirect('/');
  } catch (error) {
    return { error: 'Failed to clear chats' };
  }
}

export async function saveChat(chat: Chat) {
  try {
    // Save chat data to Firestore
    const response = await fetch(`${APP_URL}/api/save-chat`, { // Add absolute URL
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(chat),
    });

    if (!response.ok) {
      throw new Error('Failed to save chat');
    }

    // Also send to Cloud Run for LLM processing
    await fetchFromCloudRun('/api/chat', 'POST', {
      messages: chat.messages,
      chatId: chat.id
    });
  } catch (error) {
    console.error('Error saving chat:', error);
  }
}