// components/chat-history.tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { SidebarList } from '@/components/sidebar-list';
import { buttonVariants } from '@/components/ui/button';
import { IconPlus } from '@/components/ui/icons';
import { nanoid } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useLocalStorage } from '@/lib/hooks/use-local-storage';

interface ChatHistoryProps {
  userId?: string;
}

export function ChatHistory({ userId }: ChatHistoryProps) {
  const router = useRouter();
  const [_, setNewChatId] = useLocalStorage('newChatId', '');

  const handleNewChat = () => {
    const newChatId = nanoid();
    setNewChatId(newChatId);
    router.push(`/chat/${newChatId}`);
  };

  return (
    <div className="flex flex-col h-full font-manrope">
      <div className="flex items-center justify-between p-4">
        <h4 className="text-sm font-medium">Chat History</h4>
      </div>
      <div className="mb-2 px-2">
        <button
          onClick={handleNewChat}
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'h-10 w-full justify-start bg-zinc-50 px-4 shadow-none transition-colors hover:bg-zinc-200/40 font-manrope'
          )}
        >
          <IconPlus className="-translate-x-2 stroke-2" />
          New Chat
        </button>
      </div>
      <React.Suspense
        fallback={
          <div className="flex flex-col flex-1 px-4 space-y-4 overflow-auto">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="w-full h-6 rounded-lg shrink-0 animate-pulse bg-zinc-150"
              />
            ))}
          </div>
        }
      >
        {/* @ts-ignore */}
        <SidebarList userId={userId} />
      </React.Suspense>
    </div>
  );
}