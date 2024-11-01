// lib/context/auth.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebase';
import { setCookie, destroyCookie } from 'nookies';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user || null);
      setLoading(false);

      if (user) {
        const token = await user.getIdToken();
        setCookie(null, 'session', token, {
          path: '/',
          maxAge: 30 * 24 * 60 * 60, // 30 days
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        });
      } else {
        destroyCookie(null, 'session');
      }
    });

    // Token refresh every 55 minutes
    const handle = setInterval(async () => {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken(true);
        setCookie(null, 'session', token, {
          path: '/',
          maxAge: 30 * 24 * 60 * 60, // 30 days
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        });
      }
    }, 55 * 60 * 1000);

    return () => {
      unsubscribe();
      clearInterval(handle);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);