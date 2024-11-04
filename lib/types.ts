// lib/types.ts
import { Message } from 'ai'
import { Timestamp } from 'firebase/firestore'

export interface ExtendedMessage extends Message {
  metadata?: {
    sql_query?: string;
    results?: any[];
    error?: string;
    processingTime?: number;
  };
}

export interface Chat extends Record<string, any> {
  id: string
  title: string
  createdAt: Date | Timestamp
  userId: string
  path: string
  messages: ExtendedMessage[]
  messageCount?: number
  lastUpdated?: Date | Timestamp
  summary?: string | null
}

export type ServerActionResult<Result> = Promise<
  | Result
  | {
      error: string
    }
>

export interface Session {
  user: {
    id: string
    email: string
  }
}

export interface AuthResult {
  type: string
  message: string
}

export interface User extends Record<string, any> {
  id: string
  email: string
  password: string
  salt: string
}