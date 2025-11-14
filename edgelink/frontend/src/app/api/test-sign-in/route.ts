import { NextRequest, NextResponse } from 'next/server'

// Test endpoint to verify routing works
export const runtime = 'edge'

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'Sign-in API route is working',
    path: request.nextUrl.pathname,
    method: request.method,
    timestamp: new Date().toISOString(),
  })
}

export async function POST(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'Sign-in POST route is working',
    path: request.nextUrl.pathname,
    method: request.method,
    timestamp: new Date().toISOString(),
    body: await request.text().catch(() => 'Could not read body'),
  })
}
