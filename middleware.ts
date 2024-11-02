// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths that don't require authentication
const PUBLIC_PATHS = ['/login', '/signup', '/reset-password'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('session')?.value;
  
  // If already authenticated and trying to access login/signup pages
  if (token && PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // If not authenticated and trying to access protected routes
  if (!token && !PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/|api/).*)',
  ],
};