'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getLinks, deleteLink, updateLink, getUser, logout, getAccessToken, type Link as LinkType, setDeviceRouting, getRouting, deleteRouting, type DeviceRouting, type RoutingConfig, setGeoRouting, type GeoRouting } from '@/lib/api'

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
  const [editSlug, setEditSlug] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  // QR code modal state
  const [qrCodeLink, setQrCodeLink] = useState<LinkType | null>(null)
  const [qrCodeData, setQrCodeData] = useState<string | null>(null)
  const [qrCodeLoading, setQrCodeLoading] = useState(false)

  // Routing modal state
  const [routingLink, setRoutingLink] = useState<LinkType | null>(null)
  const [routingConfig, setRoutingConfig] = useState<RoutingConfig | null>(null)
  const [routingLoading, setRoutingLoading] = useState(false)
  const [mobileUrl, setMobileUrl] = useState('')
  const [tabletUrl, setTabletUrl] = useState('')
  const [desktopUrl, setDesktopUrl] = useState('')

  // Geographic routing modal state
  const [geoRoutingLink, setGeoRoutingLink] = useState<LinkType | null>(null)
  const [geoRoutingConfig, setGeoRoutingConfig] = useState<RoutingConfig | null>(null)
  const [geoRoutingLoading, setGeoRoutingLoading] = useState(false)
  const [geoRoutes, setGeoRoutes] = useState<Array<{ country: string; url: string }>>([])

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
    setEditSlug(link.slug)
  }

  const closeEditModal = () => {
    setEditingLink(null)
    setEditDestination('')
    setEditSlug('')
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

    // Validate slug if changed (Pro users only)
    const slugChanged = editSlug !== editingLink.slug
    if (slugChanged) {
      if (user.plan !== 'pro') {
        alert('Changing short codes is a Pro feature. Upgrade to use it.')
        return
      }

      // Validate slug format
      const slugRegex = /^[a-zA-Z0-9-]{5,20}$/
      if (!slugRegex.test(editSlug)) {
        alert('Invalid short code. Must be 5-20 characters, alphanumeric and dashes only.')
        return
      }
    }

    setEditLoading(true)
    try {
      const response = await updateLink(
        editingLink.slug,
        editDestination,
        slugChanged ? editSlug : undefined
      )

      // Update the link in the local state
      setLinks(links.map(link =>
        link.slug === editingLink.slug
          ? { ...link, slug: slugChanged ? editSlug : link.slug, destination: editDestination }
          : link
      ))

      closeEditModal()

      // Show success message if slug changed
      if (slugChanged) {
        alert(`Short code successfully changed from "${editingLink.slug}" to "${editSlug}"`)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update link')
    } finally {
      setEditLoading(false)
    }
  }

  const handleGenerateQR = async (link: LinkType, format: 'svg' | 'png' = 'svg') => {
    if (!user) return

    // Check if user is Pro
    if (user.plan !== 'pro') {
      alert('QR code generation is a Pro feature. Upgrade to unlock this feature!')
      return
    }

    setQrCodeLink(link)
    setQrCodeLoading(true)
    setQrCodeData(null)

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://edgelink-production.quoteviral.workers.dev'
      const accessToken = getAccessToken()

      if (!accessToken) {
        throw new Error('Not authenticated. Please log in again.')
      }

      console.log('Generating QR code for:', link.slug)
      console.log('Token exists:', !!accessToken)

      const headers: HeadersInit = {
        'Authorization': `Bearer ${accessToken}`
      }

      const response = await fetch(`${API_BASE}/api/links/${link.slug}/qr?format=${format}`, {
        method: 'GET',
        headers
      })

      console.log('Response status:', response.status)

      if (!response.ok) {
        let errorMessage = 'Failed to generate QR code'
        try {
          const error = await response.json()
          errorMessage = error.error || errorMessage
          console.error('API Error:', error)
        } catch (e) {
          console.error('Failed to parse error response')
        }

        if (response.status === 401) {
          errorMessage += '. Your session may have expired. Please log in again.'
        }

        throw new Error(errorMessage)
      }

      if (format === 'svg') {
        const svgText = await response.text()
        console.log('QR code generated successfully')
        setQrCodeData(svgText)
      } else {
        // For PNG, convert to data URL for display
        const blob = await response.blob()
        const dataUrl = URL.createObjectURL(blob)
        setQrCodeData(dataUrl)
      }
    } catch (err) {
      console.error('QR Generation Error:', err)
      alert(err instanceof Error ? err.message : 'Failed to generate QR code')
      setQrCodeLink(null)
    } finally {
      setQrCodeLoading(false)
    }
  }

  const downloadQRCode = async (format: 'svg' | 'png') => {
    if (!qrCodeLink) return

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://edgelink-production.quoteviral.workers.dev'
      const accessToken = getAccessToken()

      if (!accessToken) {
        throw new Error('Not authenticated. Please log in again.')
      }

      const headers: HeadersInit = {
        'Authorization': `Bearer ${accessToken}`
      }

      const response = await fetch(`${API_BASE}/api/links/${qrCodeLink.slug}/qr?format=${format}`, {
        method: 'GET',
        headers
      })

      if (!response.ok) {
        throw new Error('Failed to download QR code')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${qrCodeLink.slug}-qr.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to download QR code')
    }
  }

  const closeQRModal = () => {
    setQrCodeLink(null)
    setQrCodeData(null)
    setQrCodeLoading(false)
  }

  // Routing configuration handlers
  const openRoutingModal = async (link: LinkType) => {
    if (!user) return

    // Check if user is Pro
    if (user.plan !== 'pro') {
      alert('Device routing is a Pro feature. Upgrade to unlock this feature!')
      return
    }

    setRoutingLink(link)
    setRoutingLoading(true)
    setMobileUrl('')
    setTabletUrl('')
    setDesktopUrl('')

    try {
      // Load existing routing configuration
      const config = await getRouting(link.slug)
      setRoutingConfig(config)

      // Pre-fill form with existing values
      if (config.routing.device) {
        setMobileUrl(config.routing.device.mobile || '')
        setTabletUrl(config.routing.device.tablet || '')
        setDesktopUrl(config.routing.device.desktop || '')
      }
    } catch (err) {
      // If no routing config exists yet, that's okay
      console.log('No existing routing config:', err)
      setRoutingConfig(null)
    } finally {
      setRoutingLoading(false)
    }
  }

  const closeRoutingModal = () => {
    setRoutingLink(null)
    setRoutingConfig(null)
    setMobileUrl('')
    setTabletUrl('')
    setDesktopUrl('')
    setRoutingLoading(false)
  }

  const handleSaveRouting = async () => {
    if (!routingLink) return

    // Validate that at least one URL is provided
    if (!mobileUrl.trim() && !tabletUrl.trim() && !desktopUrl.trim()) {
      alert('Please provide at least one device URL')
      return
    }

    // Validate URLs
    const urlsToValidate = [
      { url: mobileUrl, name: 'Mobile' },
      { url: tabletUrl, name: 'Tablet' },
      { url: desktopUrl, name: 'Desktop' }
    ]

    for (const { url, name } of urlsToValidate) {
      if (url.trim()) {
        // Check URL format
        try {
          new URL(url)
        } catch {
          alert(`${name} URL is invalid. Please enter a valid URL.`)
          return
        }

        // Check for redirect loop - prevent using the short URL as destination
        if (url.includes(`/${routingLink.slug}`)) {
          alert(`⚠️ ${name} URL cannot contain your short link (/${routingLink.slug}).\n\nThis would create a redirect loop!\n\nPlease use only destination URLs (e.g., https://example.com).`)
          return
        }
      }
    }

    setRoutingLoading(true)
    try {
      const routing: DeviceRouting = {}
      if (mobileUrl.trim()) routing.mobile = mobileUrl.trim()
      if (tabletUrl.trim()) routing.tablet = tabletUrl.trim()
      if (desktopUrl.trim()) routing.desktop = desktopUrl.trim()

      await setDeviceRouting(routingLink.slug, routing)
      alert('Device routing configured successfully! ✅')
      closeRoutingModal()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save routing configuration')
    } finally {
      setRoutingLoading(false)
    }
  }

  const handleDeleteRouting = async () => {
    if (!routingLink) return

    if (!confirm('Are you sure you want to delete all routing rules for this link?')) {
      return
    }

    setRoutingLoading(true)
    try {
      await deleteRouting(routingLink.slug)
      alert('Routing rules deleted successfully')
      closeRoutingModal()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete routing rules')
    } finally {
      setRoutingLoading(false)
    }
  }

  // Geographic routing handlers
  const openGeoRoutingModal = async (link: LinkType) => {
    if (!user) return

    // Check if user is Pro
    if (user.plan !== 'pro') {
      alert('Geographic routing is a Pro feature. Upgrade to unlock this feature!')
      return
    }

    setGeoRoutingLink(link)
    setGeoRoutingLoading(true)
    setGeoRoutes([])

    try {
      // Load existing routing configuration
      const config = await getRouting(link.slug)
      setGeoRoutingConfig(config)

      // Pre-fill form with existing values
      if (config.routing.geo) {
        const routes = Object.entries(config.routing.geo).map(([country, url]) => ({
          country,
          url
        }))
        setGeoRoutes(routes)
      }
    } catch (err) {
      // If no routing config exists yet, that's okay
      console.log('No existing geo routing config:', err)
      setGeoRoutingConfig(null)
    } finally {
      setGeoRoutingLoading(false)
    }
  }

  const closeGeoRoutingModal = () => {
    setGeoRoutingLink(null)
    setGeoRoutingConfig(null)
    setGeoRoutes([])
    setGeoRoutingLoading(false)
  }

  const addGeoRoute = () => {
    setGeoRoutes([...geoRoutes, { country: '', url: '' }])
  }

  const removeGeoRoute = (index: number) => {
    setGeoRoutes(geoRoutes.filter((_, i) => i !== index))
  }

  const updateGeoRoute = (index: number, field: 'country' | 'url', value: string) => {
    const updated = [...geoRoutes]
    updated[index] = { ...updated[index], [field]: value }
    setGeoRoutes(updated)
  }

  const handleSaveGeoRouting = async () => {
    if (!geoRoutingLink) return

    // Validate that at least one route is provided
    if (geoRoutes.length === 0) {
      alert('Please add at least one geographic route')
      return
    }

    // Validate routes
    for (let i = 0; i < geoRoutes.length; i++) {
      const route = geoRoutes[i]

      if (!route.country.trim()) {
        alert(`Please select a country for route ${i + 1}`)
        return
      }

      if (!route.url.trim()) {
        alert(`Please enter a URL for ${route.country}`)
        return
      }

      // Validate URL format
      try {
        new URL(route.url)
      } catch {
        alert(`URL for ${route.country} is invalid. Please enter a valid URL.`)
        return
      }

      // Check for redirect loop
      if (route.url.includes(`/${geoRoutingLink.slug}`)) {
        alert(`⚠️ URL for ${route.country} cannot contain your short link (/${geoRoutingLink.slug}).\n\nThis would create a redirect loop!\n\nPlease use only destination URLs (e.g., https://example.com).`)
        return
      }
    }

    // Check for duplicate countries
    const countries = geoRoutes.map(r => r.country)
    const duplicates = countries.filter((c, i) => countries.indexOf(c) !== i)
    if (duplicates.length > 0) {
      alert(`Duplicate country codes detected: ${duplicates.join(', ')}. Each country can only have one route.`)
      return
    }

    setGeoRoutingLoading(true)
    try {
      const routing: GeoRouting = {}
      geoRoutes.forEach(route => {
        if (route.country.trim() && route.url.trim()) {
          routing[route.country.toUpperCase()] = route.url.trim()
        }
      })

      await setGeoRouting(geoRoutingLink.slug, routing)
      alert('Geographic routing configured successfully! ✅')
      closeGeoRoutingModal()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save geographic routing')
    } finally {
      setGeoRoutingLoading(false)
    }
  }

  const handleDeleteGeoRouting = async () => {
    if (!geoRoutingLink) return

    if (!confirm('Are you sure you want to delete all geographic routing rules for this link?')) {
      return
    }

    setGeoRoutingLoading(true)
    try {
      await deleteRouting(geoRoutingLink.slug)
      alert('Geographic routing rules deleted successfully')
      closeGeoRoutingModal()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete geographic routing rules')
    } finally {
      setGeoRoutingLoading(false)
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
                        onClick={() => handleGenerateQR(link, 'svg')}
                        className="btn-secondary text-sm"
                        title={user?.plan !== 'pro' ? 'QR code generation is a Pro feature' : 'Generate QR code'}
                      >
                        {user?.plan === 'pro' ? '📱 QR Code' : '🔒 QR Code'}
                      </button>
                      <button
                        onClick={() => openRoutingModal(link)}
                        className="btn-secondary text-sm"
                        title={user?.plan !== 'pro' ? 'Device routing is a Pro feature' : 'Configure device routing'}
                      >
                        {user?.plan === 'pro' ? '🔀 Device' : '🔒 Device'}
                      </button>
                      <button
                        onClick={() => openGeoRoutingModal(link)}
                        className="btn-secondary text-sm"
                        title={user?.plan !== 'pro' ? 'Geographic routing is a Pro feature' : 'Configure geographic routing'}
                      >
                        {user?.plan === 'pro' ? '🌍 Geo' : '🔒 Geo'}
                      </button>
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
                    Get 5,000 links/month, 10K API calls/day, geographic routing, device routing, QR codes, and more
                  </p>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>✓ Geographic routing (country-based redirects)</li>
                    <li>✓ Device routing (mobile, tablet, desktop)</li>
                    <li>✓ A/B testing & referrer routing</li>
                    <li>✓ Password-protected links & QR codes</li>
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
                {user.plan === 'pro' ? (
                  <p className="text-sm text-gray-400 mt-1">
                    Update your link settings below
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 mt-1">
                    Short code: <code className="text-primary-500">{editingLink.slug}</code>
                    <span className="text-gray-500 ml-2">(Pro feature to change)</span>
                  </p>
                )}
              </div>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Short Code Field (Pro only) */}
              {user.plan === 'pro' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Short Code
                    <span className="ml-2 px-2 py-0.5 bg-primary-500/20 text-primary-400 text-xs rounded border border-primary-500/30">
                      PRO
                    </span>
                  </label>
                  <input
                    type="text"
                    value={editSlug}
                    onChange={(e) => setEditSlug(e.target.value)}
                    placeholder="my-custom-slug"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                    disabled={editLoading}
                    pattern="[a-zA-Z0-9-]{5,20}"
                    maxLength={20}
                    minLength={5}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    5-20 characters, alphanumeric and dashes only. Change your short code (Pro feature)
                  </p>
                </div>
              )}

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

      {/* QR Code Modal */}
      {qrCodeLink && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full p-6 border border-gray-700">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">QR Code</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Scan to access: <code className="text-primary-500">{getShortUrl(qrCodeLink)}</code>
                </p>
              </div>
              <button
                onClick={closeQRModal}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* QR Code Display */}
              <div className="bg-white p-8 rounded-lg flex items-center justify-center min-h-[400px]">
                {qrCodeLoading ? (
                  <div className="text-gray-600 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-2"></div>
                    <p>Generating QR code...</p>
                  </div>
                ) : qrCodeData ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: qrCodeData }}
                    className="w-80 h-80"
                    style={{ imageRendering: 'pixelated' }}
                  />
                ) : (
                  <div className="text-gray-600">Failed to generate QR code</div>
                )}
              </div>

              {/* Download Options */}
              {qrCodeData && !qrCodeLoading && (
                <div className="flex justify-center space-x-3 pt-4">
                  <button
                    onClick={() => downloadQRCode('svg')}
                    className="btn-secondary"
                  >
                    📥 Download SVG
                  </button>
                  <button
                    onClick={() => downloadQRCode('png')}
                    className="btn-primary"
                  >
                    📥 Download PNG
                  </button>
                </div>
              )}

              {/* Info */}
              <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4">
                <p className="text-sm text-gray-300">
                  <span className="font-semibold text-primary-400">Pro Tip:</span> Share this QR code on
                  printed materials, social media, or presentations. Anyone who scans it will be redirected
                  to your destination URL.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Device Routing Modal */}
      {routingLink && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full p-6 border border-gray-700">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">Device Routing</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Configure different URLs for mobile, tablet, and desktop users
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Link: <code className="text-primary-500">{getShortUrl(routingLink)}</code>
                </p>
              </div>
              <button
                onClick={closeRoutingModal}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {routingLoading && !mobileUrl && !tabletUrl && !desktopUrl ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading routing configuration...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Info Banner */}
                <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4">
                  <p className="text-sm text-gray-300">
                    <span className="font-semibold text-primary-400">How it works:</span> Visitors will be
                    automatically redirected to different URLs based on their device type. Detection is done
                    via User-Agent header parsing.
                  </p>
                </div>

                {/* Warning Banner */}
                <div className="bg-error-500/10 border border-error-500/30 rounded-lg p-4">
                  <p className="text-sm text-gray-300">
                    <span className="font-semibold text-error-400">⚠️ Important:</span> Enter only destination URLs (e.g., <code className="text-primary-400">https://example.com</code>).
                    <br />
                    <span className="text-xs text-gray-400 mt-1 inline-block">
                      DO NOT use your short link (<code className="text-error-400">/{routingLink.slug}</code>) as this will create a redirect loop!
                    </span>
                  </p>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  {/* Mobile URL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      📱 Mobile URL
                      <span className="text-gray-500 ml-2 font-normal">(iPhone, Android phones)</span>
                    </label>
                    <input
                      type="url"
                      value={mobileUrl}
                      onChange={(e) => setMobileUrl(e.target.value)}
                      placeholder="https://example.com (destination URL only)"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      disabled={routingLoading}
                    />
                  </div>

                  {/* Tablet URL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      💻 Tablet URL
                      <span className="text-gray-500 ml-2 font-normal">(iPad, Android tablets)</span>
                    </label>
                    <input
                      type="url"
                      value={tabletUrl}
                      onChange={(e) => setTabletUrl(e.target.value)}
                      placeholder="https://example.com (destination URL only)"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      disabled={routingLoading}
                    />
                  </div>

                  {/* Desktop URL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      🖥️ Desktop URL
                      <span className="text-gray-500 ml-2 font-normal">(Computers, laptops)</span>
                    </label>
                    <input
                      type="url"
                      value={desktopUrl}
                      onChange={(e) => setDesktopUrl(e.target.value)}
                      placeholder="https://example.com (destination URL only)"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      disabled={routingLoading}
                    />
                  </div>
                </div>

                {/* Device Detection Info */}
                <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-white mb-2">Device Detection Patterns</h4>
                  <div className="text-xs text-gray-400 space-y-1">
                    <p><span className="text-primary-400">Mobile:</span> User-Agent contains Mobile, Android, or iPhone</p>
                    <p><span className="text-primary-400">Tablet:</span> User-Agent contains iPad or Tablet</p>
                    <p><span className="text-primary-400">Desktop:</span> Default for all other devices</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-600">
                  <div>
                    {routingConfig?.routing?.device && (
                      <button
                        onClick={handleDeleteRouting}
                        className="text-sm text-error-500 hover:text-error-400 disabled:opacity-50"
                        disabled={routingLoading}
                      >
                        🗑️ Delete Routing Rules
                      </button>
                    )}
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={closeRoutingModal}
                      className="btn-secondary"
                      disabled={routingLoading}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveRouting}
                      className="btn-primary disabled:opacity-50"
                      disabled={routingLoading}
                    >
                      {routingLoading ? 'Saving...' : 'Save Routing'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Geographic Routing Modal */}
      {geoRoutingLink && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-3xl w-full p-6 border border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">Geographic Routing</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Route visitors to different URLs based on their country
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Link: <code className="text-primary-500">{getShortUrl(geoRoutingLink)}</code>
                </p>
              </div>
              <button
                onClick={closeGeoRoutingModal}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {geoRoutingLoading && geoRoutes.length === 0 ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading geographic routing configuration...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Info Banner */}
                <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4">
                  <p className="text-sm text-gray-300">
                    <span className="font-semibold text-primary-400">How it works:</span> Visitors will be
                    automatically redirected to different URLs based on their country. Country detection uses
                    Cloudflare's <code className="text-primary-400">cf-ipcountry</code> header (ISO 3166-1 alpha-2 codes).
                  </p>
                </div>

                {/* Warning Banner */}
                <div className="bg-error-500/10 border border-error-500/30 rounded-lg p-4">
                  <p className="text-sm text-gray-300">
                    <span className="font-semibold text-error-400">⚠️ Important:</span> Enter only destination URLs (e.g., <code className="text-primary-400">https://example.com</code>).
                    <br />
                    <span className="text-xs text-gray-400 mt-1 inline-block">
                      DO NOT use your short link (<code className="text-error-400">/{geoRoutingLink.slug}</code>) as this will create a redirect loop!
                    </span>
                  </p>
                </div>

                {/* Country Routes */}
                <div className="space-y-3">
                  {geoRoutes.map((route, index) => (
                    <div key={index} className="flex gap-3 items-start">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Country Code
                        </label>
                        <select
                          value={route.country}
                          onChange={(e) => updateGeoRoute(index, 'country', e.target.value)}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                          disabled={geoRoutingLoading}
                        >
                          <option value="">Select country...</option>
                          <option value="US">🇺🇸 United States (US)</option>
                          <option value="GB">🇬🇧 United Kingdom (GB)</option>
                          <option value="CA">🇨🇦 Canada (CA)</option>
                          <option value="AU">🇦🇺 Australia (AU)</option>
                          <option value="IN">🇮🇳 India (IN)</option>
                          <option value="DE">🇩🇪 Germany (DE)</option>
                          <option value="FR">🇫🇷 France (FR)</option>
                          <option value="IT">🇮🇹 Italy (IT)</option>
                          <option value="ES">🇪🇸 Spain (ES)</option>
                          <option value="BR">🇧🇷 Brazil (BR)</option>
                          <option value="MX">🇲🇽 Mexico (MX)</option>
                          <option value="JP">🇯🇵 Japan (JP)</option>
                          <option value="CN">🇨🇳 China (CN)</option>
                          <option value="KR">🇰🇷 South Korea (KR)</option>
                          <option value="SG">🇸🇬 Singapore (SG)</option>
                          <option value="NL">🇳🇱 Netherlands (NL)</option>
                          <option value="SE">🇸🇪 Sweden (SE)</option>
                          <option value="CH">🇨🇭 Switzerland (CH)</option>
                          <option value="BE">🇧🇪 Belgium (BE)</option>
                          <option value="PL">🇵🇱 Poland (PL)</option>
                          <option value="RU">🇷🇺 Russia (RU)</option>
                          <option value="ZA">🇿🇦 South Africa (ZA)</option>
                          <option value="AR">🇦🇷 Argentina (AR)</option>
                          <option value="default">🌐 Default/Fallback (all others)</option>
                        </select>
                      </div>
                      <div className="flex-[2]">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Destination URL
                        </label>
                        <input
                          type="url"
                          value={route.url}
                          onChange={(e) => updateGeoRoute(index, 'url', e.target.value)}
                          placeholder="https://example.com"
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          disabled={geoRoutingLoading}
                        />
                      </div>
                      <div className="pt-8">
                        <button
                          onClick={() => removeGeoRoute(index)}
                          className="text-error-500 hover:text-error-400 text-sm px-3 py-2"
                          disabled={geoRoutingLoading}
                          title="Remove this route"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add Country Button */}
                  <button
                    onClick={addGeoRoute}
                    className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-gray-300 hover:text-white transition-colors disabled:opacity-50"
                    disabled={geoRoutingLoading}
                  >
                    + Add Country
                  </button>
                </div>

                {/* Country Detection Info */}
                <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-white mb-2">Country Detection & Fallback</h4>
                  <div className="text-xs text-gray-400 space-y-1">
                    <p><span className="text-primary-400">Detection:</span> Uses Cloudflare's <code>cf-ipcountry</code> header for instant country identification</p>
                    <p><span className="text-primary-400">Codes:</span> ISO 3166-1 alpha-2 (e.g., US, GB, IN, etc.)</p>
                    <p><span className="text-primary-400">Fallback:</span> Set "default" route for unmatched countries, otherwise uses main destination URL</p>
                    <p><span className="text-primary-400">Priority:</span> Geographic routing has priority over referrer routing</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-600">
                  <div>
                    {geoRoutingConfig?.routing?.geo && (
                      <button
                        onClick={handleDeleteGeoRouting}
                        className="text-sm text-error-500 hover:text-error-400 disabled:opacity-50"
                        disabled={geoRoutingLoading}
                      >
                        🗑️ Delete Geographic Routing
                      </button>
                    )}
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={closeGeoRoutingModal}
                      className="btn-secondary"
                      disabled={geoRoutingLoading}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveGeoRouting}
                      className="btn-primary disabled:opacity-50"
                      disabled={geoRoutingLoading || geoRoutes.length === 0}
                    >
                      {geoRoutingLoading ? 'Saving...' : 'Save Routing'}
                    </button>
                  </div>
                </div>
              </div>
            )}
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
