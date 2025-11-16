'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { resendVerification, getUser } from '@/lib/api'

export default function ResendVerificationPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Pre-fill email from logged-in user
    const user = getUser()
    if (user?.email) {
      setEmail(user.email)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await resendVerification(email)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend verification email')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
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

          {/* Success Message */}
          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-success-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Email sent!</h1>
            <p className="text-gray-400 mb-4">
              We've sent a new verification link to:
            </p>
            <p className="text-white font-semibold mb-6">{email}</p>
            <p className="text-sm text-gray-500 mb-6">
              Check your inbox and spam folder. The link will expire in 48 hours.
            </p>
            <Link href="/dashboard" className="btn-primary inline-block">
              Back to Dashboard
            </Link>
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

        {/* Resend Form */}
        <div className="card p-8">
          <h1 className="text-2xl font-bold text-white mb-2">Resend verification email</h1>
          <p className="text-gray-400 mb-6">
            Enter your email address and we'll send you a new verification link.
          </p>

          {error && (
            <div className="bg-error-50 dark:bg-error-900/20 border border-error-500 text-error-600 dark:text-error-400 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="input"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Sending...' : 'Resend verification email'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Already verified?{' '}
              <Link href="/login" className="link">
                Log in
              </Link>
            </p>
          </div>
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
