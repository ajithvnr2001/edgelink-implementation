import { NextRequest, NextResponse } from 'next/server'

// Configure this endpoint to run on Edge Runtime
export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    request: {
      method: request.method,
      url: request.url,
      pathname: url.pathname,
      headers: Object.fromEntries(request.headers.entries()),
    },
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? 'SET' : 'MISSING',
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ? 'SET' : 'MISSING',
      NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    },
    clerk: {
      signInUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
      signUpUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
    },
  }, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

export async function POST(request: NextRequest) {
  return GET(request)
}
