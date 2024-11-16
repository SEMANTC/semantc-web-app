// lib/chat/actions.tsx
import 'server-only';

import {
  createAI,
  createStreamableUI,
  getMutableAIState,
  getAIState,
} from 'ai/rsc';

import { BotMessage, UserMessage, SpinnerMessage } from '@/components/stocks/message';
import { nanoid } from '@/lib/utils';
import { saveChat } from '@/app/actions';
import { Chat } from '@/lib/types';
import { getServerUser } from '@/lib/server-auth';
import { callCloudRunAPI } from '@/lib/cloud-run/client';

export type ProcessingState = 'idle' | 'processing' | 'understanding' | 'querying' | 'answering';

export type AIState = {
  chatId: string;
  messages: Message[];
  processingState: ProcessingState;
};

async function submitUserMessage(content: string) {
  'use server';

  const user = await getServerUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const aiState = getMutableAIState();
  const newMessage = {
    id: nanoid(),
    role: 'user',
    content: content,
  };

  // Update state once with new user message
  aiState.update({
    ...aiState.get(),
    messages: [...aiState.get().messages, newMessage],
    processingState: 'understanding',
  });

  const history = aiState.get().messages.map((message: Message) => ({
    role: message.role,
    content: message.content,
  }));

  const spinnerStream = createStreamableUI(<SpinnerMessage />);
  const messageStream = createStreamableUI(null);

  try {
    aiState.update({ ...aiState.get(), processingState: 'querying' });
    const result = await callCloudRunAPI('/api/chat', 'POST', { messages: history });

    spinnerStream.done(null);

    const responseContent = result.sql_query
      ? `${result.message}\n\nSQL Query:\n\`\`\`sql\n${result.sql_query}\n\`\`\``
      : result.message;

    messageStream.update(<BotMessage content={responseContent} />);

    // Create assistant message
    const assistantMessage = {
      id: nanoid(),
      role: 'assistant',
      content: responseContent,
    };

    // Final state update with both messages
    aiState.update({
      ...aiState.get(),
      messages: [...aiState.get().messages, assistantMessage],
      processingState: 'idle',
    });

    // Only save chat here, after all messages are ready
    const { chatId, messages } = aiState.get();
    const path = `/chat/${chatId}`;
    const title = messages[0]?.content.substring(0, 100) || 'New Chat';

    const chat: Chat = {
      id: chatId,
      title,
      userId: user.uid,
      createdAt: new Date(),
      messages,
      path,
    };

    try {
      await saveChat(chat);
    } catch (error) {
      console.error('Error saving chat:', error);
    }

    messageStream.done();
  } catch (e) {
    console.error('Error in submitUserMessage:', e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
    messageStream.update(<BotMessage content={`Error: ${errorMessage}`} />);
    spinnerStream.done(null);
    aiState.update({ ...aiState.get(), processingState: 'idle' });
  }

  return {
    id: nanoid(),
    display: messageStream.value,
  };
}

export type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  id: string;
};

export type UIState = {
  id: string;
  display: React.ReactNode;
}[];

export const getUIStateFromAIState = (aiState: AIState): UIState => {
  return aiState.messages.map((message: Message, index) => ({
    id: `${aiState.chatId}-${index}`,
    display:
      message.role === 'user' ? (
        <UserMessage>{message.content}</UserMessage>
      ) : (
        <BotMessage content={message.content} />
      ),
  }));
};

export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage,
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [], processingState: 'idle' },
  onGetUIState: async () => {
    'use server';
    const user = await getServerUser();
    if (user) {
      const aiState = getAIState();
      if (aiState) {
        return aiState.messages.map((message: Message, index: number) => ({
          id: `${aiState.chatId}-${index}`,
          display:
            message.role === 'user' ? (
              <UserMessage>{message.content}</UserMessage>
            ) : (
              <BotMessage content={message.content} />
            ),
        }));
      }
    }
    return [];
  },
  onSetAIState: async ({ state }) => { 'use server'; }
});