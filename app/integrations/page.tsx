// app/integrations/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { auth, firestore } from '@/lib/firebase'; // Client SDK
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';

export default function IntegrationsPage() {
  const [connectedApps, setConnectedApps] = useState<any>(null);
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
    <div>
      <h1>Your Integrations</h1>
      <div>
        {connectedApps ? (
          Object.keys(connectedApps).length > 0 ? (
            Object.entries(connectedApps).map(([appKey, appData]: any) => (
              <div key={appKey}>
                <h2>{appKey.toUpperCase()}</h2>
                <p>Details: {JSON.stringify(appData)}</p>
                {/* Add buttons to re-sync, disconnect, or manage the integration */}
              </div>
            ))
          ) : (
            <p>No connected applications.</p>
          )
        ) : (
          <p>Loading...</p>
        )}
      </div>
      <h2>Available Integrations</h2>
      <ul>
        <li>
          <a href="/oauth/xero">Connect Xero</a>
        </li>
        {/* Add other integrations as needed */}
      </ul>
    </div>
  );
}