// app/(chat)/page.tsx
import { nanoid } from '@/lib/utils';
import { Chat } from '@/components/chat';
import { AI } from '@/lib/chat/actions';
import { getServerUser } from '@/lib/server-auth';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Semantic Analytics',
};

export default async function IndexPage() {
  const user = await getServerUser();

  if (!user) {
    redirect('/login');
  }

  const id = nanoid();

  return (
    <AI initialAIState={{ chatId: id, messages: [], processingState: 'idle' }}>
      <Chat id={id} />
    </AI>
  );
}