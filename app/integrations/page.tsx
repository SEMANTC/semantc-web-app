// app/integrations/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/context/auth';

interface ConnectedApps {
  xero?: {
    tenantName: string;
    connectedAt: Date;
  };
}

export default function IntegrationsPage() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const error = searchParams.get('error');
  const { user } = useAuth();
  const [connectedApps, setConnectedApps] = useState<ConnectedApps | null>(null);

  useEffect(() => {
    if (status === 'success') {
      toast.success('Successfully connected to Xero!');
    }

    if (error) {
      switch (error) {
        case 'no_code':
          toast.error('Authorization code missing from Xero');
          break;
        case 'no_tenants':
          toast.error('No Xero organizations found');
          break;
        case 'oauth_failed':
          toast.error('Failed to connect to Xero');
          break;
        default:
          toast.error('An error occurred while connecting to Xero');
      }
    }
  }, [status, error]);

  useEffect(() => {
    async function fetchConnectedApps() {
      if (!user) return;

      try {
        const response = await fetch('/api/user/connected-apps', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setConnectedApps(data.connectedApps);
        }
      } catch (error) {
        console.error('Error fetching connected apps:', error);
      }
    }

    fetchConnectedApps();
  }, [user]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Integrations</h1>
      
      <div className="grid gap-6">
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Xero</h2>
          {connectedApps?.xero ? (
            <div>
              <p>Connected to: {connectedApps.xero.tenantName}</p>
              <p className="text-sm text-gray-500">
                Connected on: {new Date(connectedApps.xero.connectedAt).toLocaleDateString()}
              </p>
              <button
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                onClick={() => {/* Add disconnect handler */}}
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
      </div>
    </div>
  );
}