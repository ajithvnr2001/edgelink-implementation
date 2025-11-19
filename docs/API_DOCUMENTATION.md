# ShortedBro API Documentation

**Base URL:** `https://go.shortedbro.xyz`
**Documentation URL:** `https://shortedbro.xyz/docs`

Complete API reference for the ShortedBro URL shortening service. This API allows you to create, manage, and track short links programmatically.

---

## Table of Contents

- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Link Management](#link-management)
- [Analytics](#analytics)
- [Smart Routing](#smart-routing)
- [A/B Testing](#ab-testing)
- [Webhooks](#webhooks)
- [Custom Domains](#custom-domains)
- [Link Groups](#link-groups)
- [API Keys](#api-keys)
- [User Management](#user-management)
- [Bulk Operations](#bulk-operations)
- [Error Codes](#error-codes)

---

## Authentication

ShortedBro API supports three authentication methods:

### 1. JWT Token (Recommended for Web Apps)

Obtain a JWT token by logging in, then include it in the Authorization header.

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### 2. API Key (Recommended for Automation)

Generate an API key from your dashboard and include it in the header.

```bash
X-API-Key: elk_your_api_key_here
```

### 3. Anonymous Access

Limited functionality without authentication (10 requests/hour, 30-day link expiry).

---

## Rate Limiting

| Plan | Requests per Day | Links Limit | Clicks Tracked |
|------|-----------------|-------------|----------------|
| Anonymous | 10/hour | N/A | N/A |
| Free | 1,000 | 500 | 50,000/month |
| Pro | 10,000 | 5,000 | 500,000/month |

Rate limit headers are included in every response:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1700000000
```

---

## Authentication Endpoints

### Sign Up

Create a new user account.

**Endpoint:** `POST /auth/signup`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "John Doe"
}
```

**cURL Example:**
```bash
curl -X POST https://go.shortedbro.xyz/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123",
    "name": "John Doe"
  }'
```

**JavaScript Example:**
```javascript
const response = await fetch('https://go.shortedbro.xyz/auth/signup', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123',
    name: 'John Doe'
  })
});

const data = await response.json();
console.log(data.access_token);
```

**Python Example:**
```python
import requests

response = requests.post(
    'https://go.shortedbro.xyz/auth/signup',
    json={
        'email': 'user@example.com',
        'password': 'SecurePass123',
        'name': 'John Doe'
    }
)

data = response.json()
print(data['access_token'])
```

**Response (201 Created):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "rt_abc123...",
  "expires_in": 86400,
  "token_type": "Bearer",
  "user": {
    "user_id": "usr_abc123",
    "email": "user@example.com",
    "plan": "free"
  },
  "message": "Account created successfully. Please check your email to verify your account within 90 days."
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

---

### Login

Authenticate and receive access tokens.

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**cURL Example:**
```bash
curl -X POST https://go.shortedbro.xyz/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'
```

**JavaScript Example:**
```javascript
const response = await fetch('https://go.shortedbro.xyz/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123'
  })
});

const { access_token, refresh_token, user } = await response.json();

// Store tokens securely
localStorage.setItem('access_token', access_token);
localStorage.setItem('refresh_token', refresh_token);
```

**Python Example:**
```python
import requests

response = requests.post(
    'https://go.shortedbro.xyz/auth/login',
    json={
        'email': 'user@example.com',
        'password': 'SecurePass123'
    }
)

data = response.json()
access_token = data['access_token']
refresh_token = data['refresh_token']
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "rt_abc123...",
  "expires_in": 86400,
  "token_type": "Bearer",
  "user": {
    "user_id": "usr_abc123",
    "email": "user@example.com",
    "plan": "pro",
    "email_verified": true
  }
}
```

---

### Refresh Token

Get a new access token using a refresh token.

**Endpoint:** `POST /auth/refresh`

**Request Body:**
```json
{
  "refresh_token": "rt_abc123..."
}
```

**cURL Example:**
```bash
curl -X POST https://go.shortedbro.xyz/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "rt_abc123..."
  }'
```

**JavaScript Example:**
```javascript
async function refreshAccessToken() {
  const refresh_token = localStorage.getItem('refresh_token');

  const response = await fetch('https://go.shortedbro.xyz/auth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ refresh_token })
  });

  const data = await response.json();
  localStorage.setItem('access_token', data.access_token);
  return data.access_token;
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 86400,
  "token_type": "Bearer"
}
```

---

### Logout

Invalidate the refresh token.

**Endpoint:** `POST /auth/logout`

**Request Body:**
```json
{
  "refresh_token": "rt_abc123..."
}
```

**cURL Example:**
```bash
curl -X POST https://go.shortedbro.xyz/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "rt_abc123..."
  }'
```

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

---

## Link Management

### Create Short Link

Create a new shortened URL.

**Endpoint:** `POST /api/shorten`

**Authentication:** Optional (anonymous links expire in 30 days)

**Request Body:**
```json
{
  "url": "https://example.com/very/long/url/path",
  "custom_slug": "my-link",
  "custom_domain": "links.mysite.com",
  "expires_at": "2025-12-31T23:59:00",
  "timezone": "America/New_York",
  "max_clicks": 1000,
  "password": "secret123",
  "group_id": "grp_abc123",
  "utm_template": "utm_source=shortedbro&utm_medium=link"
}
```

**cURL Example - Basic:**
```bash
curl -X POST https://go.shortedbro.xyz/api/shorten \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "url": "https://example.com/my-article"
  }'
```

**cURL Example - With Custom Slug:**
```bash
curl -X POST https://go.shortedbro.xyz/api/shorten \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "url": "https://example.com/product-launch",
    "custom_slug": "launch2025"
  }'
```

**cURL Example - With Expiration:**
```bash
curl -X POST https://go.shortedbro.xyz/api/shorten \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "url": "https://example.com/limited-offer",
    "expires_at": "2025-01-15T00:00:00",
    "timezone": "America/Los_Angeles",
    "max_clicks": 500
  }'
```

**cURL Example - Password Protected (Pro):**
```bash
curl -X POST https://go.shortedbro.xyz/api/shorten \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "url": "https://example.com/confidential-report",
    "custom_slug": "q4-report",
    "password": "team2025"
  }'
```

**JavaScript Example:**
```javascript
// Basic link creation
async function createShortLink(url, options = {}) {
  const response = await fetch('https://go.shortedbro.xyz/api/shorten', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      url,
      ...options
    })
  });

  return response.json();
}

// Usage examples
const basicLink = await createShortLink('https://example.com/article');
console.log(basicLink.short_url); // https://go.shortedbro.xyz/abc123

const customLink = await createShortLink('https://example.com/product', {
  custom_slug: 'new-product',
  expires_at: '2025-06-30T23:59:00',
  timezone: 'UTC'
});
console.log(customLink.short_url); // https://go.shortedbro.xyz/new-product

const protectedLink = await createShortLink('https://example.com/secret', {
  password: 'mypassword123',
  max_clicks: 100
});
```

**Python Example:**
```python
import requests

def create_short_link(url, **options):
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {access_token}'
    }

    data = {'url': url, **options}

    response = requests.post(
        'https://go.shortedbro.xyz/api/shorten',
        headers=headers,
        json=data
    )

    return response.json()

# Basic usage
result = create_short_link('https://example.com/my-page')
print(result['short_url'])

# With custom slug
result = create_short_link(
    'https://example.com/campaign',
    custom_slug='summer-sale',
    expires_at='2025-08-31T23:59:00',
    timezone='America/New_York'
)

# Password protected
result = create_short_link(
    'https://example.com/private-doc',
    password='secret123',
    max_clicks=50
)
```

**Response (201 Created):**
```json
{
  "slug": "abc123",
  "short_url": "https://go.shortedbro.xyz/abc123",
  "expires_in": 2592000,
  "qr_code_url": "https://go.shortedbro.xyz/api/qr/abc123"
}
```

---

### List Links

Get all links for the authenticated user.

**Endpoint:** `GET /api/links`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number |
| limit | integer | 50 | Items per page (max 100) |
| search | string | - | Search term |
| searchField | string | all | Field to search (slug, destination, date, all) |

**cURL Example:**
```bash
# Get all links
curl -X GET "https://go.shortedbro.xyz/api/links" \
  -H "Authorization: Bearer YOUR_TOKEN"

# With pagination
curl -X GET "https://go.shortedbro.xyz/api/links?page=2&limit=25" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Search by slug
curl -X GET "https://go.shortedbro.xyz/api/links?search=product&searchField=slug" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Search all fields
curl -X GET "https://go.shortedbro.xyz/api/links?search=example.com" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**JavaScript Example:**
```javascript
async function getLinks(options = {}) {
  const params = new URLSearchParams({
    page: options.page || 1,
    limit: options.limit || 50,
    ...(options.search && { search: options.search }),
    ...(options.searchField && { searchField: options.searchField })
  });

  const response = await fetch(
    `https://go.shortedbro.xyz/api/links?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  return response.json();
}

// Get first page
const links = await getLinks();
console.log(`Total: ${links.total}, Page: ${links.page}/${links.totalPages}`);

// Search links
const searchResults = await getLinks({
  search: 'marketing',
  searchField: 'slug'
});

// Paginate through all links
async function getAllLinks() {
  let allLinks = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await getLinks({ page, limit: 100 });
    allLinks = allLinks.concat(response.links);
    hasMore = page < response.totalPages;
    page++;
  }

  return allLinks;
}
```

**Python Example:**
```python
import requests

def get_links(page=1, limit=50, search=None, search_field=None):
    headers = {'Authorization': f'Bearer {access_token}'}
    params = {'page': page, 'limit': limit}

    if search:
        params['search'] = search
    if search_field:
        params['searchField'] = search_field

    response = requests.get(
        'https://go.shortedbro.xyz/api/links',
        headers=headers,
        params=params
    )

    return response.json()

# Get all links
result = get_links()
for link in result['links']:
    print(f"{link['slug']}: {link['destination']} ({link['click_count']} clicks)")

# Search for specific links
result = get_links(search='product', search_field='slug')

# Get all links with pagination
def get_all_links():
    all_links = []
    page = 1

    while True:
        result = get_links(page=page, limit=100)
        all_links.extend(result['links'])

        if page >= result['totalPages']:
            break
        page += 1

    return all_links
```

**Response (200 OK):**
```json
{
  "links": [
    {
      "slug": "abc123",
      "destination": "https://example.com/page",
      "custom_domain": null,
      "created_at": "2025-01-15T10:30:00Z",
      "updated_at": "2025-01-15T10:30:00Z",
      "expires_at": null,
      "max_clicks": null,
      "click_count": 150,
      "password_protected": false,
      "device_routing": null,
      "geo_routing": null,
      "referrer_routing": null,
      "ab_testing": null,
      "utm_params": null
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 50,
  "totalPages": 1
}
```

---

### Update Link

Update an existing link's properties.

**Endpoint:** `PUT /api/links/{slug}`

**Request Body:**
```json
{
  "destination": "https://example.com/new-destination",
  "new_slug": "better-slug",
  "expires_at": "2025-12-31T23:59:00",
  "timezone": "UTC",
  "max_clicks": 500,
  "password": "newpassword"
}
```

**cURL Example:**
```bash
# Update destination
curl -X PUT https://go.shortedbro.xyz/api/links/abc123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "destination": "https://example.com/updated-page"
  }'

# Change slug (Pro only)
curl -X PUT https://go.shortedbro.xyz/api/links/abc123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "destination": "https://example.com/page",
    "new_slug": "new-better-slug"
  }'

# Set expiration
curl -X PUT https://go.shortedbro.xyz/api/links/abc123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "destination": "https://example.com/sale",
    "expires_at": "2025-03-01T00:00:00",
    "timezone": "America/New_York"
  }'
```

**JavaScript Example:**
```javascript
async function updateLink(slug, updates) {
  const response = await fetch(
    `https://go.shortedbro.xyz/api/links/${slug}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(updates)
    }
  );

  return response.json();
}

// Update destination
await updateLink('abc123', {
  destination: 'https://example.com/new-page'
});

// Change slug and add password (Pro)
await updateLink('old-slug', {
  destination: 'https://example.com/page',
  new_slug: 'new-slug',
  password: 'secret123'
});

// Set click limit and expiration
await updateLink('campaign-link', {
  destination: 'https://example.com/promo',
  max_clicks: 1000,
  expires_at: '2025-06-30T23:59:00',
  timezone: 'UTC'
});
```

**Python Example:**
```python
import requests

def update_link(slug, **updates):
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {access_token}'
    }

    response = requests.put(
        f'https://go.shortedbro.xyz/api/links/{slug}',
        headers=headers,
        json=updates
    )

    return response.json()

# Update destination
result = update_link('abc123', destination='https://example.com/new')

# Change slug (Pro)
result = update_link('old-slug',
    destination='https://example.com/page',
    new_slug='better-slug'
)

# Add expiration
result = update_link('promo-link',
    destination='https://example.com/promo',
    expires_at='2025-03-31T23:59:00',
    timezone='America/Chicago',
    max_clicks=500
)
```

**Response (200 OK):**
```json
{
  "message": "Link updated successfully",
  "slug": "new-better-slug",
  "slug_changed": true,
  "old_slug": "abc123"
}
```

---

### Delete Link

Permanently delete a link.

**Endpoint:** `DELETE /api/links/{slug}`

**cURL Example:**
```bash
curl -X DELETE https://go.shortedbro.xyz/api/links/abc123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**JavaScript Example:**
```javascript
async function deleteLink(slug) {
  const response = await fetch(
    `https://go.shortedbro.xyz/api/links/${slug}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  return response.json();
}

// Delete single link
await deleteLink('abc123');

// Delete multiple links
const slugsToDelete = ['link1', 'link2', 'link3'];
await Promise.all(slugsToDelete.map(slug => deleteLink(slug)));
```

**Python Example:**
```python
import requests

def delete_link(slug):
    headers = {'Authorization': f'Bearer {access_token}'}

    response = requests.delete(
        f'https://go.shortedbro.xyz/api/links/{slug}',
        headers=headers
    )

    return response.json()

# Delete link
result = delete_link('abc123')
print(result['message'])

# Delete multiple links
slugs_to_delete = ['link1', 'link2', 'link3']
for slug in slugs_to_delete:
    delete_link(slug)
```

**Response (200 OK):**
```json
{
  "message": "Link deleted successfully"
}
```

---

### Generate QR Code

Generate a QR code for a link (Pro feature).

**Endpoint:** `GET /api/links/{slug}/qr`

**cURL Example:**
```bash
# Download QR code as SVG
curl -X GET https://go.shortedbro.xyz/api/links/abc123/qr \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o qrcode.svg
```

**JavaScript Example:**
```javascript
async function getQRCode(slug) {
  const response = await fetch(
    `https://go.shortedbro.xyz/api/links/${slug}/qr`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  if (response.ok) {
    const svgText = await response.text();
    return svgText;
  }

  throw new Error('Failed to generate QR code');
}

// Display QR code
const qrSvg = await getQRCode('abc123');
document.getElementById('qr-container').innerHTML = qrSvg;

// Download QR code
async function downloadQRCode(slug, filename) {
  const svgText = await getQRCode(slug);
  const blob = new Blob([svgText], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.svg`;
  a.click();

  URL.revokeObjectURL(url);
}
```

**Python Example:**
```python
import requests

def get_qr_code(slug, filename):
    headers = {'Authorization': f'Bearer {access_token}'}

    response = requests.get(
        f'https://go.shortedbro.xyz/api/links/{slug}/qr',
        headers=headers
    )

    if response.ok:
        with open(f'{filename}.svg', 'wb') as f:
            f.write(response.content)
        return True

    return False

# Download QR code
get_qr_code('abc123', 'my-qr-code')
```

**Response (200 OK):**
Returns SVG image data with Content-Type: `image/svg+xml`

---

## Analytics

### Get Link Analytics

Get detailed analytics for a specific link.

**Endpoint:** `GET /api/analytics/{slug}`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| timeRange | string | 7d | Time range (7d or 30d) |

**cURL Example:**
```bash
# Get 7-day analytics
curl -X GET "https://go.shortedbro.xyz/api/analytics/abc123" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get 30-day analytics
curl -X GET "https://go.shortedbro.xyz/api/analytics/abc123?timeRange=30d" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**JavaScript Example:**
```javascript
async function getLinkAnalytics(slug, timeRange = '7d') {
  const response = await fetch(
    `https://go.shortedbro.xyz/api/analytics/${slug}?timeRange=${timeRange}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  return response.json();
}

// Get analytics
const analytics = await getLinkAnalytics('abc123', '30d');

console.log(`Total clicks: ${analytics.total_clicks}`);
console.log(`Time series:`, analytics.analytics.time_series);
console.log(`Top countries:`, analytics.analytics.geographic);
console.log(`Device breakdown:`, analytics.analytics.devices);
console.log(`Browser breakdown:`, analytics.analytics.browsers);
console.log(`OS breakdown:`, analytics.analytics.operating_systems);
console.log(`Top referrers:`, analytics.analytics.referrers);
```

**Python Example:**
```python
import requests

def get_link_analytics(slug, time_range='7d'):
    headers = {'Authorization': f'Bearer {access_token}'}
    params = {'timeRange': time_range}

    response = requests.get(
        f'https://go.shortedbro.xyz/api/analytics/{slug}',
        headers=headers,
        params=params
    )

    return response.json()

# Get analytics
analytics = get_link_analytics('abc123', '30d')

print(f"Total clicks: {analytics['total_clicks']}")

# Print top countries
for geo in analytics['analytics']['geographic'][:5]:
    print(f"{geo['country_name']}: {geo['clicks']} clicks")

# Print device breakdown
for device in analytics['analytics']['devices']:
    print(f"{device['device']}: {device['percentage']:.1f}%")
```

**Response (200 OK):**
```json
{
  "slug": "abc123",
  "destination": "https://example.com/page",
  "total_clicks": 1250,
  "created_at": "2025-01-01T00:00:00Z",
  "time_range": "30d",
  "analytics": {
    "time_series": [
      { "date": "2025-01-01", "clicks": 45 },
      { "date": "2025-01-02", "clicks": 67 },
      { "date": "2025-01-03", "clicks": 52 }
    ],
    "geographic": [
      { "country": "US", "country_name": "United States", "clicks": 450 },
      { "country": "GB", "country_name": "United Kingdom", "clicks": 230 },
      { "country": "CA", "country_name": "Canada", "clicks": 180 }
    ],
    "devices": [
      { "device": "mobile", "clicks": 625, "percentage": 50 },
      { "device": "desktop", "clicks": 500, "percentage": 40 },
      { "device": "tablet", "clicks": 125, "percentage": 10 }
    ],
    "browsers": [
      { "browser": "Chrome", "clicks": 600, "percentage": 48 },
      { "browser": "Safari", "clicks": 350, "percentage": 28 },
      { "browser": "Firefox", "clicks": 150, "percentage": 12 }
    ],
    "operating_systems": [
      { "os": "iOS", "clicks": 400, "percentage": 32 },
      { "os": "Windows", "clicks": 350, "percentage": 28 },
      { "os": "Android", "clicks": 300, "percentage": 24 }
    ],
    "referrers": [
      { "referrer": "twitter.com", "clicks": 400, "percentage": 32 },
      { "referrer": "direct", "clicks": 350, "percentage": 28 },
      { "referrer": "linkedin.com", "clicks": 200, "percentage": 16 }
    ]
  }
}
```

---

### Get Analytics Summary

Get overall analytics summary for all user's links.

**Endpoint:** `GET /api/analytics/summary`

**cURL Example:**
```bash
curl -X GET https://go.shortedbro.xyz/api/analytics/summary \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**JavaScript Example:**
```javascript
async function getAnalyticsSummary() {
  const response = await fetch(
    'https://go.shortedbro.xyz/api/analytics/summary',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  return response.json();
}

const summary = await getAnalyticsSummary();
console.log(`Total links: ${summary.stats.total_links}`);
console.log(`Total clicks: ${summary.stats.total_clicks}`);
console.log(`Usage: ${summary.usage_percentage.links}% of link limit`);
```

**Python Example:**
```python
import requests

def get_analytics_summary():
    headers = {'Authorization': f'Bearer {access_token}'}

    response = requests.get(
        'https://go.shortedbro.xyz/api/analytics/summary',
        headers=headers
    )

    return response.json()

summary = get_analytics_summary()
print(f"Plan: {summary['plan']}")
print(f"Total links: {summary['stats']['total_links']}")
print(f"Total clicks: {summary['stats']['total_clicks']}")
print(f"Average clicks per link: {summary['stats']['avg_clicks']}")
print(f"Link usage: {summary['usage_percentage']['links']}%")
```

**Response (200 OK):**
```json
{
  "user_id": "usr_abc123",
  "plan": "pro",
  "member_since": "2024-06-15T00:00:00Z",
  "stats": {
    "total_links": 150,
    "total_clicks": 25000,
    "max_clicks": 5000,
    "avg_clicks": 167
  },
  "limits": {
    "links": 5000,
    "api_calls": 10000,
    "clicks": 500000
  },
  "usage_percentage": {
    "links": 3,
    "clicks": 5
  }
}
```

---

## Smart Routing

Smart routing allows you to redirect users to different destinations based on their device, location, time, or referrer. All routing features require a Pro plan.

### Device Routing

Route users to different URLs based on their device type.

**Endpoint:** `POST /api/links/{slug}/routing/device`

**Request Body:**
```json
{
  "mobile": "https://m.example.com",
  "tablet": "https://tablet.example.com",
  "desktop": "https://www.example.com"
}
```

**cURL Example:**
```bash
curl -X POST https://go.shortedbro.xyz/api/links/abc123/routing/device \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "mobile": "https://app.example.com/mobile",
    "tablet": "https://app.example.com/tablet",
    "desktop": "https://www.example.com/desktop"
  }'
```

**JavaScript Example:**
```javascript
async function setDeviceRouting(slug, routes) {
  const response = await fetch(
    `https://go.shortedbro.xyz/api/links/${slug}/routing/device`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(routes)
    }
  );

  return response.json();
}

// Route to app stores
await setDeviceRouting('my-app', {
  mobile: 'https://apps.apple.com/app/myapp',
  tablet: 'https://apps.apple.com/app/myapp',
  desktop: 'https://www.myapp.com/download'
});

// Route to responsive vs mobile site
await setDeviceRouting('product-page', {
  mobile: 'https://m.shop.com/product/123',
  desktop: 'https://shop.com/product/123'
});
```

**Python Example:**
```python
import requests

def set_device_routing(slug, mobile=None, tablet=None, desktop=None):
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {access_token}'
    }

    routes = {}
    if mobile:
        routes['mobile'] = mobile
    if tablet:
        routes['tablet'] = tablet
    if desktop:
        routes['desktop'] = desktop

    response = requests.post(
        f'https://go.shortedbro.xyz/api/links/{slug}/routing/device',
        headers=headers,
        json=routes
    )

    return response.json()

# Set device routing
result = set_device_routing('my-app',
    mobile='https://apps.apple.com/app/myapp',
    tablet='https://play.google.com/store/apps/myapp',
    desktop='https://www.myapp.com'
)
```

**Response (200 OK):**
```json
{
  "message": "Device routing configured successfully",
  "slug": "abc123",
  "device_routing": {
    "mobile": "https://m.example.com",
    "tablet": "https://tablet.example.com",
    "desktop": "https://www.example.com"
  }
}
```

---

### Geographic Routing

Route users to different URLs based on their country.

**Endpoint:** `POST /api/links/{slug}/routing/geo`

**Request Body:**
```json
{
  "routes": {
    "US": "https://us.example.com",
    "GB": "https://uk.example.com",
    "DE": "https://de.example.com",
    "FR": "https://fr.example.com",
    "default": "https://www.example.com"
  }
}
```

**cURL Example:**
```bash
curl -X POST https://go.shortedbro.xyz/api/links/abc123/routing/geo \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "routes": {
      "US": "https://us.store.com",
      "CA": "https://ca.store.com",
      "GB": "https://uk.store.com",
      "AU": "https://au.store.com",
      "default": "https://global.store.com"
    }
  }'
```

**JavaScript Example:**
```javascript
async function setGeoRouting(slug, routes) {
  const response = await fetch(
    `https://go.shortedbro.xyz/api/links/${slug}/routing/geo`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ routes })
    }
  );

  return response.json();
}

// Regional pricing pages
await setGeoRouting('pricing', {
  'US': 'https://example.com/pricing/usd',
  'GB': 'https://example.com/pricing/gbp',
  'EU': 'https://example.com/pricing/eur',
  'default': 'https://example.com/pricing/usd'
});

// Language-specific content
await setGeoRouting('help-center', {
  'DE': 'https://help.example.com/de',
  'FR': 'https://help.example.com/fr',
  'ES': 'https://help.example.com/es',
  'IT': 'https://help.example.com/it',
  'JP': 'https://help.example.com/ja',
  'default': 'https://help.example.com/en'
});
```

**Python Example:**
```python
import requests

def set_geo_routing(slug, routes):
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {access_token}'
    }

    response = requests.post(
        f'https://go.shortedbro.xyz/api/links/{slug}/routing/geo',
        headers=headers,
        json={'routes': routes}
    )

    return response.json()

# Set geographic routing
result = set_geo_routing('product', {
    'US': 'https://shop.com/us/product',
    'CA': 'https://shop.com/ca/product',
    'GB': 'https://shop.co.uk/product',
    'DE': 'https://shop.de/product',
    'FR': 'https://shop.fr/product',
    'default': 'https://shop.com/global/product'
})
```

**Response (200 OK):**
```json
{
  "message": "Geographic routing configured successfully",
  "slug": "abc123",
  "geo_routing": {
    "US": "https://us.example.com",
    "GB": "https://uk.example.com",
    "default": "https://www.example.com"
  }
}
```

---

### Time-Based Routing

Route users based on time of day.

**Endpoint:** `POST /api/links/{slug}/routing/time`

**Request Body:**
```json
{
  "rules": [
    {
      "start_hour": 9,
      "end_hour": 17,
      "days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
      "timezone": "America/New_York",
      "destination": "https://example.com/business-hours"
    },
    {
      "start_hour": 0,
      "end_hour": 23,
      "destination": "https://example.com/after-hours"
    }
  ]
}
```

**cURL Example:**
```bash
curl -X POST https://go.shortedbro.xyz/api/links/abc123/routing/time \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "rules": [
      {
        "start_hour": 9,
        "end_hour": 18,
        "timezone": "America/New_York",
        "destination": "https://example.com/support-chat"
      },
      {
        "start_hour": 18,
        "end_hour": 9,
        "destination": "https://example.com/leave-message"
      }
    ]
  }'
```

**JavaScript Example:**
```javascript
async function setTimeRouting(slug, rules) {
  const response = await fetch(
    `https://go.shortedbro.xyz/api/links/${slug}/routing/time`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ rules })
    }
  );

  return response.json();
}

// Business hours routing
await setTimeRouting('support', [
  {
    start_hour: 9,
    end_hour: 17,
    timezone: 'America/New_York',
    destination: 'https://example.com/live-chat'
  },
  {
    start_hour: 17,
    end_hour: 9,
    destination: 'https://example.com/contact-form'
  }
]);

// Weekend promotion
await setTimeRouting('deal', [
  {
    start_hour: 0,
    end_hour: 23,
    days: ['saturday', 'sunday'],
    destination: 'https://example.com/weekend-sale'
  },
  {
    start_hour: 0,
    end_hour: 23,
    destination: 'https://example.com/regular-prices'
  }
]);
```

**Python Example:**
```python
import requests

def set_time_routing(slug, rules):
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {access_token}'
    }

    response = requests.post(
        f'https://go.shortedbro.xyz/api/links/{slug}/routing/time',
        headers=headers,
        json={'rules': rules}
    )

    return response.json()

# Set time-based routing
result = set_time_routing('support', [
    {
        'start_hour': 8,
        'end_hour': 20,
        'timezone': 'America/Los_Angeles',
        'destination': 'https://example.com/chat'
    },
    {
        'start_hour': 20,
        'end_hour': 8,
        'destination': 'https://example.com/email-support'
    }
])
```

**Response (200 OK):**
```json
{
  "message": "Time-based routing configured successfully",
  "slug": "abc123",
  "time_routing": [
    {
      "start_hour": 9,
      "end_hour": 17,
      "timezone": "America/New_York",
      "destination": "https://example.com/business-hours"
    }
  ]
}
```

---

### Referrer-Based Routing

Route users based on where they came from.

**Endpoint:** `POST /api/links/{slug}/routing/referrer`

**Request Body:**
```json
{
  "routes": {
    "twitter.com": "https://example.com/from-twitter",
    "linkedin.com": "https://example.com/from-linkedin",
    "facebook.com": "https://example.com/from-facebook",
    "default": "https://example.com/welcome"
  }
}
```

**cURL Example:**
```bash
curl -X POST https://go.shortedbro.xyz/api/links/abc123/routing/referrer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "routes": {
      "twitter.com": "https://example.com/twitter-offer",
      "linkedin.com": "https://example.com/linkedin-offer",
      "google.com": "https://example.com/search-landing",
      "default": "https://example.com/general"
    }
  }'
```

**JavaScript Example:**
```javascript
async function setReferrerRouting(slug, routes) {
  const response = await fetch(
    `https://go.shortedbro.xyz/api/links/${slug}/routing/referrer`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ routes })
    }
  );

  return response.json();
}

// Social media specific landing pages
await setReferrerRouting('campaign', {
  'twitter.com': 'https://example.com/landing/twitter',
  'x.com': 'https://example.com/landing/twitter',
  'linkedin.com': 'https://example.com/landing/linkedin',
  'facebook.com': 'https://example.com/landing/facebook',
  'instagram.com': 'https://example.com/landing/instagram',
  'default': 'https://example.com/landing/general'
});

// Affiliate tracking
await setReferrerRouting('product', {
  'partner1.com': 'https://shop.com/product?ref=partner1',
  'partner2.com': 'https://shop.com/product?ref=partner2',
  'blog.example.com': 'https://shop.com/product?ref=blog',
  'default': 'https://shop.com/product'
});
```

**Python Example:**
```python
import requests

def set_referrer_routing(slug, routes):
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {access_token}'
    }

    response = requests.post(
        f'https://go.shortedbro.xyz/api/links/{slug}/routing/referrer',
        headers=headers,
        json={'routes': routes}
    )

    return response.json()

# Set referrer-based routing
result = set_referrer_routing('special-offer', {
    'twitter.com': 'https://example.com/twitter-exclusive',
    'linkedin.com': 'https://example.com/professional-discount',
    'reddit.com': 'https://example.com/reddit-special',
    'default': 'https://example.com/standard-offer'
})
```

**Response (200 OK):**
```json
{
  "message": "Referrer-based routing configured successfully",
  "slug": "abc123",
  "referrer_routing": {
    "twitter.com": "https://example.com/from-twitter",
    "linkedin.com": "https://example.com/from-linkedin",
    "default": "https://example.com/welcome"
  }
}
```

---

### Get Routing Configuration

Get all routing rules for a link.

**Endpoint:** `GET /api/links/{slug}/routing`

**cURL Example:**
```bash
curl -X GET https://go.shortedbro.xyz/api/links/abc123/routing \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**JavaScript Example:**
```javascript
async function getRouting(slug) {
  const response = await fetch(
    `https://go.shortedbro.xyz/api/links/${slug}/routing`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  return response.json();
}

const routing = await getRouting('abc123');
console.log('Device routing:', routing.routing.device);
console.log('Geo routing:', routing.routing.geo);
console.log('Time routing:', routing.routing.time);
console.log('Referrer routing:', routing.routing.referrer);
```

**Response (200 OK):**
```json
{
  "slug": "abc123",
  "destination": "https://example.com",
  "routing": {
    "device": {
      "mobile": "https://m.example.com",
      "desktop": "https://www.example.com"
    },
    "geo": {
      "US": "https://us.example.com",
      "default": "https://www.example.com"
    },
    "time": null,
    "referrer": {
      "twitter.com": "https://example.com/twitter",
      "default": "https://example.com"
    }
  }
}
```

---

### Delete Routing

Remove all routing rules from a link.

**Endpoint:** `DELETE /api/links/{slug}/routing`

**cURL Example:**
```bash
curl -X DELETE https://go.shortedbro.xyz/api/links/abc123/routing \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "message": "All routing rules removed successfully",
  "slug": "abc123"
}
```

---

## A/B Testing

Test different destinations to see which performs better (Pro feature).

### Create A/B Test

**Endpoint:** `POST /api/links/{slug}/ab-test`

**Request Body:**
```json
{
  "variant_a": "https://example.com/page-version-a",
  "variant_b": "https://example.com/page-version-b"
}
```

**cURL Example:**
```bash
curl -X POST https://go.shortedbro.xyz/api/links/abc123/ab-test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "variant_a": "https://example.com/landing-v1",
    "variant_b": "https://example.com/landing-v2"
  }'
```

**JavaScript Example:**
```javascript
async function createABTest(slug, variantA, variantB) {
  const response = await fetch(
    `https://go.shortedbro.xyz/api/links/${slug}/ab-test`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        variant_a: variantA,
        variant_b: variantB
      })
    }
  );

  return response.json();
}

// Test two landing pages
await createABTest('campaign',
  'https://example.com/landing-blue',
  'https://example.com/landing-green'
);

// Test pricing pages
await createABTest('pricing',
  'https://example.com/pricing-monthly',
  'https://example.com/pricing-annual'
);
```

**Python Example:**
```python
import requests

def create_ab_test(slug, variant_a, variant_b):
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {access_token}'
    }

    response = requests.post(
        f'https://go.shortedbro.xyz/api/links/{slug}/ab-test',
        headers=headers,
        json={
            'variant_a': variant_a,
            'variant_b': variant_b
        }
    )

    return response.json()

# Create A/B test
result = create_ab_test('signup',
    'https://example.com/signup-v1',
    'https://example.com/signup-v2'
)
```

**Response (201 Created):**
```json
{
  "message": "A/B test created successfully",
  "slug": "abc123",
  "ab_testing": {
    "variant_a": "https://example.com/page-version-a",
    "variant_b": "https://example.com/page-version-b"
  }
}
```

---

### Get A/B Test Results

**Endpoint:** `GET /api/links/{slug}/ab-test`

**cURL Example:**
```bash
curl -X GET https://go.shortedbro.xyz/api/links/abc123/ab-test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**JavaScript Example:**
```javascript
async function getABTestResults(slug) {
  const response = await fetch(
    `https://go.shortedbro.xyz/api/links/${slug}/ab-test`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  return response.json();
}

const results = await getABTestResults('campaign');
console.log(`Variant A: ${results.variant_a_clicks} clicks`);
console.log(`Variant B: ${results.variant_b_clicks} clicks`);
console.log(`Winner: ${results.winner || 'Not enough data'}`);
```

**Response (200 OK):**
```json
{
  "slug": "abc123",
  "ab_testing": {
    "variant_a": "https://example.com/page-version-a",
    "variant_b": "https://example.com/page-version-b"
  },
  "results": {
    "variant_a_clicks": 523,
    "variant_b_clicks": 477,
    "total_clicks": 1000,
    "winner": "variant_a",
    "confidence": 0.85
  }
}
```

---

### Stop A/B Test

**Endpoint:** `DELETE /api/links/{slug}/ab-test`

**cURL Example:**
```bash
curl -X DELETE https://go.shortedbro.xyz/api/links/abc123/ab-test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "message": "A/B test stopped successfully",
  "slug": "abc123"
}
```

---

## Webhooks

Receive real-time notifications when events occur (Pro feature).

### Create Webhook

**Endpoint:** `POST /api/webhooks`

**Request Body:**
```json
{
  "url": "https://your-server.com/webhook",
  "name": "My Webhook",
  "events": ["link.clicked", "link.created", "link.updated", "link.deleted"],
  "slug": "abc123"
}
```

**Supported Events:**
- `link.clicked` - Every time a link is clicked
- `link.created` - When a new link is created
- `link.updated` - When a link is modified
- `link.deleted` - When a link is deleted

**cURL Example:**
```bash
curl -X POST https://go.shortedbro.xyz/api/webhooks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "url": "https://api.myserver.com/webhooks/shortedbro",
    "name": "Production Webhook",
    "events": ["link.clicked", "link.created"]
  }'
```

**JavaScript Example:**
```javascript
async function createWebhook(url, name, events, slug = null) {
  const response = await fetch('https://go.shortedbro.xyz/api/webhooks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      url,
      name,
      events,
      ...(slug && { slug })
    })
  });

  return response.json();
}

// Webhook for all links
const webhook = await createWebhook(
  'https://api.myapp.com/webhooks/links',
  'All Links Webhook',
  ['link.clicked', 'link.created', 'link.updated', 'link.deleted']
);

// Save the secret for verification
console.log('Webhook Secret:', webhook.secret);

// Webhook for specific link
const specificWebhook = await createWebhook(
  'https://api.myapp.com/webhooks/campaign',
  'Campaign Webhook',
  ['link.clicked'],
  'campaign-link'
);
```

**Python Example:**
```python
import requests

def create_webhook(url, name, events, slug=None):
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {access_token}'
    }

    data = {
        'url': url,
        'name': name,
        'events': events
    }

    if slug:
        data['slug'] = slug

    response = requests.post(
        'https://go.shortedbro.xyz/api/webhooks',
        headers=headers,
        json=data
    )

    return response.json()

# Create webhook
webhook = create_webhook(
    'https://api.myserver.com/webhooks',
    'Analytics Webhook',
    ['link.clicked']
)

# IMPORTANT: Save this secret!
webhook_secret = webhook['secret']
print(f"Save this webhook secret: {webhook_secret}")
```

**Response (201 Created):**
```json
{
  "webhook_id": "wh_abc123...",
  "url": "https://your-server.com/webhook",
  "name": "My Webhook",
  "events": ["link.clicked", "link.created"],
  "slug": null,
  "secret": "whsec_abc123...",
  "active": true,
  "message": "Webhook created successfully. Save the secret for signature verification."
}
```

---

### Webhook Payload

When an event occurs, we send a POST request to your webhook URL:

**Headers:**
```
Content-Type: application/json
X-EdgeLink-Signature: <hmac-sha256-signature>
X-EdgeLink-Event: link.clicked
User-Agent: EdgeLink-Webhooks/1.0
```

**Payload Example (link.clicked):**
```json
{
  "event": "link.clicked",
  "slug": "abc123",
  "clicks": 1501,
  "timestamp": 1700000000000,
  "user_id": "usr_abc123"
}
```

**Payload Example (link.created):**
```json
{
  "event": "link.created",
  "slug": "new-link",
  "timestamp": 1700000000000,
  "user_id": "usr_abc123"
}
```

---

### Verifying Webhook Signatures

Always verify webhook signatures to ensure requests come from ShortedBro.

**JavaScript Example:**
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');

  return crypto.timingSafeEquals(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Express.js webhook handler
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-edgelink-signature'];
  const payload = req.body.toString();

  if (!verifyWebhookSignature(payload, signature, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(payload);

  switch (event.event) {
    case 'link.clicked':
      console.log(`Link ${event.slug} clicked! Total: ${event.clicks}`);
      break;
    case 'link.created':
      console.log(`New link created: ${event.slug}`);
      break;
    case 'link.deleted':
      console.log(`Link deleted: ${event.slug}`);
      break;
  }

  res.status(200).send('OK');
});
```

**Python Example:**
```python
import hmac
import hashlib
from flask import Flask, request

app = Flask(__name__)
WEBHOOK_SECRET = 'whsec_your_secret_here'

def verify_signature(payload, signature, secret):
    expected = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected)

@app.route('/webhook', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-EdgeLink-Signature')
    payload = request.data

    if not verify_signature(payload, signature, WEBHOOK_SECRET):
        return 'Invalid signature', 401

    event = request.json

    if event['event'] == 'link.clicked':
        print(f"Link {event['slug']} clicked! Total: {event['clicks']}")
        # Update your analytics, send notification, etc.

    elif event['event'] == 'link.created':
        print(f"New link created: {event['slug']}")
        # Log creation, sync to CRM, etc.

    return 'OK', 200
```

**Go Example:**
```go
package main

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "encoding/json"
    "io"
    "net/http"
)

func verifySignature(payload []byte, signature, secret string) bool {
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write(payload)
    expected := hex.EncodeToString(mac.Sum(nil))
    return hmac.Equal([]byte(signature), []byte(expected))
}

func webhookHandler(w http.ResponseWriter, r *http.Request) {
    signature := r.Header.Get("X-EdgeLink-Signature")
    payload, _ := io.ReadAll(r.Body)

    if !verifySignature(payload, signature, webhookSecret) {
        http.Error(w, "Invalid signature", http.StatusUnauthorized)
        return
    }

    var event map[string]interface{}
    json.Unmarshal(payload, &event)

    switch event["event"] {
    case "link.clicked":
        // Handle click event
    case "link.created":
        // Handle creation event
    }

    w.WriteHeader(http.StatusOK)
}
```

---

### List Webhooks

**Endpoint:** `GET /api/webhooks`

**cURL Example:**
```bash
curl -X GET https://go.shortedbro.xyz/api/webhooks \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "webhooks": [
    {
      "webhook_id": "wh_abc123",
      "url": "https://your-server.com/webhook",
      "name": "My Webhook",
      "events": ["link.clicked", "link.created"],
      "slug": null,
      "active": true,
      "last_triggered_at": "2025-01-15T10:30:00Z",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 1
}
```

---

### Delete Webhook

**Endpoint:** `DELETE /api/webhooks/{webhookId}`

**cURL Example:**
```bash
curl -X DELETE https://go.shortedbro.xyz/api/webhooks/wh_abc123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "message": "Webhook deleted successfully"
}
```

---

## Custom Domains

Use your own domain for short links (Pro feature, max 2 domains).

### Add Custom Domain

**Endpoint:** `POST /api/domains`

**Request Body:**
```json
{
  "domain": "links.yoursite.com"
}
```

**cURL Example:**
```bash
curl -X POST https://go.shortedbro.xyz/api/domains \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "domain": "go.mycompany.com"
  }'
```

**JavaScript Example:**
```javascript
async function addCustomDomain(domain) {
  const response = await fetch('https://go.shortedbro.xyz/api/domains', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ domain })
  });

  return response.json();
}

const result = await addCustomDomain('links.mysite.com');
console.log('Domain added:', result.domain_id);
console.log('Add this CNAME record:', result.cname_target);
```

**Response (201 Created):**
```json
{
  "domain_id": "dom_abc123",
  "domain": "links.yoursite.com",
  "status": "pending",
  "cname_target": "go.shortedbro.xyz",
  "message": "Domain added. Please add a CNAME record pointing to go.shortedbro.xyz"
}
```

---

### Verify Domain

**Endpoint:** `POST /api/domains/{domainId}/verify`

**cURL Example:**
```bash
curl -X POST https://go.shortedbro.xyz/api/domains/dom_abc123/verify \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "domain_id": "dom_abc123",
  "domain": "links.yoursite.com",
  "status": "verified",
  "message": "Domain verified successfully"
}
```

---

### List Domains

**Endpoint:** `GET /api/domains`

**cURL Example:**
```bash
curl -X GET https://go.shortedbro.xyz/api/domains \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "domains": [
    {
      "domain_id": "dom_abc123",
      "domain": "links.yoursite.com",
      "status": "verified",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 1,
  "max_domains": 2
}
```

---

### Delete Domain

**Endpoint:** `DELETE /api/domains/{domainId}`

**cURL Example:**
```bash
curl -X DELETE https://go.shortedbro.xyz/api/domains/dom_abc123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "message": "Domain deleted successfully"
}
```

---

## Link Groups

Organize your links into groups (Pro feature, max 20 groups).

### Create Group

**Endpoint:** `POST /api/groups`

**Request Body:**
```json
{
  "name": "Marketing Campaign Q1",
  "description": "Links for Q1 marketing campaigns",
  "color": "#3B82F6",
  "icon": "folder"
}
```

**cURL Example:**
```bash
curl -X POST https://go.shortedbro.xyz/api/groups \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Social Media Links",
    "description": "All social media campaign links",
    "color": "#10B981"
  }'
```

**JavaScript Example:**
```javascript
async function createGroup(name, options = {}) {
  const response = await fetch('https://go.shortedbro.xyz/api/groups', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      name,
      ...options
    })
  });

  return response.json();
}

// Create groups for different campaigns
const marketingGroup = await createGroup('Marketing 2025', {
  description: 'All marketing links for 2025',
  color: '#3B82F6'
});

const socialGroup = await createGroup('Social Media', {
  description: 'Twitter, LinkedIn, Instagram links',
  color: '#EC4899'
});

const productGroup = await createGroup('Product Links', {
  description: 'Product page links',
  color: '#10B981'
});
```

**Python Example:**
```python
import requests

def create_group(name, description=None, color='#3B82F6', icon='folder'):
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {access_token}'
    }

    data = {
        'name': name,
        'color': color,
        'icon': icon
    }

    if description:
        data['description'] = description

    response = requests.post(
        'https://go.shortedbro.xyz/api/groups',
        headers=headers,
        json=data
    )

    return response.json()

# Create group
result = create_group(
    'Email Campaigns',
    description='Links used in email newsletters',
    color='#F59E0B'
)
```

**Response (201 Created):**
```json
{
  "message": "Group created successfully",
  "group": {
    "group_id": "grp_abc123",
    "user_id": "usr_abc123",
    "name": "Marketing Campaign Q1",
    "description": "Links for Q1 marketing campaigns",
    "color": "#3B82F6",
    "icon": "folder",
    "created_at": "2025-01-15T10:30:00Z",
    "link_count": 0,
    "total_clicks": 0
  }
}
```

---

### List Groups

**Endpoint:** `GET /api/groups`

**cURL Example:**
```bash
curl -X GET https://go.shortedbro.xyz/api/groups \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**JavaScript Example:**
```javascript
async function getGroups() {
  const response = await fetch('https://go.shortedbro.xyz/api/groups', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  return response.json();
}

const { groups, ungrouped_count, max_groups } = await getGroups();

console.log(`You have ${groups.length}/${max_groups} groups`);
console.log(`${ungrouped_count} ungrouped links`);

groups.forEach(group => {
  console.log(`${group.name}: ${group.link_count} links, ${group.total_clicks} clicks`);
});
```

**Response (200 OK):**
```json
{
  "groups": [
    {
      "group_id": "grp_abc123",
      "name": "Marketing Campaign Q1",
      "description": "Links for Q1 marketing campaigns",
      "color": "#3B82F6",
      "icon": "folder",
      "link_count": 25,
      "total_clicks": 5000,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "ungrouped_count": 10,
  "ungrouped_clicks": 500,
  "max_groups": 20
}
```

---

### Get Group Details

**Endpoint:** `GET /api/groups/{groupId}`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number |
| limit | integer | 50 | Items per page (max 100) |

**cURL Example:**
```bash
curl -X GET "https://go.shortedbro.xyz/api/groups/grp_abc123?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "group": {
    "group_id": "grp_abc123",
    "name": "Marketing Campaign Q1",
    "description": "Links for Q1 marketing campaigns",
    "color": "#3B82F6",
    "icon": "folder"
  },
  "links": [
    {
      "slug": "abc123",
      "destination": "https://example.com",
      "click_count": 150,
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 25,
  "total_clicks": 5000,
  "page": 1,
  "limit": 20,
  "total_pages": 2
}
```

---

### Update Group

**Endpoint:** `PUT /api/groups/{groupId}`

**Request Body:**
```json
{
  "name": "Updated Group Name",
  "description": "Updated description",
  "color": "#EC4899"
}
```

**cURL Example:**
```bash
curl -X PUT https://go.shortedbro.xyz/api/groups/grp_abc123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Marketing Q1 2025",
    "color": "#8B5CF6"
  }'
```

**Response (200 OK):**
```json
{
  "message": "Group updated successfully",
  "group": {
    "group_id": "grp_abc123",
    "name": "Marketing Q1 2025",
    "color": "#8B5CF6"
  }
}
```

---

### Delete Group

Deleting a group moves all links in that group to ungrouped.

**Endpoint:** `DELETE /api/groups/{groupId}`

**cURL Example:**
```bash
curl -X DELETE https://go.shortedbro.xyz/api/groups/grp_abc123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "message": "Group deleted successfully",
  "links_moved": 25
}
```

---

### Add Links to Group

**Endpoint:** `POST /api/groups/{groupId}/links`

**Request Body:**
```json
{
  "slugs": ["link1", "link2", "link3"]
}
```

**cURL Example:**
```bash
curl -X POST https://go.shortedbro.xyz/api/groups/grp_abc123/links \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "slugs": ["campaign-1", "campaign-2", "promo-link"]
  }'
```

**JavaScript Example:**
```javascript
async function addLinksToGroup(groupId, slugs) {
  const response = await fetch(
    `https://go.shortedbro.xyz/api/groups/${groupId}/links`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ slugs })
    }
  );

  return response.json();
}

// Add multiple links to a group
await addLinksToGroup('grp_abc123', [
  'twitter-post',
  'linkedin-post',
  'facebook-ad'
]);
```

**Response (200 OK):**
```json
{
  "message": "Links added to group successfully",
  "added": 3
}
```

---

### Remove Links from Group

**Endpoint:** `DELETE /api/groups/{groupId}/links`

**Request Body:**
```json
{
  "slugs": ["link1", "link2"]
}
```

**cURL Example:**
```bash
curl -X DELETE https://go.shortedbro.xyz/api/groups/grp_abc123/links \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "slugs": ["old-link-1", "old-link-2"]
  }'
```

**Response (200 OK):**
```json
{
  "message": "Links removed from group successfully",
  "removed": 2
}
```

---

### Move Single Link to Group

**Endpoint:** `PUT /api/links/{slug}/group`

**Request Body:**
```json
{
  "group_id": "grp_abc123"
}
```

Set `group_id` to `null` to move to ungrouped.

**cURL Example:**
```bash
# Move to group
curl -X PUT https://go.shortedbro.xyz/api/links/my-link/group \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "group_id": "grp_abc123"
  }'

# Move to ungrouped
curl -X PUT https://go.shortedbro.xyz/api/links/my-link/group \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "group_id": null
  }'
```

**Response (200 OK):**
```json
{
  "message": "Link moved to group",
  "slug": "my-link",
  "group_id": "grp_abc123"
}
```

---

## API Keys

Generate API keys for programmatic access.

### Generate API Key

**Endpoint:** `POST /api/keys`

**Request Body:**
```json
{
  "name": "Production API Key",
  "expires_in_days": 365
}
```

**cURL Example:**
```bash
curl -X POST https://go.shortedbro.xyz/api/keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "CI/CD Pipeline Key",
    "expires_in_days": 90
  }'
```

**JavaScript Example:**
```javascript
async function createAPIKey(name, expiresInDays = 365) {
  const response = await fetch('https://go.shortedbro.xyz/api/keys', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      name,
      expires_in_days: expiresInDays
    })
  });

  return response.json();
}

const key = await createAPIKey('Production Key', 365);

// IMPORTANT: Save this key securely - it won't be shown again!
console.log('API Key:', key.api_key);
```

**Response (201 Created):**
```json
{
  "key_id": "key_abc123",
  "api_key": "elk_abc123...",
  "name": "Production API Key",
  "created_at": "2025-01-15T10:30:00Z",
  "expires_at": "2026-01-15T10:30:00Z",
  "message": "Save this API key securely. It will not be shown again."
}
```

---

### List API Keys

**Endpoint:** `GET /api/keys`

**cURL Example:**
```bash
curl -X GET https://go.shortedbro.xyz/api/keys \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "keys": [
    {
      "key_id": "key_abc123",
      "name": "Production API Key",
      "last_used_at": "2025-01-15T10:30:00Z",
      "created_at": "2025-01-01T00:00:00Z",
      "expires_at": "2026-01-01T00:00:00Z"
    }
  ],
  "total": 1,
  "max_keys": 5
}
```

---

### Revoke API Key

**Endpoint:** `DELETE /api/keys/{keyId}`

**cURL Example:**
```bash
curl -X DELETE https://go.shortedbro.xyz/api/keys/key_abc123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "message": "API key revoked successfully"
}
```

---

## User Management

### Get Profile

**Endpoint:** `GET /api/user/profile`

**cURL Example:**
```bash
curl -X GET https://go.shortedbro.xyz/api/user/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**
```json
{
  "user_id": "usr_abc123",
  "email": "user@example.com",
  "name": "John Doe",
  "plan": "pro",
  "email_verified": true,
  "created_at": "2024-06-15T00:00:00Z",
  "last_login_at": "2025-01-15T10:30:00Z"
}
```

---

### Update Profile

**Endpoint:** `PUT /api/user/profile`

**Request Body:**
```json
{
  "name": "New Name"
}
```

**cURL Example:**
```bash
curl -X PUT https://go.shortedbro.xyz/api/user/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "John Smith"
  }'
```

**Response (200 OK):**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "user_id": "usr_abc123",
    "name": "John Smith"
  }
}
```

---

### Export User Data (GDPR)

Export all your data in a downloadable format.

**Endpoint:** `GET /api/user/export`

**cURL Example:**
```bash
curl -X GET https://go.shortedbro.xyz/api/user/export \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o my-data.json
```

**Response (200 OK):**
Returns JSON file with all user data including links, analytics, webhooks, etc.

---

### Delete Account

**Request Deletion:**
```bash
curl -X POST https://go.shortedbro.xyz/api/user/request-deletion \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Cancel Deletion:**
```bash
curl -X POST https://go.shortedbro.xyz/api/user/cancel-deletion \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Immediate Deletion:**
```bash
curl -X POST https://go.shortedbro.xyz/api/user/delete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "confirm": true
  }'
```

---

## Bulk Operations

### Import Links (CSV)

**Endpoint:** `POST /api/import/links`

**Request:** multipart/form-data with CSV file

CSV Format:
```csv
url,custom_slug,expires_at
https://example.com/page1,page1,2025-12-31
https://example.com/page2,page2,
https://example.com/page3,,
```

**cURL Example:**
```bash
curl -X POST https://go.shortedbro.xyz/api/import/links \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@links.csv"
```

**JavaScript Example:**
```javascript
async function importLinks(csvFile) {
  const formData = new FormData();
  formData.append('file', csvFile);

  const response = await fetch('https://go.shortedbro.xyz/api/import/links', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    body: formData
  });

  return response.json();
}

// From file input
const fileInput = document.getElementById('csv-file');
const result = await importLinks(fileInput.files[0]);
console.log(`Imported: ${result.imported}, Failed: ${result.failed}`);
```

**Response (200 OK):**
```json
{
  "message": "Import completed",
  "imported": 95,
  "failed": 5,
  "errors": [
    { "row": 3, "error": "Invalid URL" },
    { "row": 7, "error": "Slug already exists" }
  ]
}
```

---

### Export Links

**Endpoint:** `GET /api/export/links`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| format | string | csv or json (default: csv) |

**cURL Example:**
```bash
# Export as CSV
curl -X GET "https://go.shortedbro.xyz/api/export/links?format=csv" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o links.csv

# Export as JSON
curl -X GET "https://go.shortedbro.xyz/api/export/links?format=json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o links.json
```

---

## Error Codes

All API errors follow a consistent format:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|------------|-------------|
| `INVALID_INPUT` | 400 | Request body validation failed |
| `INVALID_URL` | 400 | URL format is invalid |
| `INVALID_EMAIL` | 400 | Email format is invalid |
| `INVALID_PASSWORD` | 400 | Password doesn't meet requirements |
| `INVALID_SLUG_FORMAT` | 400 | Custom slug format is invalid |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `INVALID_TOKEN` | 401 | JWT or refresh token is invalid |
| `TOKEN_EXPIRED` | 401 | Token has expired |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Access denied |
| `PRO_FEATURE_REQUIRED` | 403 | Feature requires Pro plan |
| `LINK_LIMIT_REACHED` | 403 | Maximum links reached for plan |
| `GROUP_LIMIT_REACHED` | 403 | Maximum groups reached |
| `WEBHOOK_LIMIT_EXCEEDED` | 400 | Maximum webhooks reached |
| `NOT_FOUND` | 404 | Resource not found |
| `EMAIL_EXISTS` | 409 | Email already registered |
| `SLUG_TAKEN` | 409 | Custom slug already in use |
| `DUPLICATE_NAME` | 400 | Group name already exists |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

### Error Response Examples

**400 Bad Request:**
```json
{
  "error": "Invalid URL. Must be HTTP/HTTPS and less than 2,048 characters.",
  "code": "INVALID_URL"
}
```

**401 Unauthorized:**
```json
{
  "error": "Invalid email or password",
  "code": "INVALID_CREDENTIALS"
}
```

**403 Forbidden:**
```json
{
  "error": "Device routing is a Pro feature. Upgrade to use it.",
  "code": "PRO_FEATURE_REQUIRED"
}
```

**404 Not Found:**
```json
{
  "error": "Link not found or access denied",
  "code": "NOT_FOUND"
}
```

**429 Rate Limited:**
```json
{
  "error": "Rate limit exceeded. Please try again later.",
  "code": "RATE_LIMITED"
}
```

---

## SDK Examples

### Complete JavaScript/TypeScript SDK

```javascript
class ShortedBroClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://go.shortedbro.xyz';
  }

  async request(method, path, data = null) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${this.baseUrl}${path}`, options);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Request failed');
    }

    return result;
  }

  // Links
  async createLink(url, options = {}) {
    return this.request('POST', '/api/shorten', { url, ...options });
  }

  async getLinks(options = {}) {
    const params = new URLSearchParams(options);
    return this.request('GET', `/api/links?${params}`);
  }

  async updateLink(slug, updates) {
    return this.request('PUT', `/api/links/${slug}`, updates);
  }

  async deleteLink(slug) {
    return this.request('DELETE', `/api/links/${slug}`);
  }

  // Analytics
  async getAnalytics(slug, timeRange = '7d') {
    return this.request('GET', `/api/analytics/${slug}?timeRange=${timeRange}`);
  }

  async getSummary() {
    return this.request('GET', '/api/analytics/summary');
  }

  // Groups
  async createGroup(name, options = {}) {
    return this.request('POST', '/api/groups', { name, ...options });
  }

  async getGroups() {
    return this.request('GET', '/api/groups');
  }

  async addToGroup(groupId, slugs) {
    return this.request('POST', `/api/groups/${groupId}/links`, { slugs });
  }

  // Routing
  async setDeviceRouting(slug, routes) {
    return this.request('POST', `/api/links/${slug}/routing/device`, routes);
  }

  async setGeoRouting(slug, routes) {
    return this.request('POST', `/api/links/${slug}/routing/geo`, { routes });
  }

  // Webhooks
  async createWebhook(url, name, events, slug = null) {
    return this.request('POST', '/api/webhooks', { url, name, events, slug });
  }

  async getWebhooks() {
    return this.request('GET', '/api/webhooks');
  }
}

// Usage
const client = new ShortedBroClient('elk_your_api_key');

// Create a link
const link = await client.createLink('https://example.com/my-page', {
  custom_slug: 'my-page'
});

// Get analytics
const analytics = await client.getAnalytics('my-page', '30d');

// Set up geographic routing
await client.setGeoRouting('my-page', {
  'US': 'https://us.example.com',
  'EU': 'https://eu.example.com',
  'default': 'https://example.com'
});
```

---

### Complete Python SDK

```python
import requests
from typing import Optional, List, Dict, Any

class ShortedBroClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = 'https://go.shortedbro.xyz'
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'X-API-Key': api_key
        })

    def _request(self, method: str, path: str, data: Dict = None, params: Dict = None):
        url = f'{self.base_url}{path}'
        response = self.session.request(method, url, json=data, params=params)
        result = response.json()

        if not response.ok:
            raise Exception(result.get('error', 'Request failed'))

        return result

    # Links
    def create_link(self, url: str, **options) -> Dict:
        return self._request('POST', '/api/shorten', {'url': url, **options})

    def get_links(self, page: int = 1, limit: int = 50,
                  search: str = None, search_field: str = None) -> Dict:
        params = {'page': page, 'limit': limit}
        if search:
            params['search'] = search
        if search_field:
            params['searchField'] = search_field
        return self._request('GET', '/api/links', params=params)

    def update_link(self, slug: str, **updates) -> Dict:
        return self._request('PUT', f'/api/links/{slug}', updates)

    def delete_link(self, slug: str) -> Dict:
        return self._request('DELETE', f'/api/links/{slug}')

    # Analytics
    def get_analytics(self, slug: str, time_range: str = '7d') -> Dict:
        return self._request('GET', f'/api/analytics/{slug}',
                            params={'timeRange': time_range})

    def get_summary(self) -> Dict:
        return self._request('GET', '/api/analytics/summary')

    # Groups
    def create_group(self, name: str, **options) -> Dict:
        return self._request('POST', '/api/groups', {'name': name, **options})

    def get_groups(self) -> Dict:
        return self._request('GET', '/api/groups')

    def add_to_group(self, group_id: str, slugs: List[str]) -> Dict:
        return self._request('POST', f'/api/groups/{group_id}/links',
                            {'slugs': slugs})

    # Routing
    def set_device_routing(self, slug: str,
                          mobile: str = None,
                          tablet: str = None,
                          desktop: str = None) -> Dict:
        routes = {}
        if mobile:
            routes['mobile'] = mobile
        if tablet:
            routes['tablet'] = tablet
        if desktop:
            routes['desktop'] = desktop
        return self._request('POST', f'/api/links/{slug}/routing/device', routes)

    def set_geo_routing(self, slug: str, routes: Dict[str, str]) -> Dict:
        return self._request('POST', f'/api/links/{slug}/routing/geo',
                            {'routes': routes})

    # Webhooks
    def create_webhook(self, url: str, name: str,
                      events: List[str], slug: str = None) -> Dict:
        data = {'url': url, 'name': name, 'events': events}
        if slug:
            data['slug'] = slug
        return self._request('POST', '/api/webhooks', data)

    def get_webhooks(self) -> Dict:
        return self._request('GET', '/api/webhooks')


# Usage
client = ShortedBroClient('elk_your_api_key')

# Create a link
link = client.create_link('https://example.com/my-page',
                          custom_slug='my-page')
print(f"Short URL: {link['short_url']}")

# Get analytics
analytics = client.get_analytics('my-page', '30d')
print(f"Total clicks: {analytics['total_clicks']}")

# Create a group and add links
group = client.create_group('Marketing', color='#3B82F6')
client.add_to_group(group['group']['group_id'], ['my-page', 'other-link'])

# Set up geographic routing
client.set_geo_routing('my-page', {
    'US': 'https://us.example.com',
    'GB': 'https://uk.example.com',
    'default': 'https://example.com'
})

# Create webhook
webhook = client.create_webhook(
    'https://api.myserver.com/webhook',
    'Click Tracker',
    ['link.clicked']
)
print(f"Webhook secret: {webhook['secret']}")
```

---

## Support

For questions or issues:

- **Documentation:** https://shortedbro.xyz/docs
- **Email:** support@shortedbro.xyz

---

*Last updated: November 2025*
