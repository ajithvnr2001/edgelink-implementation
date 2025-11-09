'use client';

/**
 * Enhanced Link Creation Page (Week 5)
 * With AI slug suggestions, link preview, and UTM builder
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL, getAuthHeaders } from '@/lib/api';

interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  siteName?: string;
}

interface UTMParams {
  source: string;
  medium: string;
  campaign: string;
  term?: string;
  content?: string;
}

export default function CreateLinkPage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [slugSuggestions, setSlugSuggestions] = useState<string[]>([]);
  const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null);
  const [showUTMBuilder, setShowUTMBuilder] = useState(false);
  const [utmParams, setUTMParams] = useState<UTMParams>({
    source: '',
    medium: '',
    campaign: ''
  });
  const [expiresAt, setExpiresAt] = useState('');
  const [maxClicks, setMaxClicks] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [shortUrl, setShortUrl] = useState('');

  // Fetch slug suggestions when URL changes
  useEffect(() => {
    if (url && isValidUrl(url)) {
      fetchSlugSuggestions(url);
      fetchLinkPreview(url);
    } else {
      setSlugSuggestions([]);
      setLinkPreview(null);
    }
  }, [url]);

  const isValidUrl = (urlString: string) => {
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  };

  const fetchSlugSuggestions = async (targetUrl: string) => {
    try {
      const response = await fetch(`${API_URL}/api/suggest-slug`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: targetUrl })
      });

      if (response.ok) {
        const data = await response.json();
        setSlugSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Failed to fetch slug suggestions:', error);
    }
  };

  const fetchLinkPreview = async (targetUrl: string) => {
    setPreviewLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: targetUrl })
      });

      if (response.ok) {
        const data = await response.json();
        setLinkPreview(data);
      }
    } catch (error) {
      console.error('Failed to fetch link preview:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  const buildUTMUrl = () => {
    if (!url || !utmParams.source || !utmParams.medium || !utmParams.campaign) {
      return url;
    }

    const urlObj = new URL(url);
    urlObj.searchParams.set('utm_source', utmParams.source);
    urlObj.searchParams.set('utm_medium', utmParams.medium);
    urlObj.searchParams.set('utm_campaign', utmParams.campaign);

    if (utmParams.term) {
      urlObj.searchParams.set('utm_term', utmParams.term);
    }
    if (utmParams.content) {
      urlObj.searchParams.set('utm_content', utmParams.content);
    }

    return urlObj.toString();
  };

  const handleCreate = async () => {
    setLoading(true);
    setError('');

    try {
      const finalUrl = showUTMBuilder ? buildUTMUrl() : url;

      const body: any = {
        url: finalUrl,
        custom_slug: customSlug || undefined,
        expires_at: expiresAt || undefined,
        max_clicks: maxClicks ? parseInt(maxClicks) : undefined,
        password: password || undefined
      };

      const response = await fetch(`${API_URL}/api/shorten`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create link');
      }

      setShortUrl(data.short_url);
      setSuccess(true);

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 rounded-lg p-8 text-center">
          <div className="mb-6">
            <svg className="w-16 h-16 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Link Created Successfully!</h2>
          <div className="bg-gray-700 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-400 mb-2">Your short link:</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={shortUrl}
                readOnly
                className="flex-1 bg-gray-800 text-white px-3 py-2 rounded border border-gray-600"
              />
              <button
                onClick={() => copyToClipboard(shortUrl)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Copy
              </button>
            </div>
          </div>
          <p className="text-gray-400 text-sm">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-gray-400 hover:text-white mb-4"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold mb-2">Create New Link</h1>
          <p className="text-gray-400">Shorten your URL with advanced features</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Destination URL */}
            <div className="bg-gray-800 rounded-lg p-6">
              <label className="block text-sm font-medium mb-2">
                Destination URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/your/long/url"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Slug Suggestions */}
            {slugSuggestions.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6">
                <label className="block text-sm font-medium mb-3">
                  ✨ AI Slug Suggestions
                </label>
                <div className="flex flex-wrap gap-2">
                  {slugSuggestions.map((slug, index) => (
                    <button
                      key={index}
                      onClick={() => setCustomSlug(slug)}
                      className={`px-4 py-2 rounded-lg border ${
                        customSlug === slug
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {slug}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Slug */}
            <div className="bg-gray-800 rounded-lg p-6">
              <label className="block text-sm font-medium mb-2">
                Custom Slug (Optional)
              </label>
              <input
                type="text"
                value={customSlug}
                onChange={(e) => setCustomSlug(e.target.value)}
                placeholder="my-custom-link"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-400 mt-2">
                5-20 characters, alphanumeric and dashes only
              </p>
            </div>

            {/* UTM Builder */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium">UTM Parameters</label>
                <button
                  onClick={() => setShowUTMBuilder(!showUTMBuilder)}
                  className="text-blue-500 hover:text-blue-400 text-sm"
                >
                  {showUTMBuilder ? 'Hide' : 'Show'} Builder
                </button>
              </div>

              {showUTMBuilder && (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Source (e.g., newsletter)"
                    value={utmParams.source}
                    onChange={(e) => setUTMParams({ ...utmParams, source: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Medium (e.g., email)"
                    value={utmParams.medium}
                    onChange={(e) => setUTMParams({ ...utmParams, medium: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Campaign (e.g., summer_sale)"
                    value={utmParams.campaign}
                    onChange={(e) => setUTMParams({ ...utmParams, campaign: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Term (optional)"
                    value={utmParams.term}
                    onChange={(e) => setUTMParams({ ...utmParams, term: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Content (optional)"
                    value={utmParams.content}
                    onChange={(e) => setUTMParams({ ...utmParams, content: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Advanced Options */}
            <div className="bg-gray-800 rounded-lg p-6">
              <label className="block text-sm font-medium mb-4">Advanced Options (Pro)</label>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Expires At</label>
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Max Clicks</label>
                  <input
                    type="number"
                    value={maxClicks}
                    onChange={(e) => setMaxClicks(e.target.value)}
                    placeholder="Unlimited"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Password Protection</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-red-300">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleCreate}
              disabled={!url || loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold transition"
            >
              {loading ? 'Creating...' : 'Create Short Link'}
            </button>
          </div>

          {/* Preview Sidebar */}
          <div className="lg:col-span-1">
            {linkPreview && (
              <div className="bg-gray-800 rounded-lg p-6 sticky top-4">
                <h3 className="text-sm font-medium mb-4">Link Preview</h3>

                {previewLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="text-sm text-gray-400 mt-2">Loading preview...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {linkPreview.image && (
                      <img
                        src={linkPreview.image}
                        alt="Preview"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    )}

                    <div className="flex items-start gap-2">
                      {linkPreview.favicon && (
                        <img
                          src={linkPreview.favicon}
                          alt="Favicon"
                          className="w-4 h-4 mt-1"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-400 truncate">{linkPreview.siteName}</p>
                        <h4 className="font-medium text-white line-clamp-2">{linkPreview.title}</h4>
                      </div>
                    </div>

                    {linkPreview.description && (
                      <p className="text-sm text-gray-400 line-clamp-3">{linkPreview.description}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
