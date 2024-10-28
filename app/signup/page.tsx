'use client'

import SignupForm from '@/components/signup-form'
import { useAuth } from '@/lib/context/auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function SignupPage() {
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

  return <SignupForm />
}