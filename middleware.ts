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
  '/api/check-connector'
];

function logRequest(req: NextRequest, message: string) {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  // console.log(`[${timestamp}] ${method} ${url} - ${message}`);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  logRequest(req, `Processing request for path: ${pathname}`);

  // Skip certain paths
  if (pathname.startsWith('/_next') || 
      BYPASS_API_PATHS.some(path => pathname.startsWith(path)) ||
      pathname.includes('.')) {
    logRequest(req, `Skipping middleware for path: ${pathname}`);
    return NextResponse.next();
  }

  // Check session token
  const token = req.cookies.get('session')?.value;
  logRequest(req, `Session token present: ${!!token}`);

  // For API routes
  if (pathname.startsWith('/api/')) {
    if (!token) {
      logRequest(req, 'No token found for protected API route - returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const verifyResponse = await fetch(new URL('/api/verify-token', req.url), {
        headers: {
          Cookie: `session=${token}`
        }
      });
      
      if (!verifyResponse.ok) {
        logRequest(req, 'Token verification failed for API route - returning 401');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Create a new request with the session cookie
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set('Cookie', `session=${token}`);

      const response = NextResponse.next({
        request: {
          headers: requestHeaders
        }
      });

      // Ensure cookie is set in response
      response.cookies.set('session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 5,
        path: '/',
        sameSite: 'lax',
        priority: 'high'
      });

      logRequest(req, 'Valid token found - allowing access to API route');
      return response;
    } catch (error) {
      logRequest(req, 'Token verification error for API route - returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Handle public paths and other routes as before...
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    logRequest(req, `Accessing public path: ${pathname}`);
    if (token) {
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
        const response = NextResponse.next();
        response.cookies.delete('session');
        return response;
      }
    }
    return NextResponse.next();
  }

  if (!token) {
    logRequest(req, 'No token found for protected route - redirecting to login');
    return NextResponse.redirect(new URL('/login', req.url));
  }

  try {
    const verifyResponse = await fetch(new URL('/api/verify-token', req.url), {
      headers: {
        Cookie: `session=${token}`
      }
    });
    
    if (!verifyResponse.ok) {
      throw new Error('Token verification failed');
    }
    
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('Cookie', `session=${token}`);

    const response = NextResponse.next({
      request: {
        headers: requestHeaders
      }
    });

    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 5,
      path: '/',
      sameSite: 'lax',
      priority: 'high'
    });

    logRequest(req, 'Valid token found - allowing access to protected route');
    return response;
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