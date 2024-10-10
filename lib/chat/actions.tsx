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
  const response = await fetch(`${CLOUD_RUN_API_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json()
}

async function submitUserMessage(content: string) {
  'use server'

  const aiState = getMutableAIState()

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'user',
        content: content
      }
    ]
  })

  const history = aiState.get().messages.map(message => ({
    role: message.role,
    content: message.content
  }))

  const spinnerStream = createStreamableUI(<SpinnerMessage />)
  const messageStream = createStreamableUI(null)

  ;(async () => {
    try {
      const result = await callCloudRunAPI('/chat', 'POST', { messages: history })

      spinnerStream.done(null)
      messageStream.update(<BotMessage content={result.message} />)

      aiState.done({
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
      console.error(e)

      const error = new Error(
        'There was an error processing your request. Please try again later.'
      )
      messageStream.error(error)
      aiState.done()
    }
  })()

  return {
    id: nanoid(),
    display: messageStream.value
  }
}

export type Message = {
  role: 'user' | 'assistant' | 'system'
  content: string
  id?: string
}

export type AIState = {
  chatId: string
  messages: Message[]
}

export type UIState = {
  id: string
  display: React.ReactNode
}[]

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
        return aiState.messages.map((message, index) => ({
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

      await saveChat(chat)
    }
  }
})