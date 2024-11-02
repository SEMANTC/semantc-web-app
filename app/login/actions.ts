// app/login/actions.ts
'use client';

import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { ResultCode } from '@/lib/utils';
import { z } from 'zod';

interface Result {
  type: string;
  resultCode: ResultCode;
}

export async function authenticate(email: string, password: string): Promise<Result | undefined> {
  try {
    const parsedCredentials = z
      .object({
        email: z.string().email(),
        password: z.string().min(6),
      })
      .safeParse({
        email,
        password,
      });

    if (!parsedCredentials.success) {
      return {
        type: 'error',
        resultCode: ResultCode.InvalidCredentials,
      };
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();

      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to set session');
      }

      return {
        type: 'success',
        resultCode: ResultCode.UserLoggedIn,
      };
    } catch (error: any) {
      if (
        error.code === 'auth/invalid-credential' ||
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/wrong-password'
      ) {
        return {
          type: 'error',
          resultCode: ResultCode.InvalidCredentials,
        };
      }
      return {
        type: 'error',
        resultCode: ResultCode.UnknownError,
      };
    }
  } catch (error) {
    return {
      type: 'error',
      resultCode: ResultCode.UnknownError,
    };
  }
}