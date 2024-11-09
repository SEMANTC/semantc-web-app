// app/api/oauth/callback/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, firestoreAdmin, admin } from '@/lib/firebaseAdmin';
import axios, { AxiosError } from 'axios';
import { encrypt } from '@/lib/encryption';

const PROVISION_ENDPOINT = process.env.PROVISION_CONNECTOR_URL || 'https://us-central1-semantc-sandbox.cloudfunctions.net/provision-connector';
const PROVISION_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

interface ProvisionError extends Error {
  name: string;
  message: string;
}

async function triggerProvisioning(uid: string, connectorRef: any, retryCount = 0) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROVISION_TIMEOUT);

    const functionResponse = await fetch(PROVISION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        userId: uid,
        connectorType: 'xero'
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!functionResponse.ok) {
      const errorText = await functionResponse.text();
      
      // Retry on 5xx errors
      if (functionResponse.status >= 500 && retryCount < MAX_RETRIES) {
        console.log(`Retrying provisioning attempt ${retryCount + 1} of ${MAX_RETRIES}`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return triggerProvisioning(uid, connectorRef, retryCount + 1);
      }
      
      throw new Error(`Provisioning failed: ${errorText}`);
    }

    return functionResponse;
  } catch (error) {
    const provisionError = error as ProvisionError;
    
    if (provisionError.name === 'AbortError') {
      console.error('Resource provisioning timed out');
      await connectorRef.set({
        provisioningStatus: 'timeout',
        lastProvisioningAttempt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      throw provisionError;
    }

    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying provisioning attempt ${retryCount + 1} of ${MAX_RETRIES}`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return triggerProvisioning(uid, connectorRef, retryCount + 1);
    }
    throw provisionError;
  }
}

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
      const authError = error as Error;
      console.error('Token verification failed:', authError.message);
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
      const axiosError = error as AxiosError;
      console.error('Token exchange failed:', axiosError.message);
      return NextResponse.redirect(`${baseUrl}/integrations?error=token_exchange_failed`);
    }

    const tokenData = tokenResponse.data;
    console.log('Validating token data...');
    if (!tokenData?.access_token || !tokenData?.refresh_token) {
      console.error('Invalid token data received:', tokenData);
      return NextResponse.redirect(`${baseUrl}/integrations?error=invalid_token_data`);
    }

    // Fetch Xero organizations
    console.log('Fetching Xero organizations...');
    let tenant;
    try {
      const connectionsResponse = await axios.get('https://api.xero.com/connections', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!connectionsResponse.data?.length) {
        console.log('No Xero organizations found');
        return NextResponse.redirect(`${baseUrl}/integrations?error=no_organizations`);
      }

      tenant = connectionsResponse.data[0];
      console.log('Found organization:', tenant.tenantName);
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Failed to fetch organizations:', axiosError.message);
      return NextResponse.redirect(`${baseUrl}/integrations?error=fetch_org_failed`);
    }

    // Store in Firestore with new structure
    try {
      const batch = firestoreAdmin.batch();
      const userRef = firestoreAdmin.collection('users').doc(uid);
      const connectorRef = userRef.collection('integrations').doc('connectors');

      // Update integrations/connectors document
      const connectorUpdate = {
        active: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        provisioningStatus: 'pending',
        xero: {
          active: true,
          tenantId: tenant.tenantId,
          tenantName: tenant.tenantName,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }
      };
      batch.set(connectorRef, connectorUpdate, { merge: true });

      // Update integrations/credentials document
      const credentialsRef = userRef.collection('integrations').doc('credentials');
      const credentialsUpdate = {
        xero: {
          accessToken: encrypt(tokenData.access_token),
          refreshToken: encrypt(tokenData.refresh_token),
          expiresAt: Math.floor(Date.now() / 1000) + tokenData.expires_in,
          tokenType: tokenData.token_type,
          scope: tokenData.scope,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        }
      };
      batch.set(credentialsRef, credentialsUpdate, { merge: true });

      await batch.commit();
      console.log('Successfully stored data in Firestore');

      // Trigger resource provisioning
      try {
        await triggerProvisioning(uid, connectorRef);
        
        // Update Firestore with successful provisioning status
        await connectorRef.set({
          provisioningStatus: 'initiated',
          lastProvisioningAttempt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        console.log('Resource provisioning triggered successfully');
      } catch (error) {
        const provisionError = error as Error;
        console.error('Failed to trigger resource provisioning:', provisionError.message);
        
        // Update Firestore with error status
        await connectorRef.set({
          provisioningStatus: 'failed',
          provisioningError: provisionError.message,
          lastProvisioningAttempt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        // Continue anyway since Firestore update was successful
      }

    } catch (error) {
      const firestoreError = error as Error;
      console.error('Firestore storage failed:', firestoreError.message);
      return NextResponse.redirect(`${baseUrl}/integrations?error=storage_failed`);
    }

    console.log('=== XERO OAUTH CALLBACK COMPLETED SUCCESSFULLY ===');
    return NextResponse.redirect(`${baseUrl}/integrations?status=success`);

  } catch (error) {
    const unexpectedError = error as Error;
    console.error('=== UNEXPECTED ERROR ===');
    console.error(unexpectedError.message);
    return NextResponse.redirect(`${baseUrl}/integrations?error=unexpected`);
  }
}