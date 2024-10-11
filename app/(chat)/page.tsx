import { nanoid } from '@/lib/utils'
import { Chat } from '@/components/chat'
import { AI } from '@/lib/chat/actions'
import { auth } from '@/auth'
import { Session } from '@/lib/types'

export const metadata = {
  title: 'SEMANTC AI ASSISTANT',
}

export default async function IndexPage() {
  const id = nanoid()
  const session = (await auth()) as Session

  return (
    <AI initialAIState={{ chatId: id, messages: [] }}>
      <Chat id={id} />
    </AI>
  )
}