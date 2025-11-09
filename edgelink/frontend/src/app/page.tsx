'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function HomePage() {
  const [url, setUrl] = useState('')
  const [customSlug, setCustomSlug] = useState('')
  const [shortUrl, setShortUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setShortUrl('')
    setLoading(true)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'
      const response = await fetch(`${apiUrl}/api/shorten`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          custom_slug: customSlug || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to shorten URL')
      }

      setShortUrl(data.short_url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shortUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg"></div>
            <h1 className="text-xl font-bold text-white">EdgeLink</h1>
          </div>
          <nav className="flex items-center space-x-4">
            <Link href="/login" className="text-gray-300 hover:text-white">
              Login
            </Link>
            <Link href="/signup" className="btn-primary">
              Sign Up
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-white mb-6">
            The fastest URL shortener
            <br />
            <span className="text-primary-500">for developers</span>
          </h1>
          <p className="text-xl text-gray-400 mb-12">
            Built on Cloudflare Edge. Free tier with 500 links/month, 1K API calls/day.
            <br />
            Just $9/month for Pro features.
          </p>

          {/* Shortener Form */}
          <div className="card p-8 mb-8">
            <form onSubmit={handleShorten} className="space-y-4">
              <div>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Enter your long URL here..."
                  className="input text-lg"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <input
                  type="text"
                  value={customSlug}
                  onChange={(e) => setCustomSlug(e.target.value)}
                  placeholder="Custom slug (optional, 5-20 characters)"
                  className="input"
                  disabled={loading}
                  pattern="[a-zA-Z0-9_-]{5,20}"
                  title="5-20 alphanumeric characters, hyphens, or underscores"
                />
              </div>

              {error && (
                <div className="bg-error-50 dark:bg-error-900/20 border border-error-500 text-error-600 dark:text-error-400 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {shortUrl && (
                <div className="bg-success-50 dark:bg-success-900/20 border border-success-500 px-4 py-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 text-left">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Your short link:
                      </p>
                      <p className="text-lg font-mono text-primary-500 break-all">
                        {shortUrl}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={copyToClipboard}
                      className="ml-4 btn-secondary whitespace-nowrap"
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Anonymous link expires in 30 days. Sign up for analytics and more features!
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !url}
                className="btn-primary w-full text-lg py-3"
              >
                {loading ? 'Shortening...' : 'Shorten URL'}
              </button>
            </form>

            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              No signup required for anonymous links. Sign up for analytics, QR codes, and more!
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            <div className="card p-6">
              <div className="text-primary-500 text-3xl mb-3">⚡</div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Lightning Fast
              </h3>
              <p className="text-gray-400">
                &lt;50ms redirects globally on Cloudflare Edge
              </p>
            </div>

            <div className="card p-6">
              <div className="text-primary-500 text-3xl mb-3">🔧</div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Developer First
              </h3>
              <p className="text-gray-400">
                1K free API calls/day, full REST API, JWT auth
              </p>
            </div>

            <div className="card p-6">
              <div className="text-primary-500 text-3xl mb-3">💰</div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Affordable
              </h3>
              <p className="text-gray-400">
                Free forever tier. Pro at $9/month, 10x cheaper than Bitly
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-700 mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-gray-400">
          <p>© 2025 EdgeLink. Built with Cloudflare Workers.</p>
        </div>
      </footer>
    </div>
  )
}
