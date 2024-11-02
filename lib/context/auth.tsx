// lib/context/auth.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth } from '../firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          // Get fresh ID token
          const idToken = await user.getIdToken(true);
          
          // Set session cookie
          const response = await fetch('/api/set-session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ idToken }),
          });

          if (!response.ok) {
            throw new Error('Failed to set session');
          }
        }
        setUser(user);
      } catch (error) {
        console.error('Auth state change error:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Set up token refresh
  useEffect(() => {
    if (!user) return;

    const handle = setInterval(async () => {
      try {
        // Force token refresh
        const idToken = await user.getIdToken(true);
        
        // Update session
        await fetch('/api/set-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ idToken }),
        });
      } catch (error) {
        console.error('Token refresh error:', error);
      }
    }, 10 * 60 * 1000); // Refresh every 10 minutes

    return () => clearInterval(handle);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);