# EdgeLink API Documentation

**Version:** 1.0.0
**Base URL:** `https://edgelink-production.quoteviral.workers.dev`
**Last Updated:** November 11, 2025

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [Core API Endpoints (FR-7)](#core-api-endpoints-fr-7)
5. [Smart Routing Features](#smart-routing-features)
   - [Device-Based Routing (FR-9)](#device-based-routing-fr-9)
   - [Geographic Routing (FR-10)](#geographic-routing-fr-10)
   - [Referrer-Based Routing (FR-11)](#referrer-based-routing-fr-11)
6. [Analytics](#analytics)
7. [Error Codes](#error-codes)
8. [Code Examples](#code-examples)

---

## Overview

EdgeLink is a developer-first URL shortener built on Cloudflare Workers Edge. It provides lightning-fast redirects (<50ms p95), advanced routing capabilities, and comprehensive analytics.

**Key Features:**
- ✅ Anonymous and authenticated link creation
- ✅ Custom slugs and domains
- ✅ Device, geographic, and referrer-based routing
- ✅ Password protection and expiration
- ✅ QR code generation
- ✅ Real-time analytics
- ✅ A/B testing
- ✅ Webhooks and API keys

---

## Authentication

EdgeLink supports two authentication methods:
1. **JWT Tokens** - Short-lived (24 hours), for user sessions
2. **API Keys** - Long-lived (up to 1 year), for programmatic access

Both use the same `Authorization: Bearer <token>` header format.

### Method 1: JWT Token Authentication

#### Signup

Create a new user account.

**Endpoint:** `POST /auth/signup`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "plan": "free"
}
```

**Response (201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "user_id": "usr_abc123",
    "email": "user@example.com",
    "plan": "free",
    "created_at": "2025-11-11T10:00:00.000Z"
  }
}
```

#### Login

Authenticate and receive JWT token.

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "user_id": "usr_abc123",
    "email": "user@example.com",
    "plan": "free"
  }
}
```

**Using JWT Tokens:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Expiration:** JWT tokens expire after 24 hours. Use the `/auth/refresh` endpoint to get a new token.

---

### Method 2: API Key Authentication (Recommended for Scripts)

API keys are ideal for:
- Automation scripts
- CI/CD pipelines
- Long-running integrations
- Server-to-server communication

#### Generate API Key

**Endpoint:** `POST /api/keys`

**Authentication:** JWT token required

**Request Body:**
```json
{
  "name": "My Python Script",
  "expires_in_days": 365
}
```

**Response (201):**
```json
{
  "key_id": "key_abc123xyz",
  "api_key": "elk_98z7n3wCDv36mmyvuTpmqxRXaERJHulr",
  "key_prefix": "elk_98z7n3w",
  "name": "My Python Script",
  "created_at": "2025-11-11T10:00:00.000Z",
  "expires_at": "2026-11-11T10:00:00.000Z",
  "warning": "Save this API key now. You will not be able to see it again!",
  "usage": {
    "header": "Authorization: Bearer elk_98z7n3wCDv36mmyvuTpmqxRXaERJHulr",
    "example": "curl -H \"Authorization: Bearer elk_98z7n3wCDv36mmyvuTpmqxRXaERJHulr\" https://api.edgelink.io/api/shorten"
  }
}
```

**Important:** Save the `api_key` immediately - it will only be shown once!

#### Using API Keys

```
Authorization: Bearer elk_98z7n3wCDv36mmyvuTpmqxRXaERJHulr
```

**Format:** API keys always start with `elk_` followed by 32 alphanumeric characters.

**Example:**
```bash
curl -X GET https://edgelink-production.quoteviral.workers.dev/api/links \
  -H "Authorization: Bearer elk_98z7n3wCDv36mmyvuTpmqxRXaERJHulr"
```

#### List API Keys

**Endpoint:** `GET /api/keys`

Shows all your API keys (only prefixes, not full keys):

```json
{
  "keys": [
    {
      "key_id": "key_abc123xyz",
      "key_prefix": "elk_98z7n3w",
      "name": "My Python Script",
      "last_used_at": "2025-11-11T10:00:00.000Z",
      "created_at": "2025-11-10T10:00:00.000Z",
      "expires_at": "2026-11-11T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

#### Revoke API Key

**Endpoint:** `DELETE /api/keys/{key_id}`

Immediately invalidates an API key.

---

### Authentication Priority

When a request includes an `Authorization` header, the system checks in this order:

1. **API Key** - If token starts with `elk_`, validate as API key
2. **JWT Token** - If not an API key, validate as JWT
3. **Anonymous** - If no header, treat as anonymous (limited access)

---

## Rate Limiting

EdgeLink enforces rate limits based on your plan:

| Plan | Rate Limit | Period |
|------|-----------|--------|
| **Anonymous** | 10 requests | Per hour |
| **Free** | 1,000 requests | Per day |
| **Pro** | 10,000 requests | Per day |

### Rate Limit Headers

All API responses include rate limit information:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1699564800
```

### Rate Limit Exceeded (429)

```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "limit": 1000,
  "remaining": 0,
  "resetAfter": 3600
}
```

**Header:** `Retry-After: 3600`

---

## Core API Endpoints (FR-7)

### 1. Create Short Link

Create a new shortened URL (anonymous or authenticated).

**Endpoint:** `POST /api/shorten`

**Authentication:** Optional (authenticated users get more features)

**Request Body:**
```json
{
  "url": "https://example.com/very-long-url",
  "custom_slug": "my-link",
  "custom_domain": "short.yourdomain.com",
  "expires_at": "2025-12-31T23:59:59Z",
  "max_clicks": 1000,
  "password": "secret123",
  "utm_template": "utm_source=twitter&utm_medium=social"
}
```

**Parameters:**
- `url` (required): The destination URL (max 2,048 characters)
- `custom_slug` (optional): Custom short code (5-20 alphanumeric + dashes)
- `custom_domain` (optional): Your verified custom domain
- `expires_at` (optional): ISO 8601 expiration date
- `max_clicks` (optional): Maximum number of clicks before expiration
- `password` (optional, Pro only): Password protection
- `utm_template` (optional): UTM parameters to append

**Response (201):**
```json
{
  "slug": "abc123",
  "short_url": "https://edgelink-production.quoteviral.workers.dev/abc123",
  "expires_in": 2592000,
  "qr_code_url": "https://edgelink-production.quoteviral.workers.dev/api/links/abc123/qr"
}
```

**Anonymous Links:**
- Expire in 30 days
- No QR codes
- No advanced features

---

### 2. List User's Links

Retrieve all links for authenticated user with pagination and search.

**Endpoint:** `GET /api/links`

**Authentication:** Required

**Query Parameters:**
- `page` (default: 1): Page number
- `limit` (default: 50, max: 100): Results per page
- `search` (optional): Search query
- `searchField` (optional): `slug`, `destination`, `date`, or `all`

**Example Request:**
```
GET /api/links?page=1&limit=20&search=example&searchField=destination
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response (200):**
```json
{
  "links": [
    {
      "slug": "abc123",
      "destination": "https://example.com",
      "custom_domain": null,
      "created_at": "2025-11-11T10:00:00.000Z",
      "updated_at": "2025-11-11T10:00:00.000Z",
      "expires_at": null,
      "max_clicks": null,
      "click_count": 42,
      "password_protected": false,
      "device_routing": null,
      "geo_routing": null,
      "referrer_routing": null,
      "ab_testing": null,
      "utm_params": null
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

---

### 3. Get Link Statistics

Get basic statistics for a specific link.

**Endpoint:** `GET /api/stats/{slug}`

**Authentication:** Required

**Example Request:**
```
GET /api/stats/abc123
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response (200):**
```json
{
  "slug": "abc123",
  "total_clicks": 1234,
  "created_at": "2025-11-11T10:00:00.000Z",
  "analytics": {
    "message": "Use /api/analytics/abc123 for detailed analytics"
  }
}
```

---

### 4. Update Link

Update link destination and configuration.

**Endpoint:** `PUT /api/links/{slug}`

**Authentication:** Required

**Request Body:**
```json
{
  "destination": "https://newdestination.com",
  "new_slug": "updated-slug",
  "expires_at": "2025-12-31T23:59:59Z",
  "max_clicks": 5000,
  "password": "newpassword",
  "utm_params": "utm_source=newsletter"
}
```

**Parameters:**
- `destination` (required): New destination URL
- `new_slug` (optional, Pro only): Change the short code
- `expires_at` (optional): Update expiration
- `max_clicks` (optional): Update click limit
- `password` (optional, Pro only): Set/update password
- `utm_params` (optional): Update UTM template

**Response (200):**
```json
{
  "message": "Link updated successfully",
  "slug": "updated-slug",
  "slug_changed": true,
  "old_slug": "abc123"
}
```

**Important Notes:**
- Changing slug is a Pro feature
- All click counts and analytics are preserved
- KV cache is automatically updated

---

### 5. Delete Link

Permanently delete a link.

**Endpoint:** `DELETE /api/links/{slug}`

**Authentication:** Required

**Example Request:**
```
DELETE /api/links/abc123
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response (200):**
```json
{
  "message": "Link deleted successfully"
}
```

**Note:** This action is irreversible. All analytics data will be retained for 90 days.

---

## Smart Routing Features

### Device-Based Routing (FR-9)

Route users to different URLs based on their device type (mobile, tablet, or desktop).

**Feature:** Pro Only
**Detection:** User-Agent header parsing

**Endpoint:** `POST /api/links/{slug}/routing/device`

**Authentication:** Required (Pro plan)

**Request Body:**
```json
{
  "mobile": "https://m.example.com",
  "tablet": "https://tablet.example.com",
  "desktop": "https://www.example.com"
}
```

**Detection Rules:**
- **Mobile:** `/Mobile|Android|iPhone/i` regex on User-Agent
- **Tablet:** `/iPad|Tablet/i` regex on User-Agent
- **Desktop:** All other devices (default)

**Response (200):**
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

**Example Request:**
```bash
curl -X POST https://edgelink-production.quoteviral.workers.dev/api/links/abc123/routing/device \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mobile": "https://m.example.com/product",
    "tablet": "https://tablet.example.com/product",
    "desktop": "https://www.example.com/product"
  }'
```

**Analytics Tracking:**
- Device type is tracked for every click
- Available in analytics dashboard
- Breakdown by mobile/tablet/desktop percentages

**Error Response (403 - Non-Pro User):**
```json
{
  "error": "Device routing is a Pro feature",
  "code": "PRO_FEATURE_REQUIRED"
}
```

**Error Response (400 - Redirect Loop):**
```json
{
  "error": "Mobile URL cannot contain your short link (/abc123). This would create a redirect loop. Please use only destination URLs.",
  "code": "REDIRECT_LOOP_DETECTED"
}
```

---

### Geographic Routing (FR-10)

Route users to different URLs based on their country.

**Feature:** Pro Only
**Detection:** Cloudflare `cf-ipcountry` header (ISO 3166-1 alpha-2 codes)

**Endpoint:** `POST /api/links/{slug}/routing/geo`

**Authentication:** Required (Pro plan)

**Request Body:**
```json
{
  "routes": {
    "US": "https://example.com/us",
    "GB": "https://example.com/uk",
    "DE": "https://example.com/de",
    "FR": "https://example.com/fr",
    "IN": "https://example.com/in",
    "default": "https://example.com"
  }
}
```

**Country Code Examples:**
- `US` - United States
- `GB` - United Kingdom
- `DE` - Germany
- `FR` - France
- `IN` - India
- `CA` - Canada
- `AU` - Australia
- `JP` - Japan
- `CN` - China
- `BR` - Brazil

**Response (200):**
```json
{
  "message": "Geographic routing configured successfully",
  "slug": "abc123",
  "geo_routing": {
    "US": "https://example.com/us",
    "GB": "https://example.com/uk",
    "default": "https://example.com"
  }
}
```

**Example Request:**
```bash
curl -X POST https://edgelink-production.quoteviral.workers.dev/api/links/abc123/routing/geo \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "routes": {
      "US": "https://shop.example.com/us",
      "GB": "https://shop.example.com/uk",
      "EU": "https://shop.example.com/eu",
      "default": "https://shop.example.com/international"
    }
  }'
```

**How It Works:**
1. User clicks short link
2. Cloudflare provides country code via `cf-ipcountry` header
3. System matches country code to configured routes
4. If no match, uses `default` route
5. If no `default`, uses original destination

**Analytics Tracking:**
- Country and city tracked for every click
- Top countries report
- Geographic heatmap data

**Performance:**
- Zero latency (uses Cloudflare header, no external API)
- Supports 195+ countries
- Instant routing at edge locations worldwide

**Error Response (403 - Non-Pro User):**
```json
{
  "error": "Geographic routing is a Pro feature",
  "code": "PRO_FEATURE_REQUIRED"
}
```

---

### Referrer-Based Routing (FR-11)

Route users to different URLs based on the HTTP Referrer header (traffic source).

**Feature:** Pro Only
**Detection:** HTTP `Referer` header domain matching

**Endpoint:** `POST /api/links/{slug}/routing/referrer`

**Authentication:** Required (Pro plan)

**Request Body:**
```json
{
  "routes": {
    "twitter.com": "https://example.com/twitter",
    "linkedin.com": "https://example.com/linkedin",
    "facebook.com": "https://example.com/facebook",
    "reddit.com": "https://example.com/reddit",
    "default": "https://example.com/direct"
  }
}
```

**Response (200):**
```json
{
  "message": "Referrer-based routing configured successfully",
  "slug": "abc123",
  "referrer_routing": {
    "twitter.com": "https://example.com/twitter",
    "linkedin.com": "https://example.com/linkedin",
    "default": "https://example.com/direct"
  }
}
```

**Example Request:**
```bash
curl -X POST https://edgelink-production.quoteviral.workers.dev/api/links/abc123/routing/referrer \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "routes": {
      "twitter.com": "https://landing.example.com?source=twitter",
      "linkedin.com": "https://landing.example.com?source=linkedin",
      "facebook.com": "https://landing.example.com?source=facebook",
      "default": "https://landing.example.com?source=direct"
    }
  }'
```

**Supported Referrer Domains:**
- Social: `twitter.com`, `linkedin.com`, `facebook.com`, `instagram.com`
- Search: `google.com`, `bing.com`, `yahoo.com`
- Forums: `reddit.com`, `hackernews.com`
- Messaging: `t.me` (Telegram), `wa.me` (WhatsApp)
- Any custom domain

**How It Works:**
1. User clicks short link from a website
2. Browser sends `Referer` header with source URL
3. System extracts domain (e.g., `twitter.com` from `https://twitter.com/user/status/123`)
4. Matches domain against configured routes
5. If no match, uses `default` route
6. Direct traffic (no referrer) also uses `default`

**Domain Matching:**
- Substring matching: `twitter.com` matches `twitter.com`, `mobile.twitter.com`, `x.com` redirect
- Case-insensitive
- Protocol-agnostic (http/https)

**Analytics Tracking:**
- Top referrers report
- Referrer breakdown by domain
- Direct vs. referral traffic ratio

**Validation:**
- Referrer keys must be domain names only (not full URLs)
- Invalid: `https://twitter.com` (includes protocol)
- Valid: `twitter.com` (domain only)

**Error Response (400 - Invalid Domain Format):**
```json
{
  "error": "Referrer keys should be domain names only (e.g., 'twitter.com'), not full URLs",
  "code": "INVALID_INPUT"
}
```

---

### Get All Routing Configuration

Retrieve all routing rules for a link.

**Endpoint:** `GET /api/links/{slug}/routing`

**Authentication:** Required

**Example Request:**
```
GET /api/links/abc123/routing
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response (200):**
```json
{
  "slug": "abc123",
  "destination": "https://example.com",
  "routing": {
    "device": {
      "mobile": "https://m.example.com",
      "tablet": "https://tablet.example.com",
      "desktop": "https://www.example.com"
    },
    "geo": {
      "US": "https://example.com/us",
      "GB": "https://example.com/uk",
      "default": "https://example.com"
    },
    "time": null,
    "referrer": {
      "twitter.com": "https://example.com/twitter",
      "default": "https://example.com/direct"
    }
  }
}
```

---

### Delete All Routing Rules

Remove all routing configuration from a link.

**Endpoint:** `DELETE /api/links/{slug}/routing`

**Authentication:** Required

**Example Request:**
```
DELETE /api/links/abc123/routing
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response (200):**
```json
{
  "message": "All routing rules removed successfully",
  "slug": "abc123"
}
```

---

## Analytics

### Get Detailed Analytics

Get comprehensive analytics for a specific link.

**Endpoint:** `GET /api/analytics/{slug}`

**Authentication:** Required

**Query Parameters:**
- `range` (optional): `7d` (default) or `30d`

**Example Request:**
```
GET /api/analytics/abc123?range=30d
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response (200):**
```json
{
  "slug": "abc123",
  "total_clicks": 5432,
  "unique_visitors": 3210,
  "time_range": "30d",
  "breakdown": {
    "devices": {
      "mobile": 2716,
      "desktop": 2170,
      "tablet": 546
    },
    "countries": {
      "US": 1630,
      "GB": 815,
      "IN": 543,
      "DE": 435
    },
    "referrers": {
      "twitter.com": 1086,
      "direct": 978,
      "linkedin.com": 652
    },
    "browsers": {
      "Chrome": 3259,
      "Safari": 1086,
      "Firefox": 543
    }
  },
  "timeline": [
    {
      "date": "2025-11-11",
      "clicks": 187
    }
  ]
}
```

---

### Get Analytics Summary

Get overview of all links' performance.

**Endpoint:** `GET /api/analytics/summary`

**Authentication:** Required

**Response (200):**
```json
{
  "total_links": 150,
  "total_clicks": 125000,
  "total_unique_visitors": 87500,
  "clicks_today": 3421,
  "clicks_this_week": 18765,
  "clicks_this_month": 54321,
  "top_links": [
    {
      "slug": "abc123",
      "clicks": 5432,
      "destination": "https://example.com"
    }
  ]
}
```

---

### Export Analytics

Export analytics data in CSV or JSON format.

**Endpoint:** `GET /api/export/analytics/{slug}`

**Authentication:** Required

**Query Parameters:**
- `format` (optional): `json` (default) or `csv`
- `range` (optional): `7d`, `30d`, `90d`, or `all`

**Example Request:**
```
GET /api/export/analytics/abc123?format=csv&range=30d
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response (200 - CSV):**
```csv
timestamp,device,country,city,referrer,browser,os
2025-11-11T10:00:00.000Z,mobile,US,New York,twitter.com,Chrome,iOS
2025-11-11T10:01:23.000Z,desktop,GB,London,direct,Firefox,Windows
```

---

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `INVALID_URL` | 400 | URL is malformed or exceeds 2,048 characters |
| `INVALID_INPUT` | 400 | Request body validation failed |
| `INVALID_SLUG_FORMAT` | 400 | Slug format invalid (5-20 alphanumeric + dashes) |
| `SLUG_TAKEN` | 409 | Custom slug already in use |
| `REDIRECT_LOOP_DETECTED` | 400 | URL would create infinite redirect loop |
| `UNAUTHORIZED` | 401 | Missing or invalid JWT token |
| `NOT_FOUND` | 404 | Link not found or access denied |
| `PRO_FEATURE_REQUIRED` | 403 | Feature requires Pro plan upgrade |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit reached, retry after reset |
| `SHORTEN_FAILED` | 500 | Internal error creating link |
| `UPDATE_FAILED` | 500 | Internal error updating link |
| `DELETE_FAILED` | 500 | Internal error deleting link |

---

## Code Examples

### JavaScript/Node.js

```javascript
// Create short link
const response = await fetch('https://edgelink-production.quoteviral.workers.dev/api/shorten', {
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
console.log(data.short_url);
// Output: https://edgelink-production.quoteviral.workers.dev/my-link
```

### Python

```python
import requests

# Create short link with device routing
url = "https://edgelink-production.quoteviral.workers.dev/api/shorten"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_JWT_TOKEN"
}
payload = {
    "url": "https://example.com/product",
    "custom_slug": "product-launch"
}

response = requests.post(url, json=payload, headers=headers)
data = response.json()

# Configure device routing
slug = data["slug"]
routing_url = f"https://edgelink-production.quoteviral.workers.dev/api/links/{slug}/routing/device"
routing_payload = {
    "mobile": "https://m.example.com/product",
    "desktop": "https://www.example.com/product"
}

routing_response = requests.post(routing_url, json=routing_payload, headers=headers)
print(routing_response.json())
```

### cURL

```bash
# Create short link
curl -X POST https://edgelink-production.quoteviral.workers.dev/api/shorten \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "url": "https://example.com/page",
    "custom_slug": "my-page"
  }'

# Configure geographic routing
curl -X POST https://edgelink-production.quoteviral.workers.dev/api/links/my-page/routing/geo \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "routes": {
      "US": "https://example.com/us",
      "GB": "https://example.com/uk",
      "default": "https://example.com"
    }
  }'

# Get analytics
curl -X GET "https://edgelink-production.quoteviral.workers.dev/api/analytics/my-page?range=30d" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### PHP

```php
<?php

// Create short link
$url = 'https://edgelink-production.quoteviral.workers.dev/api/shorten';
$data = [
    'url' => 'https://example.com/article',
    'custom_slug' => 'article-2025'
];

$options = [
    'http' => [
        'header'  => [
            "Content-Type: application/json",
            "Authorization: Bearer YOUR_JWT_TOKEN"
        ],
        'method'  => 'POST',
        'content' => json_encode($data)
    ]
];

$context  = stream_context_create($options);
$result = file_get_contents($url, false, $context);
$response = json_decode($result, true);

echo $response['short_url'];
// Output: https://edgelink-production.quoteviral.workers.dev/article-2025
?>
```

### Go

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
)

func main() {
    // Create short link
    payload := map[string]interface{}{
        "url": "https://example.com/docs",
        "custom_slug": "docs",
    }

    jsonData, _ := json.Marshal(payload)

    req, _ := http.NewRequest("POST",
        "https://edgelink-production.quoteviral.workers.dev/api/shorten",
        bytes.NewBuffer(jsonData))

    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer YOUR_JWT_TOKEN")

    client := &http.Client{}
    resp, _ := client.Do(req)
    defer resp.Body.Close()

    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)

    fmt.Println(result["short_url"])
}
```

---

## Additional Features

### QR Code Generation (Pro Only)

**Endpoint:** `GET /api/links/{slug}/qr`

**Query Parameters:**
- `format` (optional): `svg` (default) or `png`

```bash
curl -X GET "https://edgelink-production.quoteviral.workers.dev/api/links/abc123/qr?format=svg" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -o qrcode.svg
```

### Custom Domains

**Add Domain:** `POST /api/domains`
**Verify Domain:** `POST /api/domains/{domainId}/verify`
**List Domains:** `GET /api/domains`
**Delete Domain:** `DELETE /api/domains/{domainId}`

### API Keys

**Generate Key:** `POST /api/keys`
**List Keys:** `GET /api/keys`
**Revoke Key:** `DELETE /api/keys/{keyId}`

### Webhooks (Pro Only)

**Create Webhook:** `POST /api/webhooks`
**List Webhooks:** `GET /api/webhooks`
**Delete Webhook:** `DELETE /api/webhooks/{webhookId}`

---

## Redirect Chain Priority

When multiple routing rules are configured, EdgeLink follows this priority:

1. **A/B Testing** (highest priority)
2. **Time-based Routing**
3. **Device-based Routing** ← FR-9
4. **Geographic Routing** ← FR-10
5. **Referrer-based Routing** ← FR-11
6. **Default Destination** (fallback)

**Example:** If a link has both device routing and geo routing configured:
1. Check device type (mobile/tablet/desktop)
2. If device routing exists for this device → use it
3. Otherwise, check country
4. If geo routing exists for this country → use it
5. Otherwise, use default destination

---

## Support and Resources

- **Documentation:** https://docs.edgelink.dev
- **API Status:** https://status.edgelink.dev
- **GitHub:** https://github.com/yourusername/edgelink
- **Support:** support@edgelink.dev

---

**Last Updated:** November 11, 2025
**API Version:** 1.0.0
**Server Location:** Global (Cloudflare Edge Network)
