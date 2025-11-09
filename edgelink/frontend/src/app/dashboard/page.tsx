'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getLinks, deleteLink, getUser, logout, type Link as LinkType } from '@/lib/api'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [links, setLinks] = useState<LinkType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    const currentUser = getUser()
    if (!currentUser) {
      router.push('/login')
      return
    }
    setUser(currentUser)
    loadLinks()
  }, [router])

  const loadLinks = async () => {
    try {
      setLoading(true)
      const data = await getLinks()
      setLinks(data.links)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load links')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  const handleDelete = async (slug: string) => {
    if (!confirm('Are you sure you want to delete this link?')) {
      return
    }

    try {
      await deleteLink(slug)
      setLinks(links.filter(link => link.slug !== slug))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete link')
    }
  }

  const copyToClipboard = (url: string, slug: string) => {
    navigator.clipboard.writeText(url)
    setCopied(slug)
    setTimeout(() => setCopied(null), 2000)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-500 rounded-lg"></div>
              <h1 className="text-xl font-bold text-white">EdgeLink</h1>
            </Link>
          </div>
          <nav className="flex items-center space-x-4">
            <Link href="/create" className="text-gray-300 hover:text-white transition-colors">
              ➕ Create Link
            </Link>
            <Link href="/import-export" className="text-gray-300 hover:text-white transition-colors">
              📦 Import/Export
            </Link>
            <Link href="/domains" className="text-gray-300 hover:text-white transition-colors">
              🌐 Domains
            </Link>
            <Link href="/apikeys" className="text-gray-300 hover:text-white transition-colors">
              🔑 API Keys
            </Link>
            <Link href="/webhooks" className="text-gray-300 hover:text-white transition-colors">
              🪝 Webhooks
            </Link>
            <span className="text-gray-400">
              {user.email}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary-500/20 text-primary-400 border border-primary-500/30">
              {user.plan === 'pro' ? 'Pro' : 'Free'}
            </span>
            <button onClick={handleLogout} className="btn-secondary">
              Logout
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card p-6">
              <div className="text-gray-400 text-sm mb-1">Total Links</div>
              <div className="text-3xl font-bold text-white">{links.length}</div>
            </div>
            <div className="card p-6">
              <div className="text-gray-400 text-sm mb-1">Total Clicks</div>
              <div className="text-3xl font-bold text-white">
                {links.reduce((sum, link) => sum + link.click_count, 0)}
              </div>
            </div>
            <div className="card p-6">
              <div className="text-gray-400 text-sm mb-1">Plan Limit</div>
              <div className="text-3xl font-bold text-white">
                {user.plan === 'pro' ? '5,000' : '500'} <span className="text-lg text-gray-400">/mo</span>
              </div>
            </div>
          </div>

          {/* Create Link Button */}
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Your Links</h2>
            <Link href="/" className="btn-primary">
              + Create New Link
            </Link>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-error-50 dark:bg-error-900/20 border border-error-500 text-error-600 dark:text-error-400 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Links List */}
          {loading ? (
            <div className="card p-8 text-center">
              <div className="text-gray-400">Loading your links...</div>
            </div>
          ) : links.length === 0 ? (
            <div className="card p-8 text-center">
              <div className="text-gray-400 mb-4">You haven't created any links yet</div>
              <Link href="/" className="btn-primary">
                Create Your First Link
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {links.map((link) => (
                <div key={link.slug} className="card p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Short URL */}
                      <div className="flex items-center space-x-3 mb-2">
                        <code className="text-primary-500 font-mono text-lg">
                          edgelink.io/{link.slug}
                        </code>
                        <button
                          onClick={() => copyToClipboard(`https://edgelink.io/${link.slug}`, link.slug)}
                          className="text-gray-400 hover:text-white text-sm"
                        >
                          {copied === link.slug ? '✓ Copied' : '📋 Copy'}
                        </button>
                      </div>

                      {/* Destination */}
                      <div className="text-gray-400 text-sm truncate mb-3">
                        → {link.destination}
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Created {formatDate(link.created_at)}</span>
                        <span>•</span>
                        <span className="font-medium text-primary-400">
                          {link.click_count} clicks
                        </span>
                        {link.expires_at && (
                          <>
                            <span>•</span>
                            <span>Expires {formatDate(link.expires_at)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                      <Link
                        href={`/analytics/${link.slug}`}
                        className="btn-secondary text-sm"
                      >
                        📊 Analytics
                      </Link>
                      <button
                        onClick={() => handleDelete(link.slug)}
                        className="btn-secondary text-sm text-error-500 hover:bg-error-500/10"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upgrade CTA for Free Users */}
          {user.plan === 'free' && (
            <div className="card p-8 mt-8 bg-gradient-to-r from-primary-900/20 to-primary-800/20 border-primary-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Upgrade to Pro
                  </h3>
                  <p className="text-gray-300 mb-4">
                    Get 5,000 links/month, 10K API calls/day, device routing, QR codes, and more
                  </p>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>✓ Advanced routing (device, geo, referrer)</li>
                    <li>✓ A/B testing</li>
                    <li>✓ Password-protected links</li>
                    <li>✓ Webhooks & advanced analytics</li>
                  </ul>
                </div>
                <div className="text-right ml-8">
                  <div className="text-4xl font-bold text-white mb-2">$9</div>
                  <div className="text-gray-400 mb-4">/month</div>
                  <button className="btn-primary">
                    Upgrade Now
                  </button>
                </div>
              </div>
            </div>
          )}
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
