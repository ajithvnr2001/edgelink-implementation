'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { getUser, storeUser } from '@/lib/api'

function BillingSuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [user, setUser] = useState<any>(null)
  const [countdown, setCountdown] = useState(5)
  const router = useRouter()

  useEffect(() => {
    // Refresh user data to get updated plan
    const currentUser = getUser()
    if (currentUser) {
      // Update user plan to pro (will be confirmed by webhook)
      currentUser.plan = 'pro'
      storeUser(currentUser)
      setUser(currentUser)
    }

    // Auto-redirect to dashboard after 5 seconds
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push('/dashboard')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2">
            <div className="w-10 h-10 bg-primary-500 rounded-lg"></div>
            <span className="text-2xl font-bold text-white">EdgeLink</span>
          </Link>
        </div>

        {/* Success Card */}
        <div className="card p-8 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-success-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Success Message */}
          <h1 className="text-3xl font-bold text-white mb-4">
            Welcome to EdgeLink Pro!
          </h1>
          <p className="text-xl text-gray-300 mb-4">
            Your payment was successful. You now have access to all Pro features.
          </p>

          {/* Auto-redirect notice */}
          <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4 mb-8">
            <p className="text-sm text-gray-300">
              Redirecting to dashboard in <span className="text-primary-400 font-bold text-lg">{countdown}</span> seconds...
            </p>
          </div>

          {/* Session ID */}
          {sessionId && (
            <div className="bg-gray-700/50 rounded-lg p-4 mb-8">
              <p className="text-sm text-gray-400 mb-1">Transaction ID</p>
              <p className="text-sm text-gray-300 font-mono break-all">{sessionId}</p>
            </div>
          )}

          {/* Pro Features */}
          <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-bold text-white mb-4">What's included in Pro:</h2>
            <div className="grid md:grid-cols-2 gap-3 text-left">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-success-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-300 text-sm">5,000 links/month</span>
              </div>
              <div className="flex items-start">
                <svg className="w-5 h-5 text-success-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-300 text-sm">10K API calls/day</span>
              </div>
              <div className="flex items-start">
                <svg className="w-5 h-5 text-success-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-300 text-sm">Custom domains</span>
              </div>
              <div className="flex items-start">
                <svg className="w-5 h-5 text-success-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-300 text-sm">Geographic routing</span>
              </div>
              <div className="flex items-start">
                <svg className="w-5 h-5 text-success-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-300 text-sm">Device routing</span>
              </div>
              <div className="flex items-start">
                <svg className="w-5 h-5 text-success-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-300 text-sm">QR code generation</span>
              </div>
              <div className="flex items-start">
                <svg className="w-5 h-5 text-success-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-300 text-sm">Advanced analytics</span>
              </div>
              <div className="flex items-start">
                <svg className="w-5 h-5 text-success-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-300 text-sm">Priority support</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard" className="btn-primary">
              Go to Dashboard
            </Link>
            <Link href="/billing/settings" className="btn-secondary">
              Manage Billing
            </Link>
          </div>

          {/* Help Text */}
          <p className="text-sm text-gray-400 mt-8">
            You'll receive a confirmation email shortly. If you have any questions, contact us at support@edgelink.com
          </p>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link href="/" className="text-gray-400 hover:text-white">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
        <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <BillingSuccessContent />
    </Suspense>
  )
}
