import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { authConfig } from './auth.config'
import { z } from 'zod'

// This is a simplified mock user database. In a real application, you'd use a proper database.
const users = [
  { id: '1', email: 'user@example.com', password: 'password123' }
]

export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({
            email: z.string().email(),
            password: z.string().min(6)
          })
          .safeParse(credentials)

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data
          const user = users.find(user => user.email === email && user.password === password)
          if (user) {
            return { id: user.id, email: user.email }
          }
        }

        return null
      }
    })
  ]
})