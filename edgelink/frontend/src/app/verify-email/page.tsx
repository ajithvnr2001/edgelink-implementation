'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { verifyEmail, resendVerification, getUser, storeUser } from '@/lib/api'

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'resend'>('verifying')
  const [message, setMessage] = useState('')
  const [resending, setResending] = useState(false)
  const [email, setEmail] = useState('')

  useEffect(() => {
    const user = getUser()
    if (user) {
      setEmail(user.email)
    }

    if (!token) {
      setStatus('error')
      setMessage('Invalid verification link. No token provided.')
      return
    }

    // Verify the email
    verifyEmail(token)
      .then((response) => {
        setStatus('success')
        setMessage(response.message || 'Email verified successfully!')

        // Update user object in localStorage to mark email as verified
        const currentUser = getUser()
        if (currentUser) {
          currentUser.email_verified = true
          storeUser(currentUser)
        }

        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          router.push('/dashboard')
        }, 3000)
      })
      .catch((error) => {
        setStatus('resend')
        setMessage(error.message || 'Verification failed. The link may be expired or invalid.')
      })
  }, [token, router])

  const handleResend = async () => {
    if (!email) {
      setMessage('Please log in to resend verification email.')
      return
    }

    setResending(true)
    try {
      const response = await resendVerification(email)
      setMessage(response.message || 'Verification email sent! Check your inbox.')
      setStatus('success')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to resend email. Please try again.')
    } finally {
      setResending(false)
    }
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

        {/* Verification Status */}
        <div className="card p-8 text-center">
          {status === 'verifying' && (
            <>
              <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h1 className="text-2xl font-bold text-white mb-2">Verifying your email...</h1>
              <p className="text-gray-400">Please wait while we verify your email address.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-success-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Email Verified!</h1>
              <p className="text-gray-400 mb-6">{message}</p>
              <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-error-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Verification Failed</h1>
              <p className="text-gray-400 mb-6">{message}</p>
              <Link href="/login" className="btn-primary inline-block">
                Go to Login
              </Link>
            </>
          )}

          {status === 'resend' && (
            <>
              <div className="w-16 h-16 bg-warning-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Link Expired</h1>
              <p className="text-gray-400 mb-6">{message}</p>

              {email && (
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="btn-primary w-full mb-4"
                >
                  {resending ? 'Sending...' : 'Resend Verification Email'}
                </button>
              )}

              <Link href="/login" className="link">
                Go to Login
              </Link>
            </>
          )}
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

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
        <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
