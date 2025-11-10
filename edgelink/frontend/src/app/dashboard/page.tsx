'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getLinks, deleteLink, updateLink, getUser, logout, type Link as LinkType } from '@/lib/api'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [links, setLinks] = useState<LinkType[]>([])
  const [filteredLinks, setFilteredLinks] = useState<LinkType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  // Edit modal state
  const [editingLink, setEditingLink] = useState<LinkType | null>(null)
  const [editDestination, setEditDestination] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchField, setSearchField] = useState<'all' | 'slug' | 'destination' | 'date'>('all')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const linksPerPage = 50

  useEffect(() => {
    const currentUser = getUser()
    if (!currentUser) {
      router.push('/login')
      return
    }
    setUser(currentUser)
    loadLinks()
  }, [router])

  // Search and filter effect
  useEffect(() => {
    if (!searchQuery) {
      setFilteredLinks(links)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = links.filter(link => {
      if (searchField === 'slug') {
        return link.slug.toLowerCase().includes(query)
      } else if (searchField === 'destination') {
        return link.destination.toLowerCase().includes(query)
      } else if (searchField === 'date') {
        return formatDate(link.created_at).toLowerCase().includes(query)
      } else {
        // 'all' - search in all fields
        return (
          link.slug.toLowerCase().includes(query) ||
          link.destination.toLowerCase().includes(query) ||
          formatDate(link.created_at).toLowerCase().includes(query)
        )
      }
    })
    setFilteredLinks(filtered)
    setCurrentPage(1) // Reset to first page on search
  }, [searchQuery, searchField, links])

  const loadLinks = async () => {
    try {
      setLoading(true)
      const data = await getLinks()
      setLinks(data.links)
      setFilteredLinks(data.links)
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
    if (!confirm('Are you sure you want to delete this link? This action cannot be undone.')) {
      return
    }

    try {
      await deleteLink(slug)
      setLinks(links.filter(link => link.slug !== slug))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete link')
    }
  }

  const openEditModal = (link: LinkType) => {
    setEditingLink(link)
    setEditDestination(link.destination)
  }

  const closeEditModal = () => {
    setEditingLink(null)
    setEditDestination('')
    setEditLoading(false)
  }

  const handleEditSubmit = async () => {
    if (!editingLink || !editDestination.trim()) {
      return
    }

    // Basic URL validation
    try {
      new URL(editDestination)
    } catch {
      alert('Please enter a valid URL')
      return
    }

    setEditLoading(true)
    try {
      await updateLink(editingLink.slug, editDestination)

      // Update the link in the local state
      setLinks(links.map(link =>
        link.slug === editingLink.slug
          ? { ...link, destination: editDestination }
          : link
      ))

      closeEditModal()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update link')
    } finally {
      setEditLoading(false)
    }
  }

  const copyToClipboard = (url: string, slug: string) => {
    navigator.clipboard.writeText(url)
    setCopied(slug)
    setTimeout(() => setCopied(null), 2000)
  }

  const getShortUrl = (link: LinkType) => {
    const domain = link.custom_domain || 'edgelink-production.quoteviral.workers.dev'
    return `https://${domain}/${link.slug}`
  }

  const getDisplayDomain = (link: LinkType) => {
    return link.custom_domain || 'edgelink-production.quoteviral.workers.dev'
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Pagination calculations
  const totalPages = Math.ceil(filteredLinks.length / linksPerPage)
  const startIndex = (currentPage - 1) * linksPerPage
  const endIndex = startIndex + linksPerPage
  const currentLinks = filteredLinks.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
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

          {/* Header with Create Link Button */}
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Your Links</h2>
            <Link href="/create" className="btn-primary">
              + Create New Link
            </Link>
          </div>

          {/* Search and Filter */}
          <div className="card p-4 mb-6">
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search links..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <select
                  value={searchField}
                  onChange={(e) => setSearchField(e.target.value as any)}
                  className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="all">All Fields</option>
                  <option value="slug">Short Code</option>
                  <option value="destination">Destination URL</option>
                  <option value="date">Creation Date</option>
                </select>
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="btn-secondary text-sm"
                >
                  Clear
                </button>
              )}
            </div>
            {searchQuery && (
              <div className="mt-2 text-sm text-gray-400">
                Found {filteredLinks.length} link{filteredLinks.length !== 1 ? 's' : ''}
              </div>
            )}
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
              <Link href="/create" className="btn-primary">
                Create Your First Link
              </Link>
            </div>
          ) : filteredLinks.length === 0 ? (
            <div className="card p-8 text-center">
              <div className="text-gray-400 mb-4">No links match your search</div>
              <button onClick={() => setSearchQuery('')} className="btn-secondary">
                Clear Search
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {currentLinks.map((link) => (
                <div key={link.slug} className="card p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Short URL */}
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="flex items-center gap-2">
                          <code className="text-primary-500 font-mono text-lg">
                            {getDisplayDomain(link)}/{link.slug}
                          </code>
                          {link.custom_domain && (
                            <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs font-medium rounded border border-blue-700">
                              Custom Domain
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => copyToClipboard(getShortUrl(link), link.slug)}
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
                      <button
                        onClick={() => openEditModal(link)}
                        className="btn-secondary text-sm"
                      >
                        ✏️ Edit
                      </button>
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="card p-4 mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredLinks.length)} of {filteredLinks.length} links
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Previous
                  </button>
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => goToPage(pageNum)}
                          className={`px-3 py-1 rounded text-sm ${
                            currentPage === pageNum
                              ? 'bg-primary-500 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
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

      {/* Edit Link Modal */}
      {editingLink && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full p-6 border border-gray-700">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">Edit Link</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Short code: <code className="text-primary-500">{editingLink.slug}</code>
                  <span className="text-gray-500 ml-2">(cannot be changed)</span>
                </p>
              </div>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Destination URL
                </label>
                <input
                  type="url"
                  value={editDestination}
                  onChange={(e) => setEditDestination(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                  disabled={editLoading}
                />
                <p className="text-xs text-gray-400 mt-1">
                  You can change the destination URL unlimited times
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={closeEditModal}
                  className="btn-secondary"
                  disabled={editLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSubmit}
                  className="btn-primary"
                  disabled={editLoading || !editDestination.trim()}
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-700 mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-gray-400">
          <p>© 2025 EdgeLink. Built with Cloudflare Workers.</p>
        </div>
      </footer>
    </div>
  )
}
