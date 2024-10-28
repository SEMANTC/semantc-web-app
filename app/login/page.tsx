'use client'

import LoginForm from '@/components/login-form'
import { useAuth } from '@/lib/context/auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function LoginPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      router.push('/')
    }
  }, [user, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-zinc-500">Loading...</div>
      </div>
    )
  }

  return (
    <main className="flex flex-col p-4">
      <LoginForm />
    </main>
  )
}