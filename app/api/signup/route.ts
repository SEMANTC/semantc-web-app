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

    // Create a connector document with active: false
    await firestoreAdmin.collection('connectors').doc(userRecord.uid).set({
      active: false,
      // Add other fields as needed
    });

    // Optionally, create a session token or return user info
    const idToken = await adminAuth.createCustomToken(userRecord.uid);

    return NextResponse.json({ status: 'success', idToken }, { status: 201 });
  } catch (error) {
    console.error('Error signing up:', error);
    return NextResponse.json({ error: 'Failed to sign up' }, { status: 500 });
  }
}