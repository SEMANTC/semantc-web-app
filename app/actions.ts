// app/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/server-auth';
import { Chat } from '@/lib/types';
import { getAuthHeaders } from '@/lib/headers';
import { callCloudRunAPI } from '@/lib/cloud-run/client';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function getChats() {
  const user = await getServerUser();
  if (!user) {
    console.log('No user found, returning empty array');
    return [];
  }

  try {
    const headers = await getAuthHeaders();
    console.log('Fetching chats from:', `${APP_URL}/api/get-chats`);
    const response = await fetch(`${APP_URL}/api/get-chats`, {
      method: 'GET',
      headers,
      credentials: 'include',
      cache: 'no-store',
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${APP_URL}/api/get-chats?chatId=${id}`, {
      method: 'GET',
      headers,
      credentials: 'include',
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const chat = await response.json();
    return chat || null;
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${APP_URL}/api/save-chat?chatId=${id}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
      cache: 'no-store',
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${APP_URL}/api/clear-chats`, {
      method: 'POST',
      headers,
      credentials: 'include',
      cache: 'no-store',
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${APP_URL}/api/save-chat`, {
      method: 'POST',
      headers,
      credentials: 'include',
      cache: 'no-store',
      body: JSON.stringify(chat),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Save chat error:', errorText);
      throw new Error('Failed to save chat');
    }

    // only call cloud run if there are valid messages
    if (chat.messages && chat.messages.length > 0) {
      await callCloudRunAPI('/api/chat', 'POST', {
        messages: chat.messages.filter(m => m.content),
        chatId: chat.id
      });
    }

    return response.json();
  } catch (error) {
    console.error('Error saving chat:', error);
    throw error;
  }
}