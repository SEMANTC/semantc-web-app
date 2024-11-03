// lib/context/auth.tsx
'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User, signOut as firebaseSignOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth } from '../firebase';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const clearSession = useCallback(async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
      await clearSession();
      toast.success('Signed out successfully');
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  }, [clearSession, router]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const idToken = await firebaseUser.getIdToken(true);
          const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ idToken }),
            credentials: 'include',
          });

          if (!response.ok) {
            throw new Error('Failed to set session');
          }
          setUser(firebaseUser);
        } else {
          setUser(null);
          await clearSession();
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setUser(null);
        await clearSession();
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [clearSession]);

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};