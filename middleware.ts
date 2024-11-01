// middleware.ts
import { NextResponse } from 'next/server';
import type { NextFetchEvent, NextRequest } from 'next/server';
import { jwtVerify, importSPKI, KeyLike } from 'jose';

const MAX_REQUESTS = 50;
const WINDOW_SIZE = 60 * 60 * 1000; // 1 hour in milliseconds

// In-memory store for rate limiting
const rateLimit = new Map<string, { count: number; timestamp: number }>();

// Firebase project ID (used for audience verification)
const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

export async function middleware(req: NextRequest, ev: NextFetchEvent) {
  // Rate limiting for POST requests
  // (Keep your existing rate limiting code here)

  // Authentication check for protected routes
  const token = req.cookies.get('session')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  try {
    // Verify the token using jose
    const { payload } = await verifyToken(token);
    // You can attach user info to the request if needed
    // For example: req.user = payload;

    return NextResponse.next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

// Helper function to verify the token
async function verifyToken(token: string) {
  const JWKS = await getGoogleJWKS();

  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `https://securetoken.google.com/${firebaseProjectId}`,
    audience: firebaseProjectId,
  });

  return { payload };
}

// Fetch and cache Google's public keys
let cachedJWKS: KeyLike;
let cachedJWKSExpiry = 0;

async function getGoogleJWKS(): Promise<KeyLike> {
  const now = Date.now();

  if (cachedJWKS && now < cachedJWKSExpiry) {
    return cachedJWKS;
  }

  const response = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  const publicKeys = await response.json();
  const keys = Object.values(publicKeys).map((key) => {
    const pemHeader = '-----BEGIN CERTIFICATE-----\n';
    const pemFooter = '\n-----END CERTIFICATE-----\n';
    return pemHeader + key + pemFooter;
  });

  // Use the first key (you may want to implement key selection based on 'kid')
  cachedJWKS = await importSPKI(keys[0], 'RS256');
  // Set cache expiry (e.g., 1 hour)
  cachedJWKSExpiry = now + 60 * 60 * 1000;

  return cachedJWKS;
}

export const config = {
  matcher: ['/api/:path*', '/chat/:path*', '/protected-route'],
};