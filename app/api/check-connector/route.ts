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

    const connectorDoc = await firestoreAdmin
      .collection('users')
      .doc(userId)
      .collection('integrations')
      .doc('connectors')
      .get();

    if (connectorDoc.exists) {
      const data = connectorDoc.data();
      
      // check both xero and shopify integrations
      const hasActiveXero = data?.xero?.active === true;
      const hasActiveShopify = data?.shopify?.active === true;
      
      return NextResponse.json({ 
        active: hasActiveXero || hasActiveShopify,
        integrations: {
          xero: data?.xero || {},
          shopify: data?.shopify || {}
        }
      });
    }

    return NextResponse.json({ active: false, integrations: {} });
  } catch (error) {
    console.error('Error verifying token or fetching connector:', error);
    return NextResponse.json({ active: false }, { status: 500 });
  }
}