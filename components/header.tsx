/* eslint-disable @next/next/no-img-element */
import * as React from 'react'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  IconGitHub,
  IconNextChat,
  IconSeparator,
  IconVercel
} from '@/components/ui/icons'

function Logo() {
  return (
    <>
      <Link href="/new" rel="nofollow">
        <img className="size-6" src="/images/semantc.png" alt="gemini logo" />
      </Link>
      {/* <div className="flex items-center">
        <IconSeparator className="size-6 text-zinc-200" />
      </div> */}
    </>
  )
}

export function Header() {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between w-full h-16 px-4 shrink-0 bg-gradient-to-b from-background/10 via-background/50 to-background/80 backdrop-blur-xl">
      <div className="flex items-center">
        <React.Suspense fallback={<div className="flex-1 overflow-auto" />}>
          <Logo />
        </React.Suspense>
      </div>
      <div className="flex items-center justify-end gap-2">
        {/* Add any additional header items here if needed */}
      </div>
    </header>
  )
}