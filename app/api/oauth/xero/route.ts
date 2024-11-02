// app/api/oauth/xero/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, firestoreAdmin, admin } from '@/lib/firebaseAdmin';
import axios from 'axios';
import { encrypt } from '@/lib/encryption';

export async function GET(request: NextRequest) {
  console.log('=== XERO OAUTH CALLBACK STARTED ===');

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    console.log('No code provided');
    return NextResponse.redirect('/integrations?error=no_code');
  }

  try {
    // Session verification
    const sessionCookie = request.cookies.get('session')?.value;
    if (!sessionCookie) {
      return NextResponse.redirect('/login');
    }

    // Token verification
    let uid;
    try {
      const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie);
      uid = decodedClaims.uid;
      console.log('User authenticated:', uid);
    } catch (error) {
      console.error('Session verification failed:', error);
      return NextResponse.redirect('/login');
    }

    // Token exchange
    let tokenData;
    try {
      const tokenResponse = await axios.post(
        'https://identity.xero.com/connect/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: process.env.XERO_REDIRECT_URI!,
          client_id: process.env.XERO_CLIENT_ID!,
          client_secret: process.env.XERO_CLIENT_SECRET!,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      
      tokenData = tokenResponse.data;
      console.log('Token exchange successful');
    } catch (error: any) {
      console.error('Token exchange failed:', error.response?.data || error.message);
      return NextResponse.redirect('/integrations?error=token_exchange_failed');
    }

    // Fetch Xero organizations
    let tenant;
    try {
      const connectionsResponse = await axios.get('https://api.xero.com/connections', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!connectionsResponse.data?.length) {
        return NextResponse.redirect('/integrations?error=no_tenants');
      }

      tenant = connectionsResponse.data[0];
      console.log('Found organization:', tenant.tenantName);
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
      return NextResponse.redirect('/integrations?error=tenant_fetch_failed');
    }

    // Store in Firestore
    try {
      const batch = firestoreAdmin.batch();

      // Connectors document
      const connectorRef = firestoreAdmin.collection('connectors').doc(uid);
      const connectorData = {
        active: true,
        provider: 'xero',
        tenantId: tenant.tenantId,
        tenantName: tenant.tenantName,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      batch.set(connectorRef, connectorData, { merge: true });

      // Credentials document
      const credentialsRef = firestoreAdmin.collection('credentials').doc(uid);
      const credentialsData = {
        xero: {
          accessToken: encrypt(tokenData.access_token),
          refreshToken: encrypt(tokenData.refresh_token),
          expiresAt: Math.floor(Date.now() / 1000) + tokenData.expires_in,
          tokenType: tokenData.token_type,
          scope: tokenData.scope,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        }
      };
      batch.set(credentialsRef, credentialsData, { merge: true });

      await batch.commit();
      console.log('Successfully stored data in Firestore');
    } catch (error) {
      console.error('Firestore storage failed:', error);
      return NextResponse.redirect('/integrations?error=storage_failed');
    }

    console.log('=== XERO OAUTH CALLBACK COMPLETED SUCCESSFULLY ===');
    return NextResponse.redirect('/integrations?status=success');

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.redirect('/integrations?error=unexpected');
  }
}