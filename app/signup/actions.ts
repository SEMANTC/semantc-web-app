'use server'

import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { ResultCode } from '@/lib/utils'
import { z } from 'zod'

interface Result {
  type: string
  resultCode: ResultCode
}

export async function signup(
  _prevState: Result | undefined,
  formData: FormData
): Promise<Result | undefined> {
  try {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

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
      await createUserWithEmailAndPassword(auth, email, password)
      return {
        type: 'success',
        resultCode: ResultCode.UserCreated
      }
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        return {
          type: 'error',
          resultCode: ResultCode.UserAlreadyExists
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