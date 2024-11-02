// lib/server-auth.ts
import { cookies } from 'next/headers';
import { adminAuth } from './firebaseAdmin';

export async function getServerUser() {
  const cookieStore = cookies();
  const session = cookieStore.get('session')?.value;

  if (!session) {
    return null;
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(session);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying ID token:', error);
    return null;
  }
}