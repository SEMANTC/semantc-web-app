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

      const res = await fetch('/api/check-connector');
      if (res.ok) {
        const data = await res.json();
        if (!data.active) {
          router.push('/integrations');
        }
      }
    }

    if (!loading) {
      checkConnector();
    }
  }, [user, loading, router]);

  return <>{children}</>;
}