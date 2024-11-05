// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths that don't require authentication
const PUBLIC_PATHS = ['/login', '/signup', '/reset-password'];

// API paths that should bypass the middleware
const BYPASS_API_PATHS = [
  '/api/login',
  '/api/oauth',
  '/api/verify-token',
  '/api/get-chats',
  '/api/save-chat',
  '/api/check-connector'
];

// Helper function for logging
function logRequest(req: NextRequest, message: string) {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const userAgent = req.headers.get('user-agent') || 'unknown';
  
  // console.log(`[${timestamp}] ${method} ${url} - ${userAgent}`);
  // console.log(`Message: ${message}`);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  logRequest(req, `Processing request for path: ${pathname}`);

  // Skip certain paths
  if (pathname.startsWith('/_next') || 
      BYPASS_API_PATHS.some(path => pathname.startsWith(path)) ||
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
      // Try to verify token via API
      try {
        const verifyResponse = await fetch(new URL('/api/verify-token', req.url), {
          headers: {
            Cookie: `session=${token}`
          }
        });
        
        if (verifyResponse.ok) {
          logRequest(req, 'Authenticated user attempting to access public path - redirecting to home');
          return NextResponse.redirect(new URL('/', req.url));
        }
      } catch (error) {
        // Token verification failed, clear it
        const response = NextResponse.next();
        response.cookies.delete('session');
        return response;
      }
    }
    return NextResponse.next();
  }

  // If no token and trying to access protected route
  if (!token) {
    logRequest(req, 'No token found for protected route - redirecting to login');
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Verify token for protected routes via API
  try {
    const verifyResponse = await fetch(new URL('/api/verify-token', req.url), {
      headers: {
        Cookie: `session=${token}`
      }
    });
    
    if (!verifyResponse.ok) {
      throw new Error('Token verification failed');
    }
    
    logRequest(req, 'Valid token found - allowing access to protected route');
    return NextResponse.next();
  } catch (error) {
    logRequest(req, 'Token verification failed - redirecting to login');
    const response = NextResponse.redirect(new URL('/login', req.url));
    response.cookies.delete('session');
    return response;
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};