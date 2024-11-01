// app/oauth/xero/page.tsx
'use client';

import { useEffect } from 'react';

export default function XeroOAuthPage() {
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_XERO_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_XERO_REDIRECT_URI;

    const scopes = encodeURIComponent(
      'openid profile email accounting.transactions.read accounting.reports.read accounting.reports.tenninetynine.read accounting.journals.read accounting.settings.read accounting.contacts.read accounting.attachments.read accounting.budgets.read offline_access'
    );

    const state = Math.random().toString(36).substring(2);

    if (!clientId || !redirectUri) {
      console.error('Missing Xero OAuth environment variables.');
      return;
    }

    const authorizationUrl = `https://login.xero.com/identity/connect/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=${scopes}&state=${state}`;

    window.location.href = authorizationUrl;
  }, []);

  return <p>Redirecting to Xero for authentication...</p>;
}