'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createCheckoutSession, getUser } from '@/lib/api'

export default function PricingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const user = typeof window !== 'undefined' ? getUser() : null

  const handleUpgrade = async () => {
    if (!user) {
      router.push('/login?redirect=/pricing')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { checkout_url } = await createCheckoutSession('pro')
      window.location.href = checkout_url
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg"></div>
            <h1 className="text-xl font-bold text-white">EdgeLink</h1>
          </Link>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link href="/dashboard" className="text-gray-300 hover:text-white">
                  Dashboard
                </Link>
                <span className="text-gray-400">{user.email}</span>
              </>
            ) : (
              <>
                <Link href="/login" className="text-gray-300 hover:text-white">
                  Log in
                </Link>
                <Link href="/signup" className="btn-primary">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Pricing Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-white mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-gray-400">
              Start free. Upgrade when you need more.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-error-50 dark:bg-error-900/20 border border-error-500 text-error-600 dark:text-error-400 px-4 py-3 rounded-lg mb-8 max-w-2xl mx-auto">
              {error}
            </div>
          )}

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="card p-8 border-2 border-gray-700">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">Free</h3>
                <div className="text-5xl font-bold text-white mb-2">$0</div>
                <div className="text-gray-400">Forever free</div>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-success-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-300">500 links per month</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-success-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-300">1,000 API calls per day</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-success-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-300">Basic analytics</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-success-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-300">Link expiration</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-gray-500">No custom domains</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-gray-500">No advanced routing</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-gray-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-gray-500">No QR codes</span>
                </li>
              </ul>

              <Link href="/signup" className="btn-secondary w-full block text-center">
                Get Started Free
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="card p-8 border-2 border-primary-500 relative overflow-hidden">
              {/* Popular Badge */}
              <div className="absolute top-0 right-0 bg-primary-500 text-white px-4 py-1 text-sm font-bold">
                POPULAR
              </div>

              <div className="text-center mb-8 mt-6">
                <h3 className="text-2xl font-bold text-white mb-2">Pro</h3>
                <div className="text-5xl font-bold text-white mb-2">$9</div>
                <div className="text-gray-400">per month</div>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-success-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-300"><strong className="text-white">5,000 links</strong> per month</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-success-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-300"><strong className="text-white">10,000 API calls</strong> per day</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-success-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-300">Advanced analytics</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-success-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-300">Custom domains</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-success-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-300">Geographic routing</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-success-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-300">Device routing</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-success-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-300">QR code generation</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-success-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-300">Password-protected links</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-success-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-300">Priority support</span>
                </li>
              </ul>

              <button
                onClick={handleUpgrade}
                disabled={loading || (user?.plan === 'pro')}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : user?.plan === 'pro' ? 'Current Plan' : 'Upgrade to Pro'}
              </button>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-20 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-white text-center mb-12">
              Frequently Asked Questions
            </h2>

            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="text-lg font-bold text-white mb-2">
                  Can I cancel anytime?
                </h3>
                <p className="text-gray-400">
                  Yes! You can cancel your Pro subscription at any time. You'll retain Pro features until the end of your billing period.
                </p>
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-bold text-white mb-2">
                  What happens if I exceed my limits?
                </h3>
                <p className="text-gray-400">
                  Free users can't create more links or make API calls once limits are reached. Pro users get 10x higher limits. Contact us if you need custom limits.
                </p>
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-bold text-white mb-2">
                  Do you offer refunds?
                </h3>
                <p className="text-gray-400">
                  Yes! We offer a 7-day money-back guarantee. If you're not satisfied, contact us within 7 days for a full refund.
                </p>
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-bold text-white mb-2">
                  Can I upgrade or downgrade later?
                </h3>
                <p className="text-gray-400">
                  Yes! You can upgrade from Free to Pro anytime. Downgrades take effect at the end of your billing period.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-700 mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-gray-400">
          <p>© 2025 EdgeLink. Built with Cloudflare Workers.</p>
        </div>
      </footer>
    </div>
  )
}
