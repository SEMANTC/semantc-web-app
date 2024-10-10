import { NextResponse } from 'next/server'
import type { NextFetchEvent, NextRequest } from 'next/server'

const MAX_REQUESTS = 50
const WINDOW_SIZE = 60 * 60 * 1000 // 1 hour in milliseconds

// In-memory store for rate limiting
const rateLimit = new Map<string, { count: number; timestamp: number }>()

export async function middleware(req: NextRequest, ev: NextFetchEvent) {
  if (req.method === 'POST') {
    const realIp = req.headers.get('x-real-ip') || 'no-ip'
    const now = Date.now()

    // Simple in-memory rate limiting
    const userRateLimit = rateLimit.get(realIp) || { count: 0, timestamp: now }

    if (now - userRateLimit.timestamp > WINDOW_SIZE) {
      // Reset if the window has passed
      userRateLimit.count = 1
      userRateLimit.timestamp = now
    } else {
      userRateLimit.count++
    }

    rateLimit.set(realIp, userRateLimit)

    if (process.env.NODE_ENV === 'development') {
      return NextResponse.next()
    }

    if (userRateLimit.count > MAX_REQUESTS) {
      return new NextResponse('Too many requests', { status: 429 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/chat/:id*', '/share/:id*']
}