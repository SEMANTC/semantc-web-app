// app/api/oauth/xero/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, firestoreAdmin, admin } from '@/lib/firebaseAdmin';
import axios from 'axios';
import { encrypt } from '@/lib/encryption';
import * as fs from 'fs';
import * as path from 'path';

// Custom logging function
function logToFile(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp}: ${message}\n`;
  
  // Log to console
  process.stdout.write(logMessage);
  
  // Also log to file
  fs.appendFileSync(path.join(process.cwd(), 'xero-oauth.log'), logMessage);
}

export async function GET(request: NextRequest) {
  logToFile('=== XERO OAUTH CALLBACK STARTED ===');

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  
  logToFile(`Received authorization code: ${code ? 'Yes' : 'No'}`);

  if (!code) {
    logToFile('No code provided - redirecting to error page');
    return NextResponse.redirect('/integrations?error=no_code');
  }

  try {
    // Session verification
    const sessionCookie = request.cookies.get('session')?.value;
    logToFile(`Session cookie present: ${sessionCookie ? 'Yes' : 'No'}`);

    if (!sessionCookie) {
      logToFile('No session cookie - redirecting to login');
      return NextResponse.redirect('/login');
    }

    // Token verification
    let uid;
    try {
      const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie);
      uid = decodedClaims.uid;
      logToFile(`User authenticated with ID: ${uid}`);
    } catch (error) {
      logToFile(`Session verification failed: ${error}`);
      return NextResponse.redirect('/login');
    }

    // Token exchange
    logToFile('Starting token exchange with Xero');
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
      logToFile('Token exchange successful');
      logToFile(`Token type: ${tokenData.token_type}`);
      logToFile(`Expires in: ${tokenData.expires_in}`);
    } catch (error: any) {
      logToFile(`Token exchange failed: ${error.message}`);
      logToFile(`Error response: ${JSON.stringify(error.response?.data || {})}`);
      return NextResponse.redirect('/integrations?error=token_exchange_failed');
    }

    // Fetch Xero organizations
    logToFile('Fetching Xero organizations');
    let tenant;
    try {
      const connectionsResponse = await axios.get('https://api.xero.com/connections', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!connectionsResponse.data || connectionsResponse.data.length === 0) {
        logToFile('No Xero organizations found');
        return NextResponse.redirect('/integrations?error=no_tenants');
      }

      tenant = connectionsResponse.data[0];
      logToFile(`Found organization: ${tenant.tenantName} (${tenant.tenantId})`);
    } catch (error: any) {
      logToFile(`Failed to fetch organizations: ${error.message}`);
      return NextResponse.redirect('/integrations?error=tenant_fetch_failed');
    }

    // Store in Firestore
    logToFile('Beginning Firestore storage');
    try {
      const batch = firestoreAdmin.batch();

      // Connectors document
      logToFile('Preparing connectors document');
      const connectorRef = firestoreAdmin.collection('connectors').doc(uid);
      const connectorData = {
        active: true,
        provider: 'xero',
        tenantId: tenant.tenantId,
        tenantName: tenant.tenantName,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      batch.set(connectorRef, connectorData, { merge: true });
      logToFile('Added connector document to batch');

      // Credentials document
      logToFile('Preparing credentials document');
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
      logToFile('Added credentials document to batch');

      // Commit batch
      logToFile('Committing Firestore batch');
      await batch.commit();
      logToFile('Successfully stored all data in Firestore');
    } catch (error) {
      logToFile(`Firestore storage failed: ${error}`);
      return NextResponse.redirect('/integrations?error=storage_failed');
    }

    logToFile('=== XERO OAUTH CALLBACK COMPLETED SUCCESSFULLY ===');
    return NextResponse.redirect('/integrations?status=success');

  } catch (error: any) {
    logToFile(`Unexpected error: ${error.message}`);
    logToFile(error.stack || 'No stack trace available');
    return NextResponse.redirect('/integrations?error=unexpected');
  }
}