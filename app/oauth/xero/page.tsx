// app/oauth/xero/page.tsx
'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function XeroOAuthPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_XERO_CLIENT_ID;
    const redirectUri = `${window.location.origin}/api/oauth/callback`;
    
    // console.log('Initiating Xero OAuth flow');
    // console.log('Redirect URI:', redirectUri);

    const scopes = [
      'openid',
      'profile',
      'email',
      'accounting.transactions.read',
      'accounting.reports.read',
      'accounting.reports.tenninetynine.read',
      'accounting.journals.read',
      'accounting.settings.read',
      'accounting.contacts.read',
      'accounting.attachments.read',
      'accounting.budgets.read',
      'offline_access'
    ].join(' ');

    const state = Math.random().toString(36).substring(2);

    if (!clientId) {
      console.error('Missing Xero OAuth client ID');
      return;
    }

    const authUrl = `https://login.xero.com/identity/connect/authorize?` +
      `response_type=code&` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `state=${state}`;

    window.location.href = authUrl;
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center font-manrope">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-4">Connecting to Xero</h2>
        <p className="text-gray-600">please wait while we redirect you to Xero</p>
      </div>
    </div>
  );
}