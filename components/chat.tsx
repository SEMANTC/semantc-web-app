// components/chat.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { nanoid } from '@/lib/utils';
import { useAIState, useUIState } from 'ai/rsc';
import { useLocalStorage } from '@/lib/hooks/use-local-storage';
import { useScrollAnchor } from '@/lib/hooks/use-scroll-anchor';
import { cn } from '@/lib/utils';
import { ChatList } from '@/components/chat-list';
import { ChatPanel } from '@/components/chat-panel';
import { EmptyScreen } from '@/components/empty-screen';
import { Message } from '@/lib/chat/actions';

export interface ChatProps extends React.ComponentProps<'div'> {
  initialMessages?: Message[];
  id?: string;
}

export function Chat({ id, className }: ChatProps) {
  const router = useRouter();
  const path = usePathname();
  const [input, setInput] = useState('');
  const [messages] = useUIState();
  const [aiState] = useAIState();

  const [_, setNewChatId] = useLocalStorage('newChatId', id);

  useEffect(() => {
    if (!id) {
      const newId = nanoid();
      setNewChatId(newId);
      router.replace(`/chat/${newId}`);
    } else {
      setNewChatId(id);
    }
  }, [id, router, setNewChatId]);

  useEffect(() => {
    if (!path.includes('chat') && messages.length === 1) {
      window.history.replaceState({}, '', `/chat/${id}`);
    }
  }, [id, path, messages]);

  useEffect(() => {
    const messagesLength = aiState.messages?.length;
    if (messagesLength === 2) {
      router.refresh();
    }
  }, [aiState.messages, router]);

  const { messagesRef, scrollRef, visibilityRef, isAtBottom, scrollToBottom } =
    useScrollAnchor();

  return (
    <div className={cn('flex flex-col h-full w-full', className)}>
      <div className="flex-1 overflow-auto w-full" ref={scrollRef}>
        <div className="max-w-5xl mx-auto pb-32" ref={messagesRef}>
          {messages.length ? (
            <ChatList messages={messages} isShared={false} />
          ) : (
            <EmptyScreen />
          )}
          <div ref={visibilityRef} />
        </div>
      </div>
      <ChatPanel
        id={id}
        input={input}
        setInput={setInput}
        isAtBottom={isAtBottom}
        scrollToBottom={scrollToBottom}
      />
    </div>
  );
}