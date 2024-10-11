import 'server-only'

import {
  createAI,
  createStreamableUI,
  getMutableAIState,
  getAIState,
} from 'ai/rsc'

import { BotMessage, UserMessage, SpinnerMessage } from '@/components/stocks/message'
import { nanoid } from '@/lib/utils'
import { saveChat } from '@/app/actions'
import { Chat } from '@/lib/types'
import { auth } from '@/auth'

const CLOUD_RUN_API_URL = process.env.CLOUD_RUN_API_URL

if (!CLOUD_RUN_API_URL) {
  throw new Error('CLOUD_RUN_API_URL is not set in the environment variables')
}

async function callCloudRunAPI(endpoint: string, method: string, body?: any) {
  const fullUrl = `${CLOUD_RUN_API_URL}${endpoint}`;
  console.log(`Calling Cloud Run API: ${fullUrl}`);
  console.log('Request body:', JSON.stringify(body));

  try {
    const response = await fetch(fullUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseText = await response.text();
    console.log('Raw response:', responseText);

    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`);
      console.error(`Error body: ${responseText}`);
      throw new Error(`HTTP error! status: ${response.status}, body: ${responseText}`);
    }

    return JSON.parse(responseText);
  } catch (error) {
    console.error('Error in API call:', error);
    throw error;
  }
}

async function submitUserMessage(content: string) {
  'use server'

  const aiState = getMutableAIState()

  const newMessage = {
    id: nanoid(),
    role: 'user',
    content: content
  }

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      newMessage
    ]
  })

  const history = aiState.get().messages.map((message: Message) => ({
    role: message.role,
    content: message.content
  }))

  const spinnerStream = createStreamableUI(<SpinnerMessage />)
  const messageStream = createStreamableUI(null)

  try {
    console.log('Sending request to Cloud Run:', JSON.stringify({ messages: history }))

    const result = await callCloudRunAPI('/api/chat', 'POST', { messages: history })

    console.log('Received response from Cloud Run:', result)

    spinnerStream.done(null)
    messageStream.update(<BotMessage content={result.message} />)

    aiState.update({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'assistant',
          content: result.message
        }
      ]
    })

    messageStream.done()
  } catch (e) {
    console.error('Error in submitUserMessage:', e)

    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred'
    messageStream.update(<BotMessage content={`Error: ${errorMessage}`} />)
    spinnerStream.done(null)
  }

  return {
    id: nanoid(),
    display: messageStream.value
  }
}

export type Message = {
  role: 'user' | 'assistant' | 'system'
  content: string
  id: string
}

export type AIState = {
  chatId: string
  messages: Message[]
}

export type UIState = {
  id: string
  display: React.ReactNode
}[]

export const getUIStateFromAIState = (aiState: AIState): UIState => {
  return aiState.messages.map((message: Message, index) => ({
    id: `${aiState.chatId}-${index}`,
    display: message.role === 'user' 
      ? <UserMessage>{message.content}</UserMessage>
      : <BotMessage content={message.content} />
  }))
}

export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] },
  onGetUIState: async () => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const aiState = getAIState()

      if (aiState) {
        return aiState.messages.map((message: Message, index: number) => ({
          id: `${aiState.chatId}-${index}`,
          display: message.role === 'user' 
            ? <UserMessage>{message.content}</UserMessage>
            : <BotMessage content={message.content} />
        }))
      }
    }
  },
  onSetAIState: async ({ state }) => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const { chatId, messages } = state

      const createdAt = new Date()
      const userId = session.user.id as string
      const path = `/chat/${chatId}`
      const title = messages[0]?.content.substring(0, 100) || 'New Chat'

      const chat: Chat = {
        id: chatId,
        title,
        userId,
        createdAt,
        messages,
        path
      }

      try {
        await saveChat(chat)
      } catch (error) {
        console.error('Error saving chat:', error)
      }
    }
  }
})