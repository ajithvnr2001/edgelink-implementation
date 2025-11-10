/**
 * API Client Utilities
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'

export interface AuthResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  user: {
    user_id: string
    email: string
    plan: 'free' | 'pro'
  }
}

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
 * Get stored access token
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')
}

/**
 * Get stored refresh token
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('refresh_token')
}

/**
 * Store auth tokens
 */
export function storeTokens(accessToken: string, refreshToken: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem('access_token', accessToken)
  localStorage.setItem('refresh_token', refreshToken)
}

/**
 * Clear auth tokens
 */
export function clearTokens() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
}

/**
 * Get authorization headers for API requests
 */
export function getAuthHeaders(): HeadersInit {
  const accessToken = getAccessToken()
  return {
    'Content-Type': 'application/json',
    ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
  }
}

/**
 * Get stored user
 */
export function getUser() {
  if (typeof window === 'undefined') return null
  const userStr = localStorage.getItem('user')
  return userStr ? JSON.parse(userStr) : null
}

/**
 * Store user
 */
export function storeUser(user: any) {
  if (typeof window === 'undefined') return
  localStorage.setItem('user', JSON.stringify(user))
}

/**
 * API request wrapper
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = getAccessToken()

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
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
 * Sign up
 */
export async function signup(
  email: string,
  password: string,
  name?: string
): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  })

  storeTokens(response.access_token, response.refresh_token)
  storeUser(response.user)

  return response
}

/**
 * Login
 */
export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

  storeTokens(response.access_token, response.refresh_token)
  storeUser(response.user)

  return response
}

/**
 * Logout
 */
export async function logout() {
  const refreshToken = getRefreshToken()

  if (refreshToken) {
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  clearTokens()
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken()

  if (!refreshToken) {
    throw new Error('No refresh token available')
  }

  const response = await apiRequest<{ access_token: string }>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

  storeTokens(response.access_token, refreshToken)
  return response.access_token
}

/**
 * Shorten URL
 */
export async function shortenUrl(request: ShortenRequest) {
  return apiRequest<{ slug: string; short_url: string; expires_in?: number }>(
    '/api/shorten',
    {
      method: 'POST',
      body: JSON.stringify(request),
    }
  )
}

/**
 * Get user's links with optional pagination and search
 */
export async function getLinks(params?: {
  page?: number;
  limit?: number;
  search?: string;
  searchField?: string;
}): Promise<{
  links: Link[];
  total: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}> {
  let endpoint = '/api/links';

  if (params) {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.search) queryParams.set('search', params.search);
    if (params.searchField) queryParams.set('searchField', params.searchField);

    const queryString = queryParams.toString();
    if (queryString) {
      endpoint += `?${queryString}`;
    }
  }

  return apiRequest<{
    links: Link[];
    total: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  }>(endpoint);
}

/**
 * Update link
 */
export async function updateLink(slug: string, destination: string) {
  return apiRequest(`/api/links/${slug}`, {
    method: 'PUT',
    body: JSON.stringify({ destination }),
  })
}

/**
 * Delete link
 */
export async function deleteLink(slug: string) {
  return apiRequest(`/api/links/${slug}`, {
    method: 'DELETE',
  })
}

/**
 * Get link stats (legacy)
 */
export async function getLinkStats(slug: string) {
  return apiRequest(`/api/stats/${slug}`)
}

/**
 * Get detailed analytics for a link
 */
export async function getLinkAnalytics(slug: string, range: '7d' | '30d' = '7d') {
  return apiRequest(`/api/analytics/${slug}?range=${range}`)
}

/**
 * Get analytics summary for user
 */
export async function getAnalyticsSummary() {
  return apiRequest('/api/analytics/summary')
}

/**
 * Week 3: Custom Domains API Functions
 */

/**
 * Get user's custom domains
 */
export async function getDomains() {
  return apiRequest('/api/domains')
}

/**
 * Add a new custom domain
 */
export async function addDomain(domainName: string) {
  return apiRequest('/api/domains', {
    method: 'POST',
    body: JSON.stringify({ domain_name: domainName }),
  })
}

/**
 * Verify domain ownership
 */
export async function verifyDomain(domainId: string) {
  return apiRequest(`/api/domains/${domainId}/verify`, {
    method: 'POST',
  })
}

/**
 * Delete a custom domain
 */
export async function deleteDomain(domainId: string) {
  return apiRequest(`/api/domains/${domainId}`, {
    method: 'DELETE',
  })
}

/**
 * Week 3: API Keys Management Functions
 */

/**
 * Get user's API keys
 */
export async function getAPIKeys() {
  return apiRequest('/api/keys')
}

/**
 * Generate a new API key
 */
export async function generateAPIKey(name: string = 'API Key') {
  return apiRequest('/api/keys', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

/**
 * Revoke an API key
 */
export async function revokeAPIKey(keyId: string) {
  return apiRequest(`/api/keys/${keyId}`, {
    method: 'DELETE',
  })
}
