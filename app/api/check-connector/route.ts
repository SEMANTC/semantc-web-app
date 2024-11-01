// app/api/check-connector/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, firestoreAdmin } from '@/lib/firebaseAdmin';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('session')?.value;

  if (!token) {
    return NextResponse.json({ active: false }, { status: 401 });
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const connectorDoc = await firestoreAdmin.collection('connectors').doc(userId).get();

    if (connectorDoc.exists) {
      const data = connectorDoc.data();
      return NextResponse.json({ active: data?.active === true });
    }

    return NextResponse.json({ active: false });
  } catch (error) {
    console.error('Error verifying token or fetching connector:', error);
    return NextResponse.json({ active: false }, { status: 500 });
  }
}