/**
 * API Client Utilities
 */

import { triggerAuthChange } from './auth'

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
  group_id?: string | null
  created_at: string
  expires_at?: string
  timezone?: string
  click_count: number
  last_clicked_at?: string  // Track last click for inactive link detection
}

export interface LinkGroup {
  group_id: string
  user_id: string
  name: string
  description: string | null
  color: string
  icon: string
  created_at: string
  updated_at: string
  archived_at: string | null
  link_count?: number
  total_clicks?: number
}

export interface ShortenRequest {
  url: string
  custom_slug?: string
  custom_domain?: string
  expires_at?: string
  timezone?: string
  password?: string
}

/**
 * Get stored access token
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('accessToken')
}

/**
 * Get stored refresh token
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('refreshToken')
}

/**
 * Store auth tokens
 */
export function storeTokens(accessToken: string, refreshToken: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem('accessToken', accessToken)
  localStorage.setItem('refreshToken', refreshToken)
  triggerAuthChange()
}

/**
 * Clear auth tokens
 */
export function clearTokens() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
  triggerAuthChange()
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
  triggerAuthChange()
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
    const error: any = new Error(data.error || 'Request failed')
    // Attach additional error data for better error handling
    error.code = data.code
    error.data = data
    error.status = response.status
    throw error
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
export async function updateLink(slug: string, destination: string, newSlug?: string) {
  return apiRequest(`/api/links/${slug}`, {
    method: 'PUT',
    body: JSON.stringify({
      destination,
      new_slug: newSlug
    }),
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

/**
 * Week 5-6: Smart Routing API Functions
 */

export interface DeviceRouting {
  mobile?: string
  tablet?: string
  desktop?: string
}

export interface GeoRouting {
  [countryCode: string]: string
}

export interface ReferrerRouting {
  [domain: string]: string
}

export interface TimeRoutingRule {
  start_hour: number
  end_hour: number
  days?: string[]
  timezone?: string
  destination: string
}

export interface RoutingConfig {
  slug: string
  destination: string
  routing: {
    device: DeviceRouting | null
    geo: GeoRouting | null
    time: TimeRoutingRule[] | null
    referrer: Record<string, string> | null
  }
}

/**
 * Set device-based routing for a link (Pro feature)
 */
export async function setDeviceRouting(
  slug: string,
  routing: DeviceRouting
): Promise<{ message: string; slug: string; device_routing: DeviceRouting }> {
  return apiRequest(`/api/links/${slug}/routing/device`, {
    method: 'POST',
    body: JSON.stringify(routing),
  })
}

/**
 * Set geographic routing for a link (Pro feature)
 */
export async function setGeoRouting(
  slug: string,
  routes: GeoRouting
): Promise<{ message: string; slug: string; geo_routing: GeoRouting }> {
  return apiRequest(`/api/links/${slug}/routing/geo`, {
    method: 'POST',
    body: JSON.stringify({ routes }),
  })
}

/**
 * Set time-based routing for a link (Pro feature)
 */
export async function setTimeRouting(
  slug: string,
  rules: TimeRoutingRule[]
): Promise<{ message: string; slug: string; time_routing: TimeRoutingRule[] }> {
  return apiRequest(`/api/links/${slug}/routing/time`, {
    method: 'POST',
    body: JSON.stringify({ rules }),
  })
}

/**
 * Set referrer-based routing for a link (Pro feature)
 */
export async function setReferrerRouting(
  slug: string,
  routes: ReferrerRouting
): Promise<{ message: string; slug: string; referrer_routing: ReferrerRouting }> {
  return apiRequest(`/api/links/${slug}/routing/referrer`, {
    method: 'POST',
    body: JSON.stringify({ routes }),
  })
}

/**
 * Get routing configuration for a link
 */
export async function getRouting(slug: string): Promise<RoutingConfig> {
  return apiRequest(`/api/links/${slug}/routing`)
}

/**
 * Delete all routing rules for a link
 */
export async function deleteRouting(slug: string): Promise<{ message: string; slug: string }> {
  return apiRequest(`/api/links/${slug}/routing`, {
    method: 'DELETE',
  })
}

/**
 * Email Verification API Functions
 */

/**
 * Verify email address with token
 */
export async function verifyEmail(token: string): Promise<{ message: string }> {
  return apiRequest('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

/**
 * Resend verification email
 */
export async function resendVerification(email: string): Promise<{ message: string }> {
  return apiRequest('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  return apiRequest('/auth/request-reset', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  return apiRequest('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  })
}

/**
 * Create checkout session for Pro upgrade
 */
export async function createCheckoutSession(plan: 'pro' = 'pro'): Promise<{ checkout_url: string; session_id: string }> {
  return apiRequest('/api/payments/create-checkout', {
    method: 'POST',
    body: JSON.stringify({ plan }),
  })
}

/**
 * Get subscription status
 */
export async function getSubscriptionStatus(): Promise<{
  status: string;
  plan: string;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
}> {
  return apiRequest('/api/payments/subscription-status', {
    method: 'GET',
  })
}

/**
 * Create customer portal session
 */
export async function createCustomerPortal(returnUrl: string): Promise<{ url: string }> {
  return apiRequest('/api/payments/customer-portal', {
    method: 'POST',
    body: JSON.stringify({ return_url: returnUrl }),
  })
}

/**
 * Get payment history
 */
export async function getPaymentHistory(): Promise<{
  payments: Array<{
    payment_id: string;
    amount: number;
    currency: string;
    status: string;
    plan: string;
    created_at: string;
    invoice_url?: string;
    receipt_url?: string;
  }>;
  total: number;
}> {
  return apiRequest('/api/payments/history', {
    method: 'GET',
  })
}

/**
 * Usage API - Get user's current usage and plan limits
 */
export interface UsageData {
  plan: string;
  limits: {
    maxLinks: number;
    maxClicksPerMonth: number;
    maxCustomDomains: number;
    maxGroups: number;
    maxApiCallsPerDay: number;
  };
  usage: {
    links: number;
    monthlyClicks: number;
    customDomains: number;
    groups: number;
    apiKeys: number;
    apiCallsToday: number;
  };
  features: {
    analytics: boolean;
    apiAccess: boolean;
    linkExpiration: boolean;
    passwordProtection: boolean;
    customSlug: boolean;
    editSlug: boolean;
    editDestination: boolean;
    qrCode: boolean;
    geoRouting: boolean;
    deviceRouting: boolean;
    referrerRouting: boolean;
    webhooks: boolean;
    bulkOperations: boolean;
    groups: boolean;
  };
  resetDate: string;
  subscription?: {
    status: string;
    periodStart: string;
    periodEnd: string;
    cancelAtPeriodEnd: boolean;
  };
}

export async function getUsage(): Promise<UsageData> {
  return apiRequest('/api/usage', {
    method: 'GET',
  })
}

/**
 * Link Groups API Functions (Pro feature)
 */

/**
 * Get all user's groups
 */
export async function getGroups(): Promise<{
  groups: LinkGroup[];
  ungrouped_count: number;
  ungrouped_clicks: number;
  max_groups: number;
}> {
  return apiRequest('/api/groups')
}

/**
 * Create a new group
 */
export async function createGroup(data: {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}): Promise<{ message: string; group: LinkGroup }> {
  return apiRequest('/api/groups', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Get a single group with its links
 */
export async function getGroup(groupId: string, params?: {
  page?: number;
  limit?: number;
}): Promise<{
  group: LinkGroup;
  links: Link[];
  total: number;
  total_clicks: number;
  page: number;
  limit: number;
  total_pages: number;
}> {
  let endpoint = `/api/groups/${groupId}`;

  if (params) {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());

    const queryString = queryParams.toString();
    if (queryString) {
      endpoint += `?${queryString}`;
    }
  }

  return apiRequest(endpoint)
}

/**
 * Update a group
 */
export async function updateGroup(groupId: string, data: {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
}): Promise<{ message: string; group: LinkGroup }> {
  return apiRequest(`/api/groups/${groupId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

/**
 * Delete a group (moves links to ungrouped)
 */
export async function deleteGroup(groupId: string): Promise<{
  message: string;
  links_moved: number;
}> {
  return apiRequest(`/api/groups/${groupId}`, {
    method: 'DELETE',
  })
}

/**
 * Add links to a group
 */
export async function addLinksToGroup(groupId: string, slugs: string[]): Promise<{
  message: string;
  added: number;
}> {
  return apiRequest(`/api/groups/${groupId}/links`, {
    method: 'POST',
    body: JSON.stringify({ slugs }),
  })
}

/**
 * Remove links from a group
 */
export async function removeLinksFromGroup(groupId: string, slugs: string[]): Promise<{
  message: string;
  removed: number;
}> {
  return apiRequest(`/api/groups/${groupId}/links`, {
    method: 'DELETE',
    body: JSON.stringify({ slugs }),
  })
}

/**
 * Move a single link to a group (or ungrouped if group_id is null)
 */
export async function moveLink(slug: string, groupId: string | null): Promise<{
  message: string;
  slug: string;
  group_id: string | null;
}> {
  return apiRequest(`/api/links/${slug}/group`, {
    method: 'PUT',
    body: JSON.stringify({ group_id: groupId }),
  })
}

/**
 * Bulk move links to a group
 */
export async function bulkMoveLinks(slugs: string[], groupId: string | null): Promise<{
  message: string;
  moved: number;
}> {
  return apiRequest('/api/links/bulk-group', {
    method: 'POST',
    body: JSON.stringify({ slugs, group_id: groupId }),
  })
}

/**
 * Get analytics for a group
 */
export async function getGroupAnalytics(groupId: string, range: '7d' | '30d' = '7d'): Promise<{
  group: LinkGroup;
  total_clicks: number;
  time_series: Array<{ date: string; clicks: number }>;
  countries: Array<{ country: string; clicks: number }>;
  devices: Array<{ device: string; clicks: number }>;
  browsers: Array<{ browser: string; clicks: number }>;
  referrers: Array<{ referrer: string; clicks: number }>;
  top_links: Array<{ slug: string; clicks: number }>;
  time_range: string;
}> {
  return apiRequest(`/api/groups/${groupId}/analytics?range=${range}`)
}

/**
 * Get overall analytics for all user's links
 */
export async function getOverallAnalytics(range: '7d' | '30d' = '7d'): Promise<{
  total_clicks: number;
  total_links: number;
  time_series: Array<{ date: string; clicks: number }>;
  countries: Array<{ country: string; clicks: number }>;
  devices: Array<{ device: string; clicks: number }>;
  browsers: Array<{ browser: string; clicks: number }>;
  referrers: Array<{ referrer: string; clicks: number }>;
  top_links: Array<{ slug: string; clicks: number }>;
  groups_breakdown: Array<{
    group_name: string;
    group_id: string | null;
    color: string | null;
    clicks: number;
  }>;
  time_range: string;
}> {
  return apiRequest(`/api/analytics/overview?range=${range}`)
}

/**
 * Compare analytics between groups
 */
export async function compareGroups(groupIds: string[], range: '7d' | '30d' = '7d'): Promise<{
  comparisons: Array<{
    group: LinkGroup;
    total_clicks: number;
    link_count: number;
  }>;
  time_range: string;
}> {
  return apiRequest(`/api/analytics/groups/compare?groups=${groupIds.join(',')}&range=${range}`)
}
