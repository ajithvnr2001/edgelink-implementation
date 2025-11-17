'use client'

/**
 * EdgeLink API & Webhooks Documentation
 * Comprehensive guide for developers
 */

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'

export default function DocsPage() {
  const { isSignedIn, isLoaded } = useAuth()
  const [activeTab, setActiveTab] = useState<'api' | 'webhooks'>('api')
  const [selectedEndpoint, setSelectedEndpoint] = useState('shorten')

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://go.shortedbro.xyz'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg"></div>
            <h1 className="text-xl font-bold text-white">EdgeLink</h1>
          </Link>
          <nav className="flex items-center space-x-4">
            <Link href="/pricing" className="text-gray-300 hover:text-white">
              Pricing
            </Link>
            {isLoaded && isSignedIn ? (
              <Link href="/dashboard" className="btn-primary">
                Dashboard
              </Link>
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
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">
              API & Webhooks Documentation
            </h1>
            <p className="text-xl text-gray-400">
              Complete guide to integrating EdgeLink into your applications
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-4 mb-8 border-b border-gray-700">
            <button
              onClick={() => setActiveTab('api')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'api'
                  ? 'text-primary-500 border-b-2 border-primary-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              API Reference
            </button>
            <button
              onClick={() => setActiveTab('webhooks')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'webhooks'
                  ? 'text-primary-500 border-b-2 border-primary-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Webhooks
            </button>
          </div>

          {/* API Documentation */}
          {activeTab === 'api' && (
            <div className="space-y-8">
              {/* Quick Start */}
              <section className="card p-8">
                <h2 className="text-2xl font-bold text-white mb-4">Quick Start</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Base URL</h3>
                    <code className="block bg-gray-800 p-4 rounded-lg text-primary-400">
                      {API_URL}
                    </code>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Authentication</h3>
                    <p className="text-gray-400 mb-3">
                      All authenticated endpoints require a JWT token in the Authorization header:
                    </p>
                    <code className="block bg-gray-800 p-4 rounded-lg text-primary-400">
                      Authorization: Bearer YOUR_JWT_TOKEN
                    </code>
                    <p className="text-gray-400 mt-3 text-sm">
                      Get your token by logging in via <code className="text-primary-400">/api/auth/login</code>
                    </p>
                  </div>

                  <div className="bg-yellow-900/20 border border-yellow-500/50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-yellow-400 mb-2">Rate Limits</h3>
                    <ul className="space-y-2 text-gray-300">
                      <li><strong className="text-white">Free:</strong> 100 API calls per day</li>
                      <li><strong className="text-white">Pro:</strong> 5,000 API calls per day</li>
                      <li className="text-sm text-gray-400 mt-2">
                        ⚠️ API access is a Pro feature. Free users have limited access.
                      </li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* API Endpoints */}
              <section className="card p-8">
                <h2 className="text-2xl font-bold text-white mb-6">API Endpoints</h2>

                {/* Endpoint Navigation */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
                  {['shorten', 'links', 'analytics', 'domains'].map((endpoint) => (
                    <button
                      key={endpoint}
                      onClick={() => setSelectedEndpoint(endpoint)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedEndpoint === endpoint
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {endpoint.charAt(0).toUpperCase() + endpoint.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Shorten Link Endpoint */}
                {selectedEndpoint === 'shorten' && (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center space-x-3 mb-3">
                        <span className="px-3 py-1 bg-green-500 text-white text-sm font-bold rounded">POST</span>
                        <code className="text-primary-400">/api/shorten</code>
                      </div>
                      <p className="text-gray-400">Create a shortened link</p>
                    </div>

                    <div>
                      <h4 className="text-white font-semibold mb-2">Request Body</h4>
                      <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                        <code className="text-sm text-gray-300">{`{
  "url": "https://example.com/very-long-url",
  "custom_slug": "my-link",           // Optional
  "custom_domain": "go.yourdomain.com", // Pro only
  "expires_at": "2025-12-31T23:59:59Z", // Optional
  "max_clicks": 1000,                   // Optional
  "password": "secret123",              // Optional
  "device_routing": {                   // Pro only
    "mobile": "https://m.example.com",
    "desktop": "https://example.com"
  },
  "geo_routing": {                      // Pro only
    "US": "https://us.example.com",
    "UK": "https://uk.example.com"
  }
}`}</code>
                      </pre>
                    </div>

                    <div>
                      <h4 className="text-white font-semibold mb-2">Response</h4>
                      <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                        <code className="text-sm text-gray-300">{`{
  "slug": "my-link",
  "short_url": "${API_URL}/my-link",
  "expires_in": 31536000,
  "qr_code_url": "${API_URL}/qr/my-link" // Pro only
}`}</code>
                      </pre>
                    </div>

                    <div>
                      <h4 className="text-white font-semibold mb-2">Example (cURL)</h4>
                      <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                        <code className="text-sm text-gray-300">{`curl -X POST ${API_URL}/api/shorten \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -d '{
    "url": "https://example.com/very-long-url",
    "custom_slug": "my-link"
  }'`}</code>
                      </pre>
                    </div>

                    <div>
                      <h4 className="text-white font-semibold mb-2">Example (JavaScript)</h4>
                      <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                        <code className="text-sm text-gray-300">{`const response = await fetch('${API_URL}/api/shorten', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  },
  body: JSON.stringify({
    url: 'https://example.com/very-long-url',
    custom_slug: 'my-link'
  })
});

const data = await response.json();
console.log(data.short_url); // ${API_URL}/my-link`}</code>
                      </pre>
                    </div>
                  </div>
                )}

                {/* Get Links Endpoint */}
                {selectedEndpoint === 'links' && (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center space-x-3 mb-3">
                        <span className="px-3 py-1 bg-blue-500 text-white text-sm font-bold rounded">GET</span>
                        <code className="text-primary-400">/api/links</code>
                      </div>
                      <p className="text-gray-400">Get all your links</p>
                    </div>

                    <div>
                      <h4 className="text-white font-semibold mb-2">Response</h4>
                      <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                        <code className="text-sm text-gray-300">{`{
  "links": [
    {
      "slug": "my-link",
      "destination": "https://example.com",
      "created_at": "2025-01-15T10:30:00Z",
      "click_count": 42,
      "expires_at": null,
      "custom_domain": null
    }
  ],
  "total": 1
}`}</code>
                      </pre>
                    </div>

                    <div className="border-t border-gray-700 pt-6">
                      <div className="flex items-center space-x-3 mb-3">
                        <span className="px-3 py-1 bg-blue-500 text-white text-sm font-bold rounded">GET</span>
                        <code className="text-primary-400">/api/links/:slug</code>
                      </div>
                      <p className="text-gray-400">Get a specific link</p>
                    </div>

                    <div className="border-t border-gray-700 pt-6">
                      <div className="flex items-center space-x-3 mb-3">
                        <span className="px-3 py-1 bg-yellow-600 text-white text-sm font-bold rounded">PUT</span>
                        <code className="text-primary-400">/api/links/:slug</code>
                      </div>
                      <p className="text-gray-400 mb-3">Update a link</p>
                      <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                        <code className="text-sm text-gray-300">{`{
  "destination": "https://new-url.com",  // Free & Pro
  "slug": "new-slug",                    // Pro only
  "expires_at": "2025-12-31T23:59:59Z"
}`}</code>
                      </pre>
                    </div>

                    <div className="border-t border-gray-700 pt-6">
                      <div className="flex items-center space-x-3 mb-3">
                        <span className="px-3 py-1 bg-red-500 text-white text-sm font-bold rounded">DELETE</span>
                        <code className="text-primary-400">/api/links/:slug</code>
                      </div>
                      <p className="text-gray-400">Delete a link</p>
                    </div>
                  </div>
                )}

                {/* Analytics Endpoint */}
                {selectedEndpoint === 'analytics' && (
                  <div className="space-y-6">
                    <div className="bg-blue-900/20 border border-blue-500/50 p-4 rounded-lg mb-4">
                      <p className="text-blue-400">
                        <strong>Pro Feature:</strong> Advanced analytics are only available on the Pro plan.
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center space-x-3 mb-3">
                        <span className="px-3 py-1 bg-blue-500 text-white text-sm font-bold rounded">GET</span>
                        <code className="text-primary-400">/api/analytics/:slug</code>
                      </div>
                      <p className="text-gray-400">Get detailed analytics for a link</p>
                    </div>

                    <div>
                      <h4 className="text-white font-semibold mb-2">Query Parameters</h4>
                      <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                        <code className="text-sm text-gray-300">{`?start_date=2025-01-01&end_date=2025-01-31`}</code>
                      </pre>
                    </div>

                    <div>
                      <h4 className="text-white font-semibold mb-2">Response</h4>
                      <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                        <code className="text-sm text-gray-300">{`{
  "slug": "my-link",
  "total_clicks": 1523,
  "unique_visitors": 892,
  "clicks_by_date": {
    "2025-01-15": 42,
    "2025-01-16": 38
  },
  "clicks_by_country": {
    "US": 450,
    "UK": 230,
    "CA": 120
  },
  "clicks_by_device": {
    "mobile": 789,
    "desktop": 650,
    "tablet": 84
  },
  "clicks_by_browser": {
    "Chrome": 890,
    "Safari": 420,
    "Firefox": 213
  },
  "top_referrers": [
    { "source": "twitter.com", "count": 340 },
    { "source": "facebook.com", "count": 280 }
  ]
}`}</code>
                      </pre>
                    </div>
                  </div>
                )}

                {/* Domains Endpoint */}
                {selectedEndpoint === 'domains' && (
                  <div className="space-y-6">
                    <div className="bg-blue-900/20 border border-blue-500/50 p-4 rounded-lg mb-4">
                      <p className="text-blue-400">
                        <strong>Pro Feature:</strong> Custom domains are only available on the Pro plan (max 2 domains).
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center space-x-3 mb-3">
                        <span className="px-3 py-1 bg-green-500 text-white text-sm font-bold rounded">POST</span>
                        <code className="text-primary-400">/api/domains</code>
                      </div>
                      <p className="text-gray-400 mb-3">Add a custom domain</p>
                      <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                        <code className="text-sm text-gray-300">{`{
  "domain_name": "go.yourdomain.com"
}`}</code>
                      </pre>
                    </div>

                    <div>
                      <h4 className="text-white font-semibold mb-2">Response</h4>
                      <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                        <code className="text-sm text-gray-300">{`{
  "domain_id": "dom_abc123",
  "domain_name": "go.yourdomain.com",
  "verified": false,
  "verification": {
    "method": "dns_txt",
    "record": {
      "type": "TXT",
      "name": "_edgelink-verify",
      "value": "edgelink-verify-xyz789",
      "ttl": 3600
    }
  }
}`}</code>
                      </pre>
                    </div>

                    <div className="border-t border-gray-700 pt-6">
                      <div className="flex items-center space-x-3 mb-3">
                        <span className="px-3 py-1 bg-green-500 text-white text-sm font-bold rounded">POST</span>
                        <code className="text-primary-400">/api/domains/:domainId/verify</code>
                      </div>
                      <p className="text-gray-400">Verify domain ownership</p>
                    </div>

                    <div className="border-t border-gray-700 pt-6">
                      <div className="flex items-center space-x-3 mb-3">
                        <span className="px-3 py-1 bg-blue-500 text-white text-sm font-bold rounded">GET</span>
                        <code className="text-primary-400">/api/domains</code>
                      </div>
                      <p className="text-gray-400">Get all your domains</p>
                    </div>
                  </div>
                )}
              </section>

              {/* Authentication */}
              <section className="card p-8">
                <h2 className="text-2xl font-bold text-white mb-4">Authentication</h2>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="px-3 py-1 bg-green-500 text-white text-sm font-bold rounded">POST</span>
                      <code className="text-primary-400">/api/auth/login</code>
                    </div>
                    <p className="text-gray-400 mb-3">Login and get JWT token</p>
                    <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                      <code className="text-sm text-gray-300">{`{
  "email": "user@example.com",
  "password": "your-password"
}

// Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 86400,
  "user": {
    "user_id": "usr_123",
    "email": "user@example.com",
    "plan": "pro"
  }
}`}</code>
                    </pre>
                  </div>
                </div>
              </section>

              {/* Error Codes */}
              <section className="card p-8">
                <h2 className="text-2xl font-bold text-white mb-4">Error Codes</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-white">Code</th>
                        <th className="text-left py-3 px-4 text-white">Description</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-400">
                      <tr className="border-b border-gray-800">
                        <td className="py-3 px-4"><code className="text-red-400">400</code></td>
                        <td className="py-3 px-4">Bad Request - Invalid input</td>
                      </tr>
                      <tr className="border-b border-gray-800">
                        <td className="py-3 px-4"><code className="text-red-400">401</code></td>
                        <td className="py-3 px-4">Unauthorized - Invalid or missing token</td>
                      </tr>
                      <tr className="border-b border-gray-800">
                        <td className="py-3 px-4"><code className="text-red-400">403</code></td>
                        <td className="py-3 px-4">Forbidden - Feature not available on your plan</td>
                      </tr>
                      <tr className="border-b border-gray-800">
                        <td className="py-3 px-4"><code className="text-red-400">404</code></td>
                        <td className="py-3 px-4">Not Found - Resource doesn't exist</td>
                      </tr>
                      <tr className="border-b border-gray-800">
                        <td className="py-3 px-4"><code className="text-red-400">409</code></td>
                        <td className="py-3 px-4">Conflict - Slug already exists</td>
                      </tr>
                      <tr className="border-b border-gray-800">
                        <td className="py-3 px-4"><code className="text-red-400">429</code></td>
                        <td className="py-3 px-4">Rate Limit Exceeded - Too many requests</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4"><code className="text-red-400">500</code></td>
                        <td className="py-3 px-4">Server Error - Something went wrong</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {/* Webhooks Documentation */}
          {activeTab === 'webhooks' && (
            <div className="space-y-8">
              <section className="card p-8">
                <div className="bg-blue-900/20 border border-blue-500/50 p-4 rounded-lg mb-6">
                  <p className="text-blue-400">
                    <strong>Pro Feature:</strong> Webhooks are only available on the Pro plan.
                  </p>
                </div>

                <h2 className="text-2xl font-bold text-white mb-4">Webhook Overview</h2>
                <p className="text-gray-400 mb-6">
                  Webhooks allow you to receive real-time notifications when events occur in your EdgeLink account.
                  Configure your webhook URL in your account settings to start receiving events.
                </p>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Setup</h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-400">
                    <li>Go to <Link href="/settings/webhooks" className="text-primary-400 hover:underline">Settings → Webhooks</Link></li>
                    <li>Enter your webhook URL (must be HTTPS)</li>
                    <li>Select the events you want to receive</li>
                    <li>Save your configuration</li>
                  </ol>
                </div>
              </section>

              <section className="card p-8">
                <h2 className="text-2xl font-bold text-white mb-4">Event Types</h2>
                <div className="space-y-6">
                  {/* Link Created */}
                  <div>
                    <h3 className="text-lg font-semibold text-primary-400 mb-2">link.created</h3>
                    <p className="text-gray-400 mb-3">Triggered when a new link is created</p>
                    <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                      <code className="text-sm text-gray-300">{`{
  "event": "link.created",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "slug": "my-link",
    "destination": "https://example.com",
    "short_url": "${API_URL}/my-link",
    "created_at": "2025-01-15T10:30:00Z",
    "user_id": "usr_123"
  }
}`}</code>
                    </pre>
                  </div>

                  {/* Link Clicked */}
                  <div>
                    <h3 className="text-lg font-semibold text-primary-400 mb-2">link.clicked</h3>
                    <p className="text-gray-400 mb-3">Triggered when a link is clicked</p>
                    <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                      <code className="text-sm text-gray-300">{`{
  "event": "link.clicked",
  "timestamp": "2025-01-15T10:35:00Z",
  "data": {
    "slug": "my-link",
    "destination": "https://example.com",
    "visitor": {
      "ip": "192.168.1.1",
      "country": "US",
      "city": "New York",
      "device": "mobile",
      "browser": "Chrome",
      "os": "iOS",
      "referrer": "https://twitter.com"
    }
  }
}`}</code>
                    </pre>
                  </div>

                  {/* Link Updated */}
                  <div>
                    <h3 className="text-lg font-semibold text-primary-400 mb-2">link.updated</h3>
                    <p className="text-gray-400 mb-3">Triggered when a link is updated</p>
                    <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                      <code className="text-sm text-gray-300">{`{
  "event": "link.updated",
  "timestamp": "2025-01-15T11:00:00Z",
  "data": {
    "slug": "my-link",
    "old_destination": "https://example.com",
    "new_destination": "https://new-example.com",
    "updated_at": "2025-01-15T11:00:00Z"
  }
}`}</code>
                    </pre>
                  </div>

                  {/* Link Deleted */}
                  <div>
                    <h3 className="text-lg font-semibold text-primary-400 mb-2">link.deleted</h3>
                    <p className="text-gray-400 mb-3">Triggered when a link is deleted</p>
                    <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                      <code className="text-sm text-gray-300">{`{
  "event": "link.deleted",
  "timestamp": "2025-01-15T12:00:00Z",
  "data": {
    "slug": "my-link",
    "deleted_at": "2025-01-15T12:00:00Z"
  }
}`}</code>
                    </pre>
                  </div>

                  {/* Link Expired */}
                  <div>
                    <h3 className="text-lg font-semibold text-primary-400 mb-2">link.expired</h3>
                    <p className="text-gray-400 mb-3">Triggered when a link expires</p>
                    <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                      <code className="text-sm text-gray-300">{`{
  "event": "link.expired",
  "timestamp": "2025-01-31T23:59:59Z",
  "data": {
    "slug": "my-link",
    "destination": "https://example.com",
    "expires_at": "2025-01-31T23:59:59Z",
    "total_clicks": 1523
  }
}`}</code>
                    </pre>
                  </div>
                </div>
              </section>

              <section className="card p-8">
                <h2 className="text-2xl font-bold text-white mb-4">Webhook Security</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Signature Verification</h3>
                    <p className="text-gray-400 mb-3">
                      Each webhook request includes a signature in the <code className="text-primary-400">X-EdgeLink-Signature</code> header.
                      Verify this signature to ensure the request is from EdgeLink.
                    </p>
                    <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                      <code className="text-sm text-gray-300">{`const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return signature === expectedSignature;
}

// Usage in Express.js
app.post('/webhooks/edgelink', (req, res) => {
  const signature = req.headers['x-edgelink-signature'];
  const secret = process.env.WEBHOOK_SECRET;

  if (!verifyWebhook(req.body, signature, secret)) {
    return res.status(401).send('Invalid signature');
  }

  // Process webhook...
  res.status(200).send('OK');
});`}</code>
                    </pre>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Best Practices</h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-400">
                      <li>Always verify the webhook signature</li>
                      <li>Respond with 200 OK as quickly as possible</li>
                      <li>Process webhook payloads asynchronously</li>
                      <li>Use HTTPS for your webhook endpoint</li>
                      <li>Implement retry logic on your end for failed processing</li>
                    </ul>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* CTA Section */}
          <section className="card p-8 bg-gradient-to-r from-primary-600 to-primary-800 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Ready to get started?</h2>
            <p className="text-gray-200 mb-6">
              {isSignedIn
                ? "Check out your dashboard to start building with EdgeLink."
                : "Sign up now to get your API credentials and start building."}
            </p>
            {isSignedIn ? (
              <Link href="/dashboard" className="btn-secondary inline-block">
                Go to Dashboard
              </Link>
            ) : (
              <Link href="/signup" className="btn-secondary inline-block">
                Sign Up Free
              </Link>
            )}
          </section>
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
