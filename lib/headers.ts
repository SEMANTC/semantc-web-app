// lib/headers.ts
import { cookies } from 'next/headers';

export async function getAuthHeaders() {
  const cookieStore = cookies();
  const session = cookieStore.get('session');

  return {
    Cookie: session ? `session=${session.value}` : '',
    'Content-Type': 'application/json',
  };
}