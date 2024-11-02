// app/api/logout/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ status: 'success' });
  
  // Clear the session cookie
  response.cookies.delete('session');
  
  return response;
}