import { SignIn } from '@clerk/nextjs'
import Link from 'next/link'

// Configure this page to run on Edge Runtime (required for Cloudflare Pages)
export const runtime = 'edge'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2">
            <div className="w-10 h-10 bg-primary-500 rounded-lg"></div>
            <span className="text-2xl font-bold text-white">EdgeLink</span>
          </Link>
        </div>

        {/* Clerk Sign In Component */}
        <div className="flex justify-center">
          <SignIn
            routing="path"
            path="/sign-in"
            fallbackRedirectUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: 'mx-auto',
                card: 'bg-gray-800 shadow-xl',
              },
            }}
          />
        </div>

        <div className="text-center mt-6">
          <Link href="/" className="text-gray-400 hover:text-white">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
