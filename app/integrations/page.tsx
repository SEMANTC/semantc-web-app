// app/integrations/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/context/auth';

interface ConnectorData {
  active: boolean;
  integrations: {
    xero?: {
      active: boolean;
      tenantId: string;
      tenantName: string;
      updatedAt: Date;
    };
    shopify?: {
      active: boolean;
      tenantId: string;
      tenantName: string;
      updatedAt: Date;
    };
  };
}

export default function IntegrationsPage() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const error = searchParams.get('error');
  const { user } = useAuth();
  const [connectorData, setConnectorData] = useState<ConnectorData | null>(null);

  useEffect(() => {
    if (status === 'success') {
      toast.success('Integration connected successfully!');
    }

    if (error) {
      switch (error) {
        case 'no_code':
          toast.error('Authorization code missing');
          break;
        case 'no_organizations':
          toast.error('No organizations found');
          break;
        case 'token_exchange_failed':
          toast.error('Failed to connect');
          break;
        default:
          toast.error('An error occurred during connection');
      }
    }
  }, [status, error]);

  useEffect(() => {
    async function fetchConnectorData() {
      if (!user) return;

      try {
        const response = await fetch('/api/check-connector', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setConnectorData(data);
        }
      } catch (error) {
        console.error('Error fetching connector data:', error);
      }
    }

    fetchConnectorData();
  }, [user]);

  const handleDisconnect = async (platform: 'xero' | 'shopify') => {
    try {
      const response = await fetch(`/api/disconnect/${platform}`, {
        method: 'POST',
        credentials: 'include'
      });
  
      if (response.ok) {
        setConnectorData(prev => prev ? {
          ...prev,
          integrations: {
            ...prev.integrations,
            [platform]: undefined
          }
        } : null);
        toast.success(`Successfully disconnected from ${platform}`);
      } else {
        toast.error(`Failed to disconnect from ${platform}`);
      }
    } catch (error) {
      console.error(`Error disconnecting from ${platform}:`, error);
      toast.error(`Failed to disconnect from ${platform}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 font-manrope">
      <h1 className="text-2xl font-bold mb-6">Integrations</h1>
      
      <div className="grid gap-6">
        {/* Xero Integration Card */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Xero</h2>
          {connectorData?.integrations?.xero?.active ? (
            <div>
              <p>Connected to: {connectorData.integrations.xero.tenantName}</p>
              <p className="text-sm text-gray-500">
                Connected on: {new Date(connectorData.integrations.xero.updatedAt).toLocaleDateString()}
              </p>
              <button
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                onClick={() => handleDisconnect('xero')}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <a
              href="/oauth/xero"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Connect to Xero
            </a>
          )}
        </div>

        {/* Shopify Integration Card */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Shopify</h2>
          {connectorData?.integrations?.shopify?.active ? (
            <div>
              <p>Connected to: {connectorData.integrations.shopify.tenantName}</p>
              <p className="text-sm text-gray-500">
                Connected on: {new Date(connectorData.integrations.shopify.updatedAt).toLocaleDateString()}
              </p>
              <button
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                onClick={() => handleDisconnect('shopify')}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <a
              href="/oauth/shopify"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Connect to Shopify
            </a>
          )}
        </div>
      </div>
    </div>
  );
}