// components/user-menu.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/lib/context/auth';

function getUserInitials(email: string) {
  const [namePart] = email.split('@');
  const initials = namePart
    .split('.')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
  return initials || 'U';
}

export function UserMenu() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  if (!user) {
    router.push('/login');
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    // No need to manually push to /login as it's handled in the auth context
  };

  return (
    <div className="flex items-center justify-between font-manrope">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="pl-0">
            <div className="flex size-7 shrink-0 select-none items-center justify-center rounded-full bg-muted/50 text-xs font-medium uppercase text-muted-foreground">
              {getUserInitials(user.email || '')}
            </div>
            <span className="ml-2 hidden md:block">{user.email}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent sideOffset={8} align="start" className="w-fit font-manrope">
          <DropdownMenuItem className="flex-col items-start">
            <div className="text-xs text-zinc-500">{user.email}</div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}