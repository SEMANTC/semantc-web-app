// middleware.ts
import { NextResponse } from 'next/server';
import type { NextFetchEvent, NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';

const MAX_REQUESTS = 50;
const WINDOW_SIZE = 60 * 60 * 1000; // 1 hour in milliseconds

// In-memory store for rate limiting
const rateLimit = new Map<string, { count: number; timestamp: number }>();

export async function middleware(req: NextRequest, ev: NextFetchEvent) {
  // Rate limiting for POST requests
  if (req.method === 'POST') {
    const realIp = req.headers.get('x-real-ip') || req.ip || 'no-ip';
    const now = Date.now();
    const userRateLimit = rateLimit.get(realIp) || { count: 0, timestamp: now };

    if (now - userRateLimit.timestamp > WINDOW_SIZE) {
      userRateLimit.count = 1;
      userRateLimit.timestamp = now;
    } else {
      userRateLimit.count++;
    }

    rateLimit.set(realIp, userRateLimit);

    if (process.env.NODE_ENV === 'development') {
      return NextResponse.next();
    }

    if (userRateLimit.count > MAX_REQUESTS) {
      return new NextResponse('Too many requests', { status: 429 });
    }
  }

  // Authentication check for protected routes
  const token = req.cookies.get('token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  try {
    await adminAuth.verifyIdToken(token);
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

// Update matcher to handle API routes and protected pages
export const config = {
  matcher: ['/api/:path*', '/chat/:path*', '/protected-route'],
};