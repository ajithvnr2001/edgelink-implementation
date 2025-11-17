'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getUser, getSubscriptionStatus, createCustomerPortal } from '@/lib/api'

export default function BillingSettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const currentUser = getUser()
    if (!currentUser) {
      router.push('/login')
      return
    }
    setUser(currentUser)

    // Fetch subscription status
    loadSubscription()
  }, [router])

  const loadSubscription = async () => {
    try {
      const status = await getSubscriptionStatus()
      setSubscription(status)
    } catch (err: any) {
      console.error('Failed to load subscription:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleManageBilling = async () => {
    setPortalLoading(true)
    setError('')

    try {
      const { url } = await createCustomerPortal(
        `${window.location.origin}/billing/settings`
      )
      window.location.href = url
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Failed to open billing portal')
      setPortalLoading(false)
    }
  }

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'N/A'
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getPlanName = (plan?: string) => {
    if (!plan || plan === 'free') return 'Free'
    if (plan === 'pro_monthly') return 'Pro (Monthly)'
    if (plan === 'pro_annual') return 'Pro (Annual)'
    if (plan === 'pro') return 'Pro'
    return plan
  }

  const getStatusBadge = (status?: string) => {
    if (status === 'active') {
      return <span className="px-3 py-1 bg-success-500/20 text-success-500 rounded-full text-sm font-medium">Active</span>
    }
    if (status === 'cancelled') {
      return <span className="px-3 py-1 bg-warning-500/20 text-warning-500 rounded-full text-sm font-medium">Cancelled</span>
    }
    if (status === 'past_due') {
      return <span className="px-3 py-1 bg-error-500/20 text-error-500 rounded-full text-sm font-medium">Past Due</span>
    }
    return <span className="px-3 py-1 bg-gray-500/20 text-gray-500 rounded-full text-sm font-medium">{status || 'Free'}</span>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const isPro = user?.plan === 'pro' || subscription?.status === 'active'

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
            <Link href="/dashboard" className="text-gray-300 hover:text-white">
              Dashboard
            </Link>
            <span className="text-gray-400">{user?.email}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Billing & Subscription</h1>
            <p className="text-gray-400">Manage your subscription and billing information</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-error-50 dark:bg-error-900/20 border border-error-500 text-error-600 dark:text-error-400 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Current Plan */}
          <div className="card p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Current Plan</h2>
              {getStatusBadge(subscription?.status)}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-400 mb-1">Plan</p>
                <p className="text-lg font-bold text-white">{getPlanName(subscription?.plan || user?.plan)}</p>
              </div>

              {isPro && subscription?.current_period_end && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">
                    {subscription?.cancel_at_period_end ? 'Expires on' : 'Renews on'}
                  </p>
                  <p className="text-lg font-bold text-white">{formatDate(subscription.current_period_end)}</p>
                </div>
              )}

              {!isPro && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Monthly Limit</p>
                  <p className="text-lg font-bold text-white">500 links</p>
                </div>
              )}

              {isPro && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Monthly Limit</p>
                  <p className="text-lg font-bold text-white">5,000 links</p>
                </div>
              )}

              {isPro && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Daily API Calls</p>
                  <p className="text-lg font-bold text-white">10,000</p>
                </div>
              )}
            </div>

            {/* Cancellation Notice */}
            {subscription?.cancel_at_period_end && (
              <div className="mt-6 p-4 bg-warning-500/10 border border-warning-500/30 rounded-lg">
                <p className="text-warning-400 text-sm">
                  ⚠️ Your subscription has been cancelled and will expire on {formatDate(subscription.current_period_end)}.
                  You can reactivate it anytime before then.
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="card p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">Manage Subscription</h2>

            {!isPro ? (
              <div className="space-y-4">
                <p className="text-gray-400">
                  Upgrade to Pro to unlock advanced features and higher limits.
                </p>
                <Link href="/pricing" className="btn-primary inline-block">
                  Upgrade to Pro
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-400">
                  Manage your payment method, view invoices, or cancel your subscription through the customer portal.
                </p>
                <button
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                  className="btn-primary disabled:opacity-50"
                >
                  {portalLoading ? 'Loading...' : 'Open Billing Portal'}
                </button>
                <p className="text-sm text-gray-500">
                  You'll be redirected to a secure portal to manage your billing.
                </p>
              </div>
            )}
          </div>

          {/* Pro Features */}
          {!isPro && (
            <div className="card p-6">
              <h2 className="text-xl font-bold text-white mb-4">Pro Features</h2>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-success-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-300 text-sm">5,000 links per month (10x more)</span>
                </div>
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-success-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-300 text-sm">10,000 API calls per day (10x more)</span>
                </div>
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-success-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-300 text-sm">Custom domain support</span>
                </div>
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-success-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-300 text-sm">Geographic & device routing</span>
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
                  <span className="text-gray-300 text-sm">Password-protected links</span>
                </div>
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-success-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-300 text-sm">Priority support</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-700 mt-12">
        <div className="container mx-auto px-4 py-8 text-center text-gray-400">
          <p>Need help? Contact us at support@edgelink.com</p>
        </div>
      </footer>
    </div>
  )
}
