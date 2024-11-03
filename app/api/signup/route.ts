// app/api/signup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, firestoreAdmin } from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    const userRecord = await adminAuth.createUser({
      email,
      password,
    });

    // Create a connector document with connectedApps initialized
    await firestoreAdmin.collection('connectors').doc(userRecord.uid).set({
      uid: userRecord.uid,
      connectedApps: {
        xero: {},
        shopify: {},
        googleads: {},
      },
      active: false,
    });

    // Create a custom token
    const customToken = await adminAuth.createCustomToken(userRecord.uid);

    // Set the session cookie
    const response = NextResponse.json({ status: 'success', customToken }, { status: 201 });
    response.cookies.set('session', customToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 5, // 5 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error signing up:', error);
    return NextResponse.json({ error: 'Failed to sign up' }, { status: 500 });
  }
}