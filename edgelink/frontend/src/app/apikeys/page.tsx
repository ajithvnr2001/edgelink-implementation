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
                curl -H "Authorization: Bearer {generatedKey.api_key}" https://edgelink-production.quoteviral.workers.dev/api/shorten
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

        {/* API Documentation */}
        <div className="mt-6 p-6 bg-gray-800 border border-gray-700 rounded-lg">
          <h3 className="text-lg font-bold text-white mb-4">API Documentation</h3>
          <div className="space-y-4 text-sm text-gray-300">
            <div>
              <p className="font-semibold text-white mb-2">Create Short Link:</p>
              <code className="block bg-gray-900 p-3 rounded border border-gray-700 overflow-x-auto">
                POST https://edgelink-production.quoteviral.workers.dev/api/shorten
                <br />
                Headers: Authorization: Bearer YOUR_API_KEY
                <br />
                Body: {'{'}url: "https://example.com", custom_slug: "optional"{'}'}
              </code>
            </div>
            <div>
              <p className="font-semibold text-white mb-2">Get Your Links:</p>
              <code className="block bg-gray-900 p-3 rounded border border-gray-700 overflow-x-auto">
                GET https://edgelink-production.quoteviral.workers.dev/api/links
                <br />
                Headers: Authorization: Bearer YOUR_API_KEY
              </code>
            </div>
            <div>
              <p className="font-semibold text-white mb-2">Get Link Analytics:</p>
              <code className="block bg-gray-900 p-3 rounded border border-gray-700 overflow-x-auto">
                GET https://edgelink-production.quoteviral.workers.dev/api/analytics/{'{'} slug{'}'}?range=7d
                <br />
                Headers: Authorization: Bearer YOUR_API_KEY
              </code>
            </div>
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
