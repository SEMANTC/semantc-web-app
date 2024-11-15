// components/chat-list.tsx
import { UIState } from '@/lib/chat/actions'

export interface ChatList {
  messages: UIState
  isShared: boolean
}

export function ChatList({ messages, isShared }: ChatList) {
  return messages.length ? (
    <div className="relative mx-auto max-w-2xl px-4">
      <div className="grid auto-rows-max gap-6 py-6">
        {messages.map(message => (
          <div key={message.id} className="fade-in">
            {message.display}
          </div>
        ))}
      </div>
    </div>
  ) : null
}