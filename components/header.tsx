// components/header.tsx
'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/context/auth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  IconGitHub,
  IconSeparator,
  IconVercel,
} from '@/components/ui/icons';
import { UserMenu } from '@/components/user-menu';
import { SidebarMobile } from './sidebar-mobile';
import { SidebarToggle } from './sidebar-toggle';
import { ChatHistory } from './chat-history';

export function Header() {
  const { user } = useAuth(); // Get the user from the client-side auth context

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between w-full h-16 px-4 shrink-0 bg-gradient-to-b from-background/10 via-background/50 to-background/80 backdrop-blur-xl">
      <div className="flex items-center">
        {user ? (
          <>
            <SidebarMobile>
              <ChatHistory userId={user.uid} />
            </SidebarMobile>
            {/* <SidebarToggle /> */}
            <Link href="/new" rel="nofollow">
              <img className="w-auto h-4" src="/images/logo.png" alt="Semantc logo" />
            </Link>
          </>
        ) : (
          <Link href="/new" rel="nofollow">
            <img className="w-auto h-4" src="/images/logo.png" alt="Semantc logo" />
          </Link>
        )}
        <div className="flex items-center">
          <IconSeparator className="size-6 text-zinc-200" />
          {user ? (
            <UserMenu />
          ) : (
            <Button variant="link" asChild className="-ml-2">
              <Link href="/login">login</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}