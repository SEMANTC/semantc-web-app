'use server'

// import { signIn } from '@/auth'
import { User } from '@/lib/types'
// import { AuthError } from 'next-auth'
import { z } from 'zod'
// import { kv } from '@vercel/kv'
import { ResultCode } from '@/lib/utils'

export async function getUser(email: string) {
  // const user = await kv.hgetall<User>(`user:${email}`)
  // return user
  console.log('Getting user:', email)
  return null // For now, always return null to simulate no user found
}

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

    if (parsedCredentials.success) {
      // Commented out authentication logic
      // await signIn('credentials', {
      //   email,
      //   password,
      //   redirect: false
      // })

      // For now, always return success
      return {
        type: 'success',
        resultCode: ResultCode.UserLoggedIn
      }
    } else {
      return {
        type: 'error',
        resultCode: ResultCode.InvalidCredentials
      }
    }
  } catch (error) {
    // if (error instanceof AuthError) {
    //   switch (error.type) {
    //     case 'CredentialsSignin':
    //       return {
    //         type: 'error',
    //         resultCode: ResultCode.InvalidCredentials
    //       }
    //     default:
    //       return {
    //         type: 'error',
    //         resultCode: ResultCode.UnknownError
    //       }
    //   }
    // }
    return {
      type: 'error',
      resultCode: ResultCode.UnknownError
    }
  }
}