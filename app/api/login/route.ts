// app/api/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: 'ID token is missing' }, { status: 400 });
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const response = NextResponse.json({ status: 'success' });
    response.cookies.set('session', idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 5, // 5 days
      path: '/',
      sameSite: 'lax',
      priority: 'high'
    });

    // Set the cookie in header as well to ensure it's forwarded
    response.headers.append('Set-Cookie', `session=${idToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 5}`);

    return response;
  } catch (error) {
    console.error('Failed to set session cookie:', error);
    return NextResponse.json({ error: 'Failed to set session cookie' }, { status: 500 });
  }
}