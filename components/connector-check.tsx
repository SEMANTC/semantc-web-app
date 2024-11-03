// components/ConnectorCheck.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/auth';

export default function ConnectorCheck({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    async function checkConnector() {
      if (!user) {
        router.push('/login');
        return;
      }

      const currentPath = window.location.pathname;

      if (currentPath === '/integrations') {
        return;
      }

      try {
        const res = await fetch('/api/check-connector', {
          method: 'GET',
          credentials: 'include',
        });

        if (res.ok) {
          const data = await res.json();
          if (!data.active) {
            router.push('/integrations');
          }
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Error fetching connector status:', error);
        router.push('/login');
      }
    }

    if (!loading) {
      checkConnector();
    }
  }, [user, loading, router]);

  return <>{children}</>;
}