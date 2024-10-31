// app/(chat)/chat/[id]/page.tsx
import { type Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getChat } from '@/app/actions';
import { Chat } from '@/components/chat';
import { AI } from '@/lib/chat/actions';
import { getServerUser } from '@/lib/server-auth';

export interface ChatPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: ChatPageProps): Promise<Metadata> {
  const user = await getServerUser();

  if (!user) {
    return {};
  }

  const chat = await getChat(params.id, user.uid);
  return {
    title: chat?.title?.toString().slice(0, 50) ?? 'Chat',
  };
}

export default async function ChatPage({ params }: ChatPageProps) {
  const user = await getServerUser();

  if (!user) {
    redirect(`/login?next=/chat/${params.id}`);
  }

  const chat = await getChat(params.id, user.uid);

  if (!chat) {
    redirect('/');
  }

  if (chat?.userId !== user.uid) {
    notFound();
  }

  return (
    <AI
      initialAIState={{
        chatId: chat.id,
        messages: chat.messages,
        processingState: 'idle',
      }}
    >
      <Chat id={chat.id} initialMessages={chat.messages} />
    </AI>
  );
}