// app/integrations/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, firestore } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface ConnectedApp {
  [key: string]: any;
}

export default function IntegrationsPage() {
  const [connectedApps, setConnectedApps] = useState<ConnectedApp | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchConnectedApps = async () => {
      const user = auth.currentUser;

      if (!user) {
        router.push('/login');
        return;
      }

      const userDocRef = doc(firestore, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        setConnectedApps(userDocSnap.data().connectedApps);
      } else {
        setConnectedApps({});
      }
    };

    fetchConnectedApps();
  }, [router]);

  return (
    <div className="container mx-auto px-4 py-8 font-manrope text-center">
      <div className="mb-12">
        {/* <h2 className="text-xl font-semibold mb-4">Connected Applications</h2> */}
        {connectedApps === null ? (
          // <p>Loading...</p>
          <p></p>
        ) : Object.keys(connectedApps).length > 0 ? (
          <div className="grid gap-4">
            {Object.entries(connectedApps).map(([appKey, appData]: [string, any]) => (
              <div key={appKey}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  {appKey === 'xero' && (
                    <img
                      src="/images/xero.png"
                      alt="Xero logo"
                      className="w-6 h-6 object-contain"
                    />
                  )}
                  <h3 className="font-semibold">{appKey.toUpperCase()}</h3>
                </div>
                <p>Connected and syncing data</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No connected applications.</p>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-8">Available Integrations</h2>
        <div className="flex flex-col items-center">
          <img
            src="/images/xero.png"
            alt="Xero logo"
            className="w-32 h-32 object-contain mb-4"
          />
          <p className="mb-6 text-gray-600">Connect your Xero account to sync financial data</p>
          <a
            href="/oauth/xero"
            className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-lg"
          >
            CONNECT
          </a>
        </div>
      </div>
    </div>
  );
}