/**
 * EdgeLink API Client for Browser Extension
 * Handles all communication with the EdgeLink backend
 */

const API_BASE_URL = 'https://edgelink.io'; // Change to your production URL
const API_LOCAL_URL = 'http://localhost:8787'; // For development

class EdgeLinkAPI {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = null;
  }

  /**
   * Initialize API with stored token
   */
  async init() {
    const result = await chrome.storage.local.get(['authToken', 'apiBaseUrl']);
    this.token = result.authToken || null;
    this.baseURL = result.apiBaseUrl || API_BASE_URL;
  }

  /**
   * Set API base URL
   */
  setBaseURL(url) {
    this.baseURL = url;
    chrome.storage.local.set({ apiBaseUrl: url });
  }

  /**
   * Set authentication token
   */
  async setToken(token) {
    this.token = token;
    await chrome.storage.local.set({ authToken: token });
  }

  /**
   * Clear authentication token
   */
  async clearToken() {
    this.token = null;
    await chrome.storage.local.remove('authToken');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.token;
  }

  /**
   * Make API request
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  /**
   * Shorten a URL (anonymous or authenticated)
   */
  async shortenURL(url, options = {}) {
    return await this.request('/api/shorten', {
      method: 'POST',
      body: JSON.stringify({
        url,
        custom_slug: options.customSlug,
        expires_at: options.expiresAt,
        utm_template: options.utmTemplate,
        password: options.password,
        max_clicks: options.maxClicks,
      }),
    });
  }

  /**
   * Get user's links
   */
  async getLinks(page = 1, limit = 50) {
    return await this.request(`/api/links?page=${page}&limit=${limit}`);
  }

  /**
   * Get link details
   */
  async getLink(slug) {
    return await this.request(`/api/links/${slug}`);
  }

  /**
   * Update a link
   */
  async updateLink(slug, updates) {
    return await this.request(`/api/links/${slug}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete a link
   */
  async deleteLink(slug) {
    return await this.request(`/api/links/${slug}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get link analytics
   */
  async getAnalytics(slug, range = '7d') {
    return await this.request(`/api/stats/${slug}?range=${range}`);
  }

  /**
   * User login
   */
  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (data.access_token) {
      await this.setToken(data.access_token);
    }

    return data;
  }

  /**
   * User signup
   */
  async signup(email, password, name) {
    const data = await this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });

    if (data.access_token) {
      await this.setToken(data.access_token);
    }

    return data;
  }

  /**
   * User logout
   */
  async logout() {
    await this.clearToken();
  }

  /**
   * Get user profile
   */
  async getProfile() {
    return await this.request('/api/user/profile');
  }

  /**
   * Suggest slug from URL
   */
  async suggestSlug(url) {
    return await this.request('/api/suggest-slug', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  /**
   * Get link preview metadata
   */
  async getLinkPreview(url) {
    return await this.request('/api/preview', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  /**
   * Get usage statistics
   */
  async getUsage() {
    return await this.request('/api/user/usage');
  }
}

// Create singleton instance
const api = new EdgeLinkAPI();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
