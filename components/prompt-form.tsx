'use client'

import * as React from 'react'
import Textarea from 'react-textarea-autosize'

import { useActions, useUIState } from 'ai/rsc'

import { UserMessage } from './stocks/message'
import { type AI } from '@/lib/chat/actions'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { useEnterSubmit } from '@/lib/hooks/use-enter-submit'
import { nanoid } from 'nanoid'
import { toast } from 'sonner'
import { ArrowUp } from 'lucide-react'
// import { IconPlus } from '@/components/ui/icons';

export function PromptForm({
  input,
  setInput,
  isLoading,
  onSubmit
}: {
  input: string
  setInput: (value: string) => void
  isLoading: boolean
  onSubmit: (value: string) => Promise<void>
}) {
  const { formRef, onKeyDown } = useEnterSubmit()
  const inputRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (isLoading) return

    const value = input.trim()
    if (!value) return

    setInput('')
    await onSubmit(value)
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <div className="relative flex max-h-60 w-full grow flex-col overflow-hidden bg-zinc-100 pl-4 pr-12 rounded-[26px]">
        {/* <Button
          variant="outline"
          size="icon"
          className="absolute left-4 top-[14px] size-8 rounded-full bg-background p-0 sm:left-4"
          disabled={isLoading}
        >
          <IconPlus />
          <span className="sr-only">New Chat</span>
        </Button> */}
        <Textarea
          ref={inputRef}
          tabIndex={0}
          onKeyDown={onKeyDown}
          placeholder="Send a message"
          className="min-h-14 w-full bg-transparent placeholder:text-zinc-500 resize-none px-4 py-4 focus-within:outline-none "
          autoFocus
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          name="message"
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <div className="absolute right-4 bottom-[10px] sm:right-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || input.trim() === ''}
                className={`shadow-none text-white rounded-full ${isLoading || input.trim() === '' ? 'bg-zinc-400' : 'bg-zinc-900 hover:bg-zinc-700'}`}
              >
                <ArrowUp className="size-5" />
                <span className="sr-only">Send message</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Send message</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </form>
  )
}
