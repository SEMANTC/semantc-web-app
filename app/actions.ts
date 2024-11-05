// app/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/server-auth';
import { Chat } from '@/lib/types';

const CLOUD_RUN_API_URL = process.env.CLOUD_RUN_API_URL;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

if (!CLOUD_RUN_API_URL) {
  throw new Error('CLOUD_RUN_API_URL is not set in the environment variables');
}

async function fetchFromCloudRun(endpoint: string, method: string, body?: any) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds timeout

  try {
    const response = await fetch(`${CLOUD_RUN_API_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      next: { revalidate: 0 }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error: ${response.status} ${response.statusText}`);
      console.error(`Error body: ${errorText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        throw new Error('Request timed out after 60 seconds');
      }
      throw err;
    }
    throw new Error('An unknown error occurred');
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getChats() {
  const user = await getServerUser();

  if (!user) {
    console.log('No user found, returning empty array');
    return [];
  }

  try {
    console.log('Fetching chats from:', `${APP_URL}/api/get-chats`);
    const response = await fetch(`${APP_URL}/api/get-chats`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch chats. Status:', response.status);
      console.error('Error text:', errorText);
      return [];
    }

    const data = await response.json();
    console.log('Received chats:', data);
    return data.chats || [];
  } catch (error) {
    console.error('Error fetching chats:', error);
    return [];
  }
}

export async function getChat(id: string, userId: string) {
  try {
    const response = await fetch(`${APP_URL}/api/get-chats?chatId=${id}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      return null;
    }

    const chat = await response.json();
    return chat || null; // The API now returns a single chat object directly
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
    const response = await fetch(`${APP_URL}/api/save-chat?chatId=${id}`, {
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
    const response = await fetch(`${APP_URL}/api/clear-chats`, {
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
    const response = await fetch(`${APP_URL}/api/save-chat`, {
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

    await fetchFromCloudRun('/api/chat', 'POST', {
      messages: chat.messages,
      chatId: chat.id
    });
  } catch (error) {
    console.error('Error saving chat:', error);
  }
}