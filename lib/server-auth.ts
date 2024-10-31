// lib/server-auth.ts
import { cookies } from 'next/headers';
import { adminAuth } from './firebaseAdmin';

export async function getServerUser() {
  const cookieStore = cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return null;
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying ID token:', error);
    return null;
  }
}