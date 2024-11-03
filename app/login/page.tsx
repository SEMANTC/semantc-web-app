// app/login/page.tsx
'use client';

import LoginForm from '@/components/login-form';
import { useAuth } from '@/lib/context/auth';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { authenticate } from './actions';
import { ResultCode } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [user, router]);

  const handleLogin = async (email: string, password: string) => {
    const result = await authenticate(email, password);

    if (result?.type === 'success') {
      // Router.replace will be handled by the useEffect when auth state changes
    } else {
      if (result?.resultCode === ResultCode.InvalidCredentials) {
        setError('Invalid email or password.');
      } else {
        setError('An unknown error occurred.');
      }
    }
  };

  return (
    <main className="flex flex-col p-4">
      <LoginForm onLogin={handleLogin} error={error} />
    </main>
  );
}