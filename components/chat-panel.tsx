import * as React from 'react'

import { shareChat } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { PromptForm } from '@/components/prompt-form'
import { ButtonScrollToBottom } from '@/components/button-scroll-to-bottom'
import { IconShare } from '@/components/ui/icons'
import { FooterText } from '@/components/footer'
import { ChatShareDialog } from '@/components/chat-share-dialog'
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
  const [shareDialogOpen, setShareDialogOpen] = React.useState(false)

  const exampleMessages = [
    {
      heading: 'list open invoices',
      subheading: 'Xero',
      message: `List number of invoices that are still open in Xero`
    },
    {
      heading: 'Top 5 products sold this month',
      subheading: 'Shopify',
      message: 'What are the top 5 products sold in Shopify this month?'
    }
  ]

  return (
    <div className="fixed inset-x-0 bottom-0 bg-gradient-to-b from-muted/10 from-10% to-muted/30 to-50%">
      <ButtonScrollToBottom
        isAtBottom={isAtBottom}
        scrollToBottom={scrollToBottom}
      />

      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-4 grid sm:grid-cols-2 gap-2 sm:gap-4">
          {messages.length === 0 &&
            exampleMessages.map((example, index) => (
              <div
                key={example.heading}
                className={cn(
                  'cursor-pointer bg-zinc-50 text-zinc-950 rounded-2xl p-4 sm:p-6 hover:bg-zinc-100 transition-colors',
                  index > 1 && 'hidden md:block'
                )}
                onClick={async () => {
                  setMessages(currentMessages => [
                    ...currentMessages,
                    {
                      id: nanoid(),
                      display: <UserMessage>{example.message}</UserMessage>
                    }
                  ])

                  try {
                    const responseMessage = await submitUserMessage(
                      example.message
                    )

                    setMessages(currentMessages => [
                      ...currentMessages,
                      responseMessage
                    ])
                  } catch {
                    toast(
                      <div className="text-red-600">
                        You have reached your message limit! Please try again
                        later, or{' '}
                        <a
                          className="underline"
                          target="_blank"
                          rel="noopener noreferrer"
                          href="https://vercel.com/templates/next.js/gemini-ai-chatbot"
                        >
                          deploy your own version
                        </a>
                        .
                      </div>
                    )
                  }
                }}
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

        {messages?.length >= 2 ? (
          <div className="flex h-fit items-center justify-center mb-4">
            <div className="flex space-x-2">
              {id && title ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setShareDialogOpen(true)}
                  >
                    <IconShare className="mr-2" />
                    Share
                  </Button>
                  <ChatShareDialog
                    open={shareDialogOpen}
                    onOpenChange={setShareDialogOpen}
                    onCopy={() => setShareDialogOpen(false)}
                    shareChat={shareChat}
                    chat={{
                      id,
                      title,
                      messages: aiState.messages
                    }}
                  />
                </>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="pb-4 sm:pb-4">
          <PromptForm input={input} setInput={setInput} />
          <FooterText className="hidden sm:block mt-2" />
        </div>
      </div>
    </div>
  )
}