// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths that don't require authentication
const PUBLIC_PATHS = ['/login', '/signup', '/reset-password'];

// Helper function for logging
function logRequest(req: NextRequest, message: string) {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const userAgent = req.headers.get('user-agent') || 'unknown';
  
  console.log(`[${timestamp}] ${method} ${url} - ${userAgent}`);
  console.log(`Message: ${message}`);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  logRequest(req, `Processing request for path: ${pathname}`);

  // Skip certain paths
  if (pathname.startsWith('/_next') || 
      pathname.startsWith('/api/login') ||
      pathname.startsWith('/api/oauth') ||
      pathname.includes('.') // Skip files like favicon.ico
  ) {
    logRequest(req, `Skipping middleware for path: ${pathname}`);
    return NextResponse.next();
  }

  // Check session token
  const token = req.cookies.get('session')?.value;
  logRequest(req, `Session token present: ${!!token}`);

  // If it's a public path, allow access
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    logRequest(req, `Accessing public path: ${pathname}`);
    // If user is already authenticated and tries to access login/signup pages
    if (token) {
      logRequest(req, 'Authenticated user attempting to access public path - redirecting to home');
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  // If no token and trying to access protected route
  if (!token) {
    logRequest(req, 'No token found for protected route - redirecting to login');
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Token exists and accessing protected route
  logRequest(req, 'Valid token found - allowing access to protected route');
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
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};