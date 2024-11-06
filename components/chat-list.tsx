// components/chat-list.tsx
import { UIState } from '@/lib/chat/actions'

export interface ChatList {
  messages: UIState
  isShared: boolean
}

export function ChatList({ messages, isShared }: ChatList) {
  return messages.length ? (
    <div className="relative mx-auto max-w-2xl grid auto-rows-max gap-12 px-4">
      {/* Reverse the messages array before mapping */}
      {[...messages].reverse().map(message => (
        <div key={message.id}>
          {message.display}
        </div>
      ))}
    </div>
  ) : null
}