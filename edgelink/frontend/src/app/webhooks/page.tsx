'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getUser, logout } from '@/lib/api'

interface Webhook {
  webhook_id: string
  url: string
  name: string
  events: string[]
  slug: string | null
  active: boolean
  last_triggered_at: string | null
  created_at: string
}

export default function WebhooksPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newWebhook, setNewWebhook] = useState({
    url: '',
    name: '',
    events: [] as string[],
    slug: ''
  })
  const [createdSecret, setCreatedSecret] = useState<string | null>(null)

  const availableEvents = [
    { value: 'link.created', label: 'Link Created' },
    { value: 'link.clicked', label: 'Link Clicked' },
    { value: 'link.milestone', label: 'Link Milestone (100, 1000 clicks)' },
    { value: 'link.expired', label: 'Link Expired' }
  ]

  useEffect(() => {
    const currentUser = getUser()
    if (!currentUser) {
      router.push('/login')
      return
    }
    setUser(currentUser)
    loadWebhooks()
  }, [router])

  const loadWebhooks = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/webhooks`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) throw new Error('Failed to fetch webhooks')

      const data = await response.json()
      setWebhooks(data.webhooks)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/webhooks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: newWebhook.url,
          name: newWebhook.name,
          events: newWebhook.events,
          slug: newWebhook.slug || null
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      const data = await response.json()
      setCreatedSecret(data.secret)
      setShowModal(false)
      setNewWebhook({ url: '', name: '', events: [], slug: '' })
      loadWebhooks()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create webhook')
    }
  }

  const handleDelete = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return

    try {
      const token = localStorage.getItem('access_token')
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/webhooks/${webhookId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      loadWebhooks()
    } catch (err) {
      alert('Failed to delete webhook')
    }
  }

  const handleEventToggle = (event: string) => {
    setNewWebhook(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }))
  }

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  if (!user) return null

  // Check if user is Pro
  const isPro = user.plan === 'pro'

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
            <Link href="/dashboard" className="text-gray-300 hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link href="/domains" className="text-gray-300 hover:text-white transition-colors">
              🌐 Domains
            </Link>
            <Link href="/apikeys" className="text-gray-300 hover:text-white transition-colors">
              🔑 API Keys
            </Link>
            <Link href="/webhooks" className="text-white font-medium">
              🪝 Webhooks
            </Link>
            <span className="text-gray-400">{user.email}</span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary-500/20 text-primary-400 border border-primary-500/30">
              {isPro ? 'Pro' : 'Free'}
            </span>
            <button onClick={handleLogout} className="btn-secondary">Logout</button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Webhooks</h2>
              <p className="text-gray-400">
                Configure webhook notifications for link events
              </p>
            </div>
            {isPro && (
              <button onClick={() => setShowModal(true)} className="btn-primary">
                + Create Webhook
              </button>
            )}
          </div>

          {/* Pro Feature Gate */}
          {!isPro && (
            <div className="card p-8 bg-gradient-to-r from-primary-900/20 to-primary-800/20 border-primary-500/30 mb-8">
              <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-2">
                  Webhooks are a Pro Feature
                </h3>
                <p className="text-gray-300 mb-4">
                  Upgrade to Pro to receive real-time notifications for link events
                </p>
                <button className="btn-primary">Upgrade to Pro - $9/month</button>
              </div>
            </div>
          )}

          {/* Secret Display Modal */}
          {createdSecret && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="card p-8 max-w-2xl w-full mx-4">
                <h3 className="text-2xl font-bold text-white mb-4">⚠️ Save Your Webhook Secret</h3>
                <p className="text-gray-300 mb-4">
                  This secret will only be shown once. Use it to verify webhook signatures.
                </p>
                <div className="bg-gray-900 p-4 rounded-lg mb-4 font-mono text-sm break-all">
                  {createdSecret}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(createdSecret)
                    alert('Secret copied to clipboard!')
                  }}
                  className="btn-secondary mb-4"
                >
                  📋 Copy Secret
                </button>
                <button onClick={() => setCreatedSecret(null)} className="btn-primary">
                  I've Saved It
                </button>
              </div>
            </div>
          )}

          {/* Webhooks List */}
          {loading ? (
            <div className="card p-8 text-center">
              <div className="text-gray-400">Loading webhooks...</div>
            </div>
          ) : webhooks.length === 0 ? (
            <div className="card p-8 text-center">
              <div className="text-gray-400 mb-4">
                {isPro
                  ? "You haven't created any webhooks yet"
                  : 'Upgrade to Pro to use webhooks'}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {webhooks.map((webhook) => (
                <div key={webhook.webhook_id} className="card p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{webhook.name}</h3>
                        <span className={`px-2 py-1 rounded text-xs ${
                          webhook.active
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {webhook.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400 mb-3">
                        <code>{webhook.url}</code>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {webhook.events.map((event) => (
                          <span key={event} className="px-2 py-1 rounded text-xs bg-primary-500/20 text-primary-400">
                            {event}
                          </span>
                        ))}
                      </div>
                      {webhook.slug && (
                        <div className="text-sm text-gray-500">
                          Specific link: <code>{webhook.slug}</code>
                        </div>
                      )}
                      {webhook.last_triggered_at && (
                        <div className="text-xs text-gray-500 mt-2">
                          Last triggered: {new Date(webhook.last_triggered_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(webhook.webhook_id)}
                      className="btn-secondary text-sm text-error-500 hover:bg-error-500/10"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create Webhook Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="card p-8 max-w-2xl w-full mx-4">
                <h3 className="text-2xl font-bold text-white mb-6">Create Webhook</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Webhook Name
                    </label>
                    <input
                      type="text"
                      className="input w-full"
                      placeholder="My webhook"
                      value={newWebhook.name}
                      onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Webhook URL
                    </label>
                    <input
                      type="url"
                      className="input w-full"
                      placeholder="https://api.example.com/webhooks"
                      value={newWebhook.url}
                      onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Events
                    </label>
                    <div className="space-y-2">
                      {availableEvents.map((event) => (
                        <label key={event.value} className="flex items-center space-x-2 text-gray-300">
                          <input
                            type="checkbox"
                            checked={newWebhook.events.includes(event.value)}
                            onChange={() => handleEventToggle(event.value)}
                            className="rounded"
                          />
                          <span>{event.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Specific Link (Optional)
                    </label>
                    <input
                      type="text"
                      className="input w-full"
                      placeholder="Leave empty for all links"
                      value={newWebhook.slug}
                      onChange={(e) => setNewWebhook({ ...newWebhook, slug: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Leave empty to receive events for all links
                    </p>
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button onClick={() => setShowModal(false)} className="btn-secondary">
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!newWebhook.url || !newWebhook.name || newWebhook.events.length === 0}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Webhook
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Documentation */}
          {isPro && (
            <div className="card p-6 mt-8">
              <h3 className="text-lg font-semibold text-white mb-4">Webhook Documentation</h3>
              <div className="text-sm text-gray-300 space-y-3">
                <p>
                  Webhooks send POST requests to your endpoint when events occur.
                </p>
                <div className="bg-gray-900 p-4 rounded-lg">
                  <p className="text-gray-400 mb-2">Request Headers:</p>
                  <code className="text-xs block">
                    X-EdgeLink-Signature: HMAC-SHA256 signature<br/>
                    X-EdgeLink-Event: event type<br/>
                    Content-Type: application/json
                  </code>
                </div>
                <div className="bg-gray-900 p-4 rounded-lg">
                  <p className="text-gray-400 mb-2">Request Body:</p>
                  <code className="text-xs block">
                    {'{'}
                    <br/>&nbsp;&nbsp;"event": "link.clicked",
                    <br/>&nbsp;&nbsp;"slug": "abc123",
                    <br/>&nbsp;&nbsp;"clicks": 100,
                    <br/>&nbsp;&nbsp;"timestamp": 1699315200,
                    <br/>&nbsp;&nbsp;"user_id": "usr_12345"
                    <br/>{'}'}
                  </code>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
