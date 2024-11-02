// app/api/oauth/callback/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, firestoreAdmin, admin } from '@/lib/firebaseAdmin';
import axios from 'axios';
import { encrypt } from '@/lib/encryption';

export async function GET(request: NextRequest) {
  console.log('\n=== START XERO OAUTH CALLBACK ===');
  console.log('Request received at:', new Date().toISOString());

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const scope = searchParams.get('scope');
  const baseUrl = new URL(request.url).origin;

  console.log('Received parameters:', {
    hasCode: !!code,
    state,
    scope
  });

  if (!code) {
    console.log('No authorization code received');
    return NextResponse.redirect(`${baseUrl}/integrations?error=no_code`);
  }

  try {
    // Get and verify token
    const sessionCookie = request.cookies.get('session')?.value;
    if (!sessionCookie) {
      console.log('No session cookie found');
      return NextResponse.redirect(`${baseUrl}/login`);
    }

    console.log('Verifying token...');
    let uid;
    try {
      const decodedToken = await adminAuth.verifyIdToken(sessionCookie);
      uid = decodedToken.uid;
      console.log('Token verified for user:', uid);
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.redirect(`${baseUrl}/login`);
    }

    // Exchange code for tokens
    console.log('Exchanging code for tokens...');
    let tokenResponse;
    try {
      tokenResponse = await axios.post(
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

      console.log('Token exchange successful');
    } catch (error) {
      console.error('Token exchange failed:', error);
      return NextResponse.redirect(`${baseUrl}/integrations?error=token_exchange_failed`);
    }

    const tokenData = tokenResponse.data;
    console.log('Validating token data...');
    if (!tokenData?.access_token || !tokenData?.refresh_token) {
      console.error('Invalid token data received:', tokenData);
      return NextResponse.redirect(`${baseUrl}/integrations?error=invalid_token_data`);
    }

    // Fetch Xero connections
    console.log('Fetching Xero organizations...');
    let connectionsResponse;
    try {
      connectionsResponse = await axios.get('https://api.xero.com/connections', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Failed to fetch Xero organizations:', error);
      return NextResponse.redirect(`${baseUrl}/integrations?error=fetch_org_failed`);
    }

    if (!connectionsResponse.data?.length) {
      console.log('No Xero organizations found');
      return NextResponse.redirect(`${baseUrl}/integrations?error=no_organizations`);
    }

    const tenant = connectionsResponse.data[0];
    console.log('Found organization:', tenant.tenantName);

    // Store in Firestore
    console.log('Storing in Firestore...');
    try {
      // Verify and encrypt tokens
      const encryptedAccessToken = encrypt(tokenData.access_token);
      const encryptedRefreshToken = encrypt(tokenData.refresh_token);
      
      console.log('Tokens encrypted successfully');

      const batch = firestoreAdmin.batch();

      // Connector document
      const connectorRef = firestoreAdmin.collection('connectors').doc(uid);
      batch.set(connectorRef, {
        active: true,
        provider: 'xero',
        tenantId: tenant.tenantId,
        tenantName: tenant.tenantName,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // Credentials document
      const credentialsRef = firestoreAdmin.collection('credentials').doc(uid);
      batch.set(credentialsRef, {
        xero: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt: Math.floor(Date.now() / 1000) + tokenData.expires_in,
          tokenType: tokenData.token_type,
          scope: tokenData.scope,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        }
      }, { merge: true });

      await batch.commit();
      console.log('Successfully stored data in Firestore');

    } catch (error) {
      console.error('Firestore storage failed:', error);
      return NextResponse.redirect(`${baseUrl}/integrations?error=storage_failed`);
    }

    console.log('=== XERO OAUTH CALLBACK COMPLETED SUCCESSFULLY ===');
    return NextResponse.redirect(`${baseUrl}/integrations?status=success`);

  } catch (error) {
    console.error('=== UNEXPECTED ERROR ===');
    console.error(error);
    return NextResponse.redirect(`${baseUrl}/integrations?error=unexpected`);
  }
}