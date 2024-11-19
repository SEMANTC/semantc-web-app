// app/oauth/shopify/page.tsx
'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function ShopifyAuthPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_SHOPIFY_CLIENT_ID;
    const redirectUri = `${window.location.origin}/api/oauth/shopify/callback`;
    
    // Shopify specific scopes
    const scopes = [
      'read_products',
      'read_orders',
      'read_inventory',
      'read_fulfillments',
      'read_customers',
      'read_analytics',
      'read_reports',
      'read_price_rules',
      'read_marketing_events',
      'read_merchant_managed_fulfillment_orders',
      'read_shopify_payments_payouts'
    ].join(',');

    const state = Math.random().toString(36).substring(2);

    if (!clientId) {
      console.error('Missing Shopify OAuth client ID');
      return;
    }

    // Shopify's OAuth endpoint
    const authUrl = `https://shopify.com/admin/oauth/authorize?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `state=${state}`;

    window.location.href = authUrl;
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center font-manrope">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-4">Connecting to Shopify</h2>
        <p className="text-gray-600">Please wait while we redirect you to Shopify</p>
      </div>
    </div>
  );
}