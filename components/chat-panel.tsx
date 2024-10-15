import * as React from 'react'

import { PromptForm } from '@/components/prompt-form'
import { ButtonScrollToBottom } from '@/components/button-scroll-to-bottom'
import { FooterText } from '@/components/footer'
import { useAIState, useActions, useUIState } from 'ai/rsc'
import type { AI } from '@/lib/chat/actions'
import { nanoid } from 'nanoid'
import { UserMessage } from './stocks/message'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

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

  const exampleMessages = [
    {
      heading: '',
      subheading:
        'How many accounts do i have in Xero?',
      message: `How many accounts do i have in Xero?`
    },
    {
      heading: '',
      subheading:
        'Which customers have the highest outstanding invoice amounts?',
      message:
        'Which customers have the highest outstanding invoice amounts?'
    },
    {
      heading: '',
      subheading:
        'How many payments are being missed or delayed based on due dates?',
      message:
        'How many payments are being missed or delayed based on due dates?'
    }
  ]

  const handleSubmit = React.useCallback(
    async (value: string) => {
      setIsLoading(true)
      setMessages(currentMessages => [
        ...currentMessages,
        {
          id: nanoid(),
          display: <UserMessage>{value}</UserMessage>
        }
      ])

      try {
        const responseMessage = await submitUserMessage(value)
        setMessages(currentMessages => [...currentMessages, responseMessage])
      } catch {
        toast(
          <div className="text-red-600">
            An error occurred. Please try again later.
          </div>
        )
      } finally {
        setIsLoading(false)
      }
    },
    [setMessages, submitUserMessage]
  )

  return (
    <div className="fixed inset-x-0 bottom-0 bg-gradient-to-b from-muted/10 from-10% to-muted/30 to-50% z-10">
      <ButtonScrollToBottom
        isAtBottom={isAtBottom}
        scrollToBottom={scrollToBottom}
      />

      <div className="mx-auto sm:max-w-2xl px-4">
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {messages.length === 0 &&
            exampleMessages.map((example, index) => (
              <div
                key={example.heading}
                className={cn(
                  'cursor-pointer border shadow-sm rounded-2xl p-4 hover:bg-zinc-100 transition-colors',
                  index > 1 && 'hidden md:block'
                )}
                onClick={() => handleSubmit(example.message)}
              >
                <div className="font-medium">{example.heading}</div>
                {example.subheading && (
                  <div className="text-sm text-zinc-800">
                    {example.subheading}
                  </div>
                )}
              </div>
            ))}
        </div>

        <div className="">
          <PromptForm
            input={input}
            setInput={setInput}
            isLoading={isLoading}
            onSubmit={handleSubmit}
          />
          <FooterText className="block pt-2 pb-4 sm:pb-4 bg-white" />
        </div>
      </div>
    </div>
  )
}
