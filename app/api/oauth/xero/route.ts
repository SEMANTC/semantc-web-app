// app/api/oauth/xero/route.ts
export const runtime = 'nodejs'; // Correct, Node.js runtime supports firebase-admin

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, firestoreAdmin } from '@/lib/firebaseAdmin';
import axios from 'axios';
import { encrypt } from '@/lib/encryption';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect('/error');
  }

  try {
    // Retrieve the user's UID from the session cookie
    const sessionCookie = request.cookies.get('session')?.value;
    if (!sessionCookie) {
      return NextResponse.redirect('/login');
    }

    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    const uid = decodedClaims.uid;

    // Exchange code for tokens
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

    const tokenData = tokenResponse.data;

    // Calculate expires_at
    const acquiredTime = Math.floor(Date.now() / 1000); // Current time in seconds
    const expires_at = acquiredTime + tokenData.expires_in;

    // Fetch connected tenants
    const connectionsResponse = await axios.get('https://api.xero.com/connections', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (connectionsResponse.data.length === 0) {
      throw new Error('No connected tenants found');
    }

    // Use the first connected tenant's ID
    const tenant = connectionsResponse.data[0];
    const tenantId = tenant.tenantId;

    // Encrypt tokens
    const encryptedAccessToken = encrypt(tokenData.access_token);
    const encryptedRefreshToken = encrypt(tokenData.refresh_token);

    // Store tokens and tenant info in Firestore
    await firestoreAdmin
      .collection('users')
      .doc(uid)
      .set(
        {
          connectedApps: {
            xero: {
              tenantId: tenantId,
              accessToken: encryptedAccessToken,
              refreshToken: encryptedRefreshToken,
              expiresAt: expires_at,
              tokenType: tokenData.token_type,
              scope: tokenData.scope,
              lastSync: null,
            },
          },
        },
        { merge: true }
      );

    // Redirect the user to the integrations page
    return NextResponse.redirect('/integrations');
  } catch (error: any) {
    console.error('OAuth Callback Error:', error.response?.data || error.message);
    return NextResponse.redirect('/error');
  }
}