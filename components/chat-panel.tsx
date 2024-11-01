// components/chat-panel.tsx
import * as React from 'react'
import { ButtonScrollToBottom } from '@/components/button-scroll-to-bottom'
import { FooterText } from '@/components/footer'
import { PromptForm } from '@/components/prompt-form' // Added import
import { useAIState, useActions, useUIState } from 'ai/rsc'
import type { AI } from '@/lib/chat/actions'
import { nanoid } from '@/lib/utils'
import { UserMessage, SpinnerMessage } from './stocks/message'
import { cn } from '@/lib/utils'

export interface ChatPanelProps {
  id?: string
  title?: string
  input: string
  setInput: (value: string) => void
  isAtBottom: boolean
  scrollToBottom: () => void
}

export function ChatPanel({
  id,
  title,
  input,
  setInput,
  isAtBottom,
  scrollToBottom
}: ChatPanelProps) {
  const [aiState] = useAIState()
  const [messages, setMessages] = useUIState<typeof AI>()
  const { submitUserMessage } = useActions()
  const [isLoading, setIsLoading] = React.useState(false)

  const handleSubmit = async (userMessage: string) => {
    setIsLoading(true)
    try {
      setMessages(currentMessages => [
        ...currentMessages,
        {
          id: nanoid(),
          display: <UserMessage>{userMessage}</UserMessage>
        },
        {
          id: nanoid(),
          display: <SpinnerMessage />
        }
      ])

      const responseMessage = await submitUserMessage(userMessage)

      setMessages(currentMessages => 
        currentMessages
          .filter(msg => msg.display && 
            React.isValidElement(msg.display) && 
            msg.display.type !== SpinnerMessage
          )
          .concat(responseMessage)
      )
      
      // Scroll to bottom after new message
      scrollToBottom()
    } catch (error) {
      console.error('Error:', error)
      setMessages(currentMessages => 
        currentMessages.filter(msg => msg.display && 
          React.isValidElement(msg.display) && 
          msg.display.type !== SpinnerMessage
        )
      )
    } finally {
      setIsLoading(false)
    }
  }

  const exampleMessages = [
    {
      subheading: 'list my last 5 bank transactions',
      message: `list my last 5 bank transactions`
    },
    {
      subheading: 'total of outstanding invoices',
      message: 'total of outstanding invoices'
    }
  ]

  return (
    <div className="fixed inset-x-0 bg-white/90 bottom-0 w-full duration-300 ease-in-out peer-[[data-state=open]]:group-[]:lg:pl-[250px] peer-[[data-state=open]]:group-[]:xl:pl-[300px] dark:from-10%">
      <ButtonScrollToBottom
        isAtBottom={isAtBottom}
        scrollToBottom={scrollToBottom}
      />
      
      <div className="mx-auto sm:max-w-2xl sm:px-4">
        <div className="mb-4 grid sm:grid-cols-2 gap-2 sm:gap-4 px-4 sm:px-0">
          {messages.length === 0 &&
            exampleMessages.map((example, index) => (
              <div
                key={example.subheading}
                className={cn(
                  'cursor-pointer bg-zinc-50 text-zinc-950 rounded-2xl p-4 sm:p-6 hover:bg-zinc-100 transition-colors',
                  index > 1 && 'hidden md:block'
                )}
                onClick={() => handleSubmit(example.message)}
              >
                <div className="text-sm text-zinc-800">
                  {example.subheading}
                </div>
              </div>
            ))}
        </div>

        <div className="grid gap-4 sm:pb-4">
          <PromptForm
            input={input}
            setInput={setInput}
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
          <FooterText className="hidden sm:block" />
        </div>
      </div>
    </div>
  )
}