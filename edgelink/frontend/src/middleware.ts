import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/public(.*)',
  '/api/debug(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  const url = new URL(request.url)

  // Debug logging (only in production if DEBUG flag is set)
  if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
    console.log('[Middleware]', {
      method: request.method,
      pathname: url.pathname,
      isPublic: isPublicRoute(request),
      headers: Object.fromEntries(request.headers.entries()),
    })
  }

  // Protect all routes except public ones
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
