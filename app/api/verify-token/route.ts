// app/api/verify-token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    await adminAuth.verifyIdToken(token);
    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error('Token verification failed:', error);
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}