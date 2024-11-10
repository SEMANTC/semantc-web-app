// components/login-form.tsx
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { IconSpinner } from './ui/icons';
import { useRouter } from 'next/navigation';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Manrope } from 'next/font/google';

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  error: string | null;
}

export default function LoginForm({ onLogin, error }: LoginFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // State for email and password
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      // Wait for the auth state to be ready
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (result.user) {
        toast.success('successfully signed in');
        router.replace('/');
      }
    } catch (error: any) {
      console.error('error during Google sign in:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        toast.error('sign in cancelled');
      } else {
        toast.error(error.message || 'failed to sign in with Google');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onLogin(email, password);
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 space-y-3">
      <div className="w-full flex-1 border bg-white px-6 pb-4 pt-8 shadow-md md:w-96 dark:bg-zinc-950">
        {/* Email/Password Login Form */}
        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Email"
            className="p-2 border rounded"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Password"
            className="p-2 border rounded"
          />
          {error && <div className="text-red-500">{error}</div>}
          <button
            type="submit"
            disabled={isLoading}
            className={`${manrope.className} h-10 w-full flex items-center justify-center gap-2 border bg-zinc-900 p-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50`}
          >
            {isLoading ? <IconSpinner /> : 'Login'}
          </button>
        </form>

        <div className="my-4 text-center text-zinc-500">or</div>

        {/* Google Sign-In Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          type="button"
          className={`${manrope.className} flex h-10 w-full items-center justify-center gap-2 border bg-white p-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-50 dark:bg-zinc-950 dark:hover:bg-zinc-900`}
        >
          {isLoading ? (
            <IconSpinner />
          ) : (
            <>
              {/* Google Icon SVG */}
              <svg viewBox="0 0 24 24" className="h-5 w-5">
                <path
                  d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z"
                  fill="#EA4335"
                />
                <path
                  d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z"
                  fill="#4285F4"
                />
                <path
                  d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z"
                  fill="#FBBC05"
                />
                <path
                  d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.2654 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z"
                  fill="#34A853"
                />
              </svg>
              Continue with Google
            </>
          )}
        </button>
      </div>

      <Link href="/signup" className="flex flex-row gap-1 text-sm text-zinc-400">
        <span className={manrope.className}>No account yet?</span>{' '}
        <div className={`${manrope.className} font-semibold underline`}>Sign up</div>
      </Link>
    </div>
  );
}