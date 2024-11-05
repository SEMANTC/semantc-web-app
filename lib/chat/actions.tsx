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

const CLOUD_RUN_API_URL = process.env.CLOUD_RUN_API_URL;

if (!CLOUD_RUN_API_URL) {
  throw new Error('CLOUD_RUN_API_URL is not set in the environment variables');
}

export type ProcessingState = 'idle' | 'processing' | 'understanding' | 'querying' | 'answering';

export type AIState = {
  chatId: string;
  messages: Message[];
  processingState: ProcessingState;
};

async function callCloudRunAPI(endpoint: string, method: string, body?: any) {
  const fullUrl = `${CLOUD_RUN_API_URL}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds timeout

  try {
    const response = await fetch(fullUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      next: { revalidate: 0 }
    });

    clearTimeout(timeoutId);
    const responseText = await response.text();

    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      console.error(`Error body: ${responseText}`);
      throw new Error(`HTTP error! status: ${response.status}, body: ${responseText}`);
    }

    return JSON.parse(responseText);
  } catch (err: unknown) { // Type the error
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        throw new Error('Request timed out after 60 seconds');
      }
      console.error('Error in API call:', err);
      throw err;
    }
    // For unknown errors
    console.error('Unknown error in API call');
    throw new Error('An unknown error occurred');
  } finally {
    clearTimeout(timeoutId);
  }
}

async function submitUserMessage(content: string) {
  'use server';

  const user = await getServerUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const aiState = getMutableAIState();

  aiState.update({
    ...aiState.get(),
    processingState: 'processing',
  });

  const newMessage = {
    id: nanoid(),
    role: 'user',
    content: content,
  };

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

    aiState.update({ ...aiState.get(), processingState: 'answering' });

    spinnerStream.done(null);

    const responseContent = result.sql_query
      ? `${result.message}\n\nSQL Query:\n\`\`\`sql\n${result.sql_query}\n\`\`\``
      : result.message;

    messageStream.update(<BotMessage content={responseContent} />);

    aiState.update({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'assistant',
          content: responseContent,
        },
      ],
      processingState: 'idle',
    });

    const { chatId, messages } = aiState.get();
    const createdAt = new Date();
    const path = `/chat/${chatId}`;
    const title = messages[0]?.content.substring(0, 100) || 'New Chat';

    const chat: Chat = {
      id: chatId,
      title,
      userId: user.uid,
      createdAt,
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
  onSetAIState: async ({ state }) => {
    'use server';

    const user = await getServerUser();

    if (user) {
      const { chatId, messages } = state;
      const createdAt = new Date();
      const path = `/chat/${chatId}`;
      const title = messages[0]?.content.substring(0, 100) || 'New Chat';

      const chat: Chat = {
        id: chatId,
        title,
        userId: user.uid,
        createdAt,
        messages,
        path,
      };

      try {
        await saveChat(chat);
      } catch (error) {
        console.error('Error saving chat:', error);
      }
    }
  },
});