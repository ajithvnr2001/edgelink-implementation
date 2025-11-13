/**
 * API Client Utilities with Clerk Authentication
 * This replaces the old token-based auth system with Clerk
 */

import { auth } from '@clerk/nextjs/server'

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'

export interface Link {
  slug: string
  destination: string
  custom_domain?: string
  created_at: string
  expires_at?: string
  click_count: number
}

export interface ShortenRequest {
  url: string
  custom_slug?: string
  custom_domain?: string
  expires_at?: string
  password?: string
}

/**
 * Get Clerk session token for API authentication
 * This should be called from client components using useAuth() hook
 */
export async function getClerkToken(): Promise<string | null> {
  if (typeof window !== 'undefined') {
    // Client-side: This will be handled by React hooks
    return null
  }

  // Server-side
  const { getToken } = await auth()
  return getToken()
}

/**
 * Get authorization headers for API requests (server-side)
 */
export async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getClerkToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  }
}

/**
 * Client-side API request wrapper
 * Pass the token from useAuth() hook in client components
 */
export async function apiRequest<T>(
  endpoint: string,
  token: string | null,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Request failed')
  }

  return data as T
}

/**
 * Server-side API request wrapper
 */
export async function serverApiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = await getAuthHeaders()

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Request failed')
  }

  return data as T
}

/**
 * Shorten URL
 */
export async function shortenUrl(request: ShortenRequest, token: string | null) {
  return apiRequest<{ slug: string; short_url: string; expires_in?: number }>(
    '/api/shorten',
    token,
    {
      method: 'POST',
      body: JSON.stringify(request),
    }
  )
}

/**
 * Get user's links with optional pagination and search
 */
export async function getLinks(
  token: string | null,
  params?: {
    page?: number
    limit?: number
    search?: string
    searchField?: string
  }
): Promise<{
  links: Link[]
  total: number
  page?: number
  limit?: number
  totalPages?: number
}> {
  let endpoint = '/api/links'

  if (params) {
    const queryParams = new URLSearchParams()
    if (params.page) queryParams.set('page', params.page.toString())
    if (params.limit) queryParams.set('limit', params.limit.toString())
    if (params.search) queryParams.set('search', params.search)
    if (params.searchField) queryParams.set('searchField', params.searchField)

    const queryString = queryParams.toString()
    if (queryString) {
      endpoint += `?${queryString}`
    }
  }

  return apiRequest<{
    links: Link[]
    total: number
    page?: number
    limit?: number
    totalPages?: number
  }>(endpoint, token)
}

/**
 * Update link
 */
export async function updateLink(
  slug: string,
  destination: string,
  token: string | null,
  newSlug?: string
) {
  return apiRequest(`/api/links/${slug}`, token, {
    method: 'PUT',
    body: JSON.stringify({
      destination,
      new_slug: newSlug,
    }),
  })
}

/**
 * Delete link
 */
export async function deleteLink(slug: string, token: string | null) {
  return apiRequest(`/api/links/${slug}`, token, {
    method: 'DELETE',
  })
}

/**
 * Get detailed analytics for a link
 */
export async function getLinkAnalytics(
  slug: string,
  token: string | null,
  range: '7d' | '30d' = '7d'
) {
  return apiRequest(`/api/analytics/${slug}?range=${range}`, token)
}

/**
 * Get analytics summary for user
 */
export async function getAnalyticsSummary(token: string | null) {
  return apiRequest('/api/analytics/summary', token)
}

/**
 * Get user's custom domains
 */
export async function getDomains(token: string | null) {
  return apiRequest('/api/domains', token)
}

/**
 * Add a new custom domain
 */
export async function addDomain(domainName: string, token: string | null) {
  return apiRequest('/api/domains', token, {
    method: 'POST',
    body: JSON.stringify({ domain_name: domainName }),
  })
}

/**
 * Verify domain ownership
 */
export async function verifyDomain(domainId: string, token: string | null) {
  return apiRequest(`/api/domains/${domainId}/verify`, token, {
    method: 'POST',
  })
}

/**
 * Delete a custom domain
 */
export async function deleteDomain(domainId: string, token: string | null) {
  return apiRequest(`/api/domains/${domainId}`, token, {
    method: 'DELETE',
  })
}

/**
 * Get user's API keys
 */
export async function getAPIKeys(token: string | null) {
  return apiRequest('/api/keys', token)
}

/**
 * Generate a new API key
 */
export async function generateAPIKey(name: string = 'API Key', token: string | null) {
  return apiRequest('/api/keys', token, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

/**
 * Revoke an API key
 */
export async function revokeAPIKey(keyId: string, token: string | null) {
  return apiRequest(`/api/keys/${keyId}`, token, {
    method: 'DELETE',
  })
}
