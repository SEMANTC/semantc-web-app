// app/api/oauth/shopify/callback/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, firestoreAdmin, admin } from '@/lib/firebaseAdmin';
import axios, { AxiosError } from 'axios';
import { encrypt } from '@/lib/encryption';

const PROVISION_ENDPOINT = process.env.PROVISION_CONNECTOR_URL || 'https://us-central1-semantc-sandbox.cloudfunctions.net/provision-connector';
const PROVISION_TIMEOUT = 150000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

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
        connectorType: 'shopify'
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!functionResponse.ok) {
      const errorText = await functionResponse.text();
      
      if (functionResponse.status >= 500 && retryCount < MAX_RETRIES) {
        console.log(`Retrying provisioning attempt ${retryCount + 1} of ${MAX_RETRIES}`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return triggerProvisioning(uid, connectorRef, retryCount + 1);
      }
      
      throw new Error(`Provisioning failed: ${errorText}`);
    }

    return functionResponse;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('Resource provisioning timed out');
      await connectorRef.set({
        provisioningStatus: 'timeout',
        lastProvisioningAttempt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      throw error;
    }

    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying provisioning attempt ${retryCount + 1} of ${MAX_RETRIES}`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return triggerProvisioning(uid, connectorRef, retryCount + 1);
    }
    throw error;
  }
}

export async function GET(request: NextRequest) {
  console.log('\n=== START SHOPIFY OAUTH CALLBACK ===');
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const shop = searchParams.get('shop');
  const state = searchParams.get('state');
  const baseUrl = new URL(request.url).origin;

  if (!code || !shop) {
    console.log('Missing code or shop parameter');
    return NextResponse.redirect(`${baseUrl}/integrations?error=missing_params`);
  }

  try {
    // Verify session
    const sessionCookie = request.cookies.get('session')?.value;
    if (!sessionCookie) {
      return NextResponse.redirect(`${baseUrl}/login`);
    }

    const decodedToken = await adminAuth.verifyIdToken(sessionCookie);
    const uid = decodedToken.uid;

    // Exchange code for access token
    const tokenResponse = await axios.post(
      `https://${shop}/admin/oauth/access_token`,
      {
        client_id: process.env.SHOPIFY_CLIENT_ID,
        client_secret: process.env.SHOPIFY_CLIENT_SECRET,
        code: code
      }
    );

    const accessToken = tokenResponse.data.access_token;

    if (!accessToken) {
      return NextResponse.redirect(`${baseUrl}/integrations?error=token_exchange_failed`);
    }

    // Store in Firestore
    const batch = firestoreAdmin.batch();
    const userRef = firestoreAdmin.collection('users').doc(uid);
    const connectorRef = userRef.collection('integrations').doc('connectors');

    // Update connectors document
    const connectorUpdate = {
      active: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      provisioningStatus: 'pending',
      shopify: {
        active: true,
        shop: shop,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }
    };
    batch.set(connectorRef, connectorUpdate, { merge: true });

    // Update credentials document
    const credentialsRef = userRef.collection('integrations').doc('credentials');
    const credentialsUpdate = {
      shopify: {
        accessToken: encrypt(accessToken),
        shop: shop,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      }
    };
    batch.set(credentialsRef, credentialsUpdate, { merge: true });

    await batch.commit();

    // Trigger provisioning
    try {
      await triggerProvisioning(uid, connectorRef);
      await connectorRef.set({
        provisioningStatus: 'initiated',
        lastProvisioningAttempt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Failed to trigger provisioning:', error);
      await connectorRef.set({
        provisioningStatus: 'failed',
        provisioningError: error instanceof Error ? error.message : 'Unknown error',
        lastProvisioningAttempt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    return NextResponse.redirect(`${baseUrl}/integrations?status=success`);

  } catch (error) {
    console.error('UNEXPECTED ERROR:', error);
    return NextResponse.redirect(`${baseUrl}/integrations?error=unexpected`);
  }
}