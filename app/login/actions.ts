'use server'

import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { ResultCode } from '@/lib/utils'
import { z } from 'zod'

interface Result {
  type: string
  resultCode: ResultCode
}

export async function authenticate(
  _prevState: Result | undefined,
  formData: FormData
): Promise<Result | undefined> {
  try {
    const email = formData.get('email')
    const password = formData.get('password')

    const parsedCredentials = z
      .object({
        email: z.string().email(),
        password: z.string().min(6)
      })
      .safeParse({
        email,
        password
      })

    if (!parsedCredentials.success) {
      return {
        type: 'error',
        resultCode: ResultCode.InvalidCredentials
      }
    }

    try {
      await signInWithEmailAndPassword(auth, email as string, password as string)
      return {
        type: 'success',
        resultCode: ResultCode.UserLoggedIn
      }
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential') {
        return {
          type: 'error',
          resultCode: ResultCode.InvalidCredentials
        }
      }
      return {
        type: 'error',
        resultCode: ResultCode.UnknownError
      }
    }
  } catch (error) {
    return {
      type: 'error',
      resultCode: ResultCode.UnknownError
    }
  }
}