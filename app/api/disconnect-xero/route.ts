// app/api/disconnect-xero/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, firestoreAdmin, admin } from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('session')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;
    const userRef = firestoreAdmin.collection('users').doc(userId);

    const batch = firestoreAdmin.batch();

    // Update the connector document
    const connectorRef = userRef.collection('integrations').doc('connectors');
    batch.update(connectorRef, {
      'xero': admin.firestore.FieldValue.delete(),
      active: false // Set to false if Xero was the only integration
    });

    // Remove credentials
    const credentialsRef = userRef.collection('integrations').doc('credentials');
    batch.update(credentialsRef, {
      'xero': admin.firestore.FieldValue.delete()
    });

    await batch.commit();

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Error disconnecting Xero:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}