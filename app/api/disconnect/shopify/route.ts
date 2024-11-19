// app/api/disconnect/shopify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, firestoreAdmin, admin } from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  console.log('\n=== START SHOPIFY DISCONNECT ===');

  try {
    // Verify session
    const sessionCookie = request.cookies.get('session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifyIdToken(sessionCookie);
    const uid = decodedToken.uid;

    // Update Firestore in batch
    const batch = firestoreAdmin.batch();
    const userRef = firestoreAdmin.collection('users').doc(uid);
    
    // Update connectors document - remove Shopify config
    const connectorRef = userRef.collection('integrations').doc('connectors');
    batch.set(connectorRef, {
      shopify: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // Update credentials document - remove Shopify credentials
    const credentialsRef = userRef.collection('integrations').doc('credentials');
    batch.set(credentialsRef, {
      shopify: admin.firestore.FieldValue.delete()
    }, { merge: true });

    await batch.commit();

    // Try to deactivate or clean up cloud resources
    try {
      const response = await fetch(process.env.PROVISION_CONNECTOR_URL || 'https://us-central1-semantc-sandbox.cloudfunctions.net/provision-connector', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: uid,
          connectorType: 'shopify',
          action: 'destroy'  // You'll need to handle this in your cloud function
        })
      });

      if (!response.ok) {
        console.error('Failed to clean up resources:', await response.text());
      }
    } catch (error) {
      console.error('Error cleaning up resources:', error);
      // Continue anyway since we've already removed the credentials
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error disconnecting Shopify:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Shopify' }, 
      { status: 500 }
    );
  }
}