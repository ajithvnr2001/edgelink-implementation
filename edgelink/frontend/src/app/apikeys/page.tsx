'use client';

/**
 * EdgeLink Frontend - API Keys Management Page
 * Week 3 Implementation
 * Based on PRD v4.1 Week 3: API Key Management
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAPIKeys, generateAPIKey, revokeAPIKey } from '@/lib/api';

interface APIKey {
  key_id: string;
  key_prefix: string;
  name: string;
  last_used_at?: string;
  created_at: string;
  expires_at?: string;
}

export default function APIKeysPage() {
  const router = useRouter();
  const [apiKeys, setAPIKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<any>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadAPIKeys();
  }, []);

  const loadAPIKeys = async () => {
    try {
      const data = await getAPIKeys() as any;
      setAPIKeys(data.keys || []);
    } catch (err) {
      console.error('Failed to load API keys:', err);
      if ((err as any).message?.includes('401')) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const result = await generateAPIKey(keyName || 'API Key');
      setGeneratedKey(result);
      setKeyName('');
      loadAPIKeys();
    } catch (err: any) {
      setError(err.message || 'Failed to generate API key');
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      await revokeAPIKey(keyId);
      setSuccess('API key revoked successfully!');
      loadAPIKeys();
    } catch (err: any) {
      setError(err.message || 'Failed to revoke API key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">API Keys</h1>
            <p className="text-gray-400">Manage your API keys for programmatic access</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              + Generate API Key
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-900/50 border border-green-700 rounded-lg text-green-200">
            {success}
          </div>
        )}

        {/* Generated Key Display */}
        {generatedKey && (
          <div className="mb-6 p-6 bg-yellow-900/20 border-2 border-yellow-600 rounded-lg">
            <div className="flex items-start gap-3 mb-4">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-yellow-200 mb-2">Save Your API Key Now!</h3>
                <p className="text-yellow-200/80 text-sm mb-4">
                  This is the only time you'll see this key. Store it securely - you won't be able to view it again.
                </p>
              </div>
            </div>

            <div className="bg-gray-900 p-4 rounded-lg mb-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <code className="text-green-400 font-mono text-sm break-all">{generatedKey.api_key}</code>
                <button
                  onClick={() => copyToClipboard(generatedKey.api_key)}
                  className="ml-4 px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors text-sm flex-shrink-0"
                >
                  📋 Copy
                </button>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-300">
              <p><strong>Usage Example:</strong></p>
              <code className="block bg-gray-900 p-3 rounded border border-gray-700 overflow-x-auto">
                curl -H "Authorization: Bearer {generatedKey.api_key}" https://go.shortedbro.xyz/api/shorten
              </code>
            </div>

            <button
              onClick={() => setGeneratedKey(null)}
              className="mt-4 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
            >
              I've saved it
            </button>
          </div>
        )}

        {/* API Keys List */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          {apiKeys.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">🔑</div>
              <h3 className="text-xl font-semibold text-white mb-2">No API keys yet</h3>
              <p className="text-gray-400 mb-6">Generate your first API key to get started with the API</p>
              <button
                onClick={() => setShowGenerateModal(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Generate API Key
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {apiKeys.map((key) => (
                <div key={key.key_id} className="p-6 hover:bg-gray-750 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{key.name}</h3>
                        <code className="px-3 py-1 bg-gray-900 text-gray-300 text-xs font-mono rounded border border-gray-700">
                          {key.key_prefix}...
                        </code>
                      </div>
                      <div className="space-y-1 text-sm text-gray-400">
                        <p>Created: {new Date(key.created_at).toLocaleDateString()}</p>
                        {key.last_used_at && (
                          <p>Last used: {new Date(key.last_used_at).toLocaleDateString()}</p>
                        )}
                        {key.expires_at && (
                          <p>Expires: {new Date(key.expires_at).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRevokeKey(key.key_id)}
                      className="px-4 py-2 bg-red-600/20 text-red-300 border border-red-700 rounded hover:bg-red-600/30 transition-colors text-sm font-medium"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* API Keys Info */}
        <div className="mt-6 p-4 bg-gray-800 border border-gray-700 rounded-lg">
          <p className="text-sm text-gray-400 mb-2">
            <strong className="text-white">API Key Limits:</strong> Maximum 5 API keys per user
            {apiKeys.length > 0 && ` (${apiKeys.length}/5 used)`}
          </p>
          <p className="text-sm text-gray-400">
            <strong className="text-white">Rate Limits:</strong> Free: 1,000 requests/day | Pro: 10,000 requests/day
          </p>
        </div>

        {/* API Documentation Link - Featured Banner */}
        <div className="mt-6 p-6 bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-2 border-blue-500 rounded-lg">
          <div className="flex items-start gap-4">
            <div className="text-4xl">📚</div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-2">Complete API Documentation</h3>
              <p className="text-gray-300 mb-4">
                Explore our interactive API documentation with 60+ endpoints, code examples in multiple languages,
                and a built-in testing environment. Try endpoints directly from your browser!
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="/api-docs.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg hover:shadow-xl"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Interactive API Explorer
                </a>
                <a
                  href="https://raw.githubusercontent.com/ajithvnr2001/edgelink-implementation/main/openapi.yaml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download OpenAPI Spec
                </a>
                <a
                  href="https://github.com/ajithvnr2001/edgelink-implementation/blob/main/examples/python_api_client.py"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  Python SDK Example
                </a>
              </div>

              <div className="mt-4 pt-4 border-t border-blue-400/30">
                <p className="text-sm text-gray-300 mb-2">
                  <strong className="text-white">✨ Features:</strong>
                </p>
                <ul className="text-sm text-gray-300 space-y-1 ml-4">
                  <li>• 60+ documented endpoints with request/response examples</li>
                  <li>• Try endpoints directly in your browser</li>
                  <li>• Code examples in cURL, Python, JavaScript, and more</li>
                  <li>• Smart routing (Device, Geographic, Referrer-based)</li>
                  <li>• Analytics, webhooks, and advanced features</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Webhook Documentation Link - Featured Banner */}
        <div className="mt-6 p-6 bg-gradient-to-r from-orange-900/50 to-amber-900/50 border-2 border-orange-500 rounded-lg">
          <div className="flex items-start gap-4">
            <div className="text-4xl">🔔</div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-bold text-white">Webhook Integration Guide</h3>
                <span className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold rounded-full uppercase tracking-wide">
                  Pro Only
                </span>
              </div>
              <p className="text-gray-300 mb-4">
                Receive real-time HTTP callbacks when links are clicked, created, updated, or deleted.
                Build event-driven applications with automatic notifications to your server.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="https://github.com/ajithvnr2001/edgelink-implementation/blob/main/WEBHOOK_DOCUMENTATION.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium shadow-lg hover:shadow-xl"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  Complete Webhook Guide
                </a>
                <a
                  href="/api-docs.html#/Webhooks"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  API Reference
                </a>
              </div>

              <div className="mt-4 pt-4 border-t border-orange-400/30">
                <p className="text-sm text-gray-300 mb-2">
                  <strong className="text-white">🎯 Key Features:</strong>
                </p>
                <ul className="text-sm text-gray-300 space-y-1 ml-4">
                  <li>• Real-time event notifications (link clicks, CRUD operations)</li>
                  <li>• HMAC-SHA256 signature verification for security</li>
                  <li>• Automatic retry logic with exponential backoff</li>
                  <li>• Code examples in Node.js, Python, PHP, Go, Ruby, Rust</li>
                  <li>• Testing guides with ngrok and local development</li>
                  <li>• Production best practices and troubleshooting</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Quick API Examples */}
        <div className="mt-6 p-6 bg-gray-800 border border-gray-700 rounded-lg">
          <h3 className="text-lg font-bold text-white mb-4">Quick Start Examples</h3>
          <div className="space-y-4 text-sm text-gray-300">
            <div>
              <p className="font-semibold text-white mb-2">Create Short Link:</p>
              <code className="block bg-gray-900 p-3 rounded border border-gray-700 overflow-x-auto">
                POST https://go.shortedbro.xyz/api/shorten
                <br />
                Headers: Authorization: Bearer YOUR_API_KEY
                <br />
                Body: {'{'}url: "https://example.com", custom_slug: "optional"{'}'}
              </code>
            </div>
            <div>
              <p className="font-semibold text-white mb-2">Get Your Links:</p>
              <code className="block bg-gray-900 p-3 rounded border border-gray-700 overflow-x-auto">
                GET https://go.shortedbro.xyz/api/links
                <br />
                Headers: Authorization: Bearer YOUR_API_KEY
              </code>
            </div>
            <div>
              <p className="font-semibold text-white mb-2">Get Link Analytics:</p>
              <code className="block bg-gray-900 p-3 rounded border border-gray-700 overflow-x-auto">
                GET https://go.shortedbro.xyz/api/analytics/{'{'} slug{'}'}?range=7d
                <br />
                Headers: Authorization: Bearer YOUR_API_KEY
              </code>
            </div>
            <div>
              <p className="font-semibold text-white mb-2">Configure Device Routing (Pro):</p>
              <code className="block bg-gray-900 p-3 rounded border border-gray-700 overflow-x-auto">
                POST https://go.shortedbro.xyz/api/links/{'{'} slug{'}'}/routing/device
                <br />
                Headers: Authorization: Bearer YOUR_API_KEY
                <br />
                Body: {'{'}mobile: "https://m.example.com", desktop: "https://example.com"{'}'}
              </code>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-700">
            <a
              href="/api-docs.html"
              target="_blank"
              className="text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1"
            >
              View all 60+ endpoints in interactive documentation
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Generate API Key Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Generate API Key</h3>

            <form onSubmit={handleGenerateKey}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Key Name (Optional)
                </label>
                <input
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="My API Key"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <p className="mt-2 text-xs text-gray-400">
                  Give your API key a descriptive name to help you remember its purpose
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowGenerateModal(false);
                    setKeyName('');
                    setError('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Generate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
