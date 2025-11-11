# EdgeLink API Quick Reference

**Base URL:** `https://edgelink-production.quoteviral.workers.dev`

## Authentication

```bash
# Signup
POST /auth/signup
{"email": "user@example.com", "password": "pass", "plan": "free"}

# Login
POST /auth/login
{"email": "user@example.com", "password": "pass"}

# Use token in all authenticated requests
Authorization: Bearer YOUR_JWT_TOKEN
```

## Core API (FR-7)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/shorten` | POST | Optional | Create short link |
| `/api/links` | GET | Required | List user's links |
| `/api/links/{slug}` | PUT | Required | Update link |
| `/api/links/{slug}` | DELETE | Required | Delete link |
| `/api/stats/{slug}` | GET | Required | Get basic stats |

## Smart Routing (Pro Only)

| Endpoint | Method | Feature | Description |
|----------|--------|---------|-------------|
| `/api/links/{slug}/routing/device` | POST | FR-9 | Device-based routing |
| `/api/links/{slug}/routing/geo` | POST | FR-10 | Geographic routing |
| `/api/links/{slug}/routing/referrer` | POST | FR-11 | Referrer-based routing |
| `/api/links/{slug}/routing` | GET | - | Get all routing config |
| `/api/links/{slug}/routing` | DELETE | - | Delete all routing |

## Rate Limits

- **Anonymous:** 10/hour
- **Free:** 1,000/day
- **Pro:** 10,000/day

## Quick Examples

### Create Link (Anonymous)
```bash
curl -X POST https://edgelink-production.quoteviral.workers.dev/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

### Create Link (Authenticated)
```bash
curl -X POST https://edgelink-production.quoteviral.workers.dev/api/shorten \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "url": "https://example.com/page",
    "custom_slug": "my-page",
    "expires_at": "2025-12-31T23:59:59Z"
  }'
```

### Device Routing (Pro)
```bash
curl -X POST https://edgelink-production.quoteviral.workers.dev/api/links/my-slug/routing/device \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "mobile": "https://m.example.com",
    "tablet": "https://tablet.example.com",
    "desktop": "https://www.example.com"
  }'
```

### Geographic Routing (Pro)
```bash
curl -X POST https://edgelink-production.quoteviral.workers.dev/api/links/my-slug/routing/geo \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "routes": {
      "US": "https://example.com/us",
      "GB": "https://example.com/uk",
      "IN": "https://example.com/in",
      "default": "https://example.com"
    }
  }'
```

### Referrer Routing (Pro)
```bash
curl -X POST https://edgelink-production.quoteviral.workers.dev/api/links/my-slug/routing/referrer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "routes": {
      "twitter.com": "https://example.com/twitter",
      "linkedin.com": "https://example.com/linkedin",
      "facebook.com": "https://example.com/facebook",
      "default": "https://example.com/direct"
    }
  }'
```

### List Links with Pagination
```bash
curl -X GET "https://edgelink-production.quoteviral.workers.dev/api/links?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update Link
```bash
curl -X PUT https://edgelink-production.quoteviral.workers.dev/api/links/my-slug \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "destination": "https://newdestination.com",
    "max_clicks": 5000
  }'
```

### Delete Link
```bash
curl -X DELETE https://edgelink-production.quoteviral.workers.dev/api/links/my-slug \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Analytics
```bash
curl -X GET "https://edgelink-production.quoteviral.workers.dev/api/analytics/my-slug?range=30d" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## JavaScript/TypeScript SDK

```typescript
// Initialize client
const edgelink = new EdgeLinkClient({
  apiKey: 'YOUR_JWT_TOKEN',
  baseUrl: 'https://edgelink-production.quoteviral.workers.dev'
});

// Create link
const link = await edgelink.shorten({
  url: 'https://example.com',
  custom_slug: 'my-page'
});

// Configure device routing (Pro)
await edgelink.setDeviceRouting('my-page', {
  mobile: 'https://m.example.com',
  desktop: 'https://www.example.com'
});

// Configure geo routing (Pro)
await edgelink.setGeoRouting('my-page', {
  routes: {
    US: 'https://example.com/us',
    GB: 'https://example.com/uk',
    default: 'https://example.com'
  }
});

// Get analytics
const analytics = await edgelink.getAnalytics('my-page', { range: '30d' });
```

## Response Formats

### Success (201/200)
```json
{
  "slug": "abc123",
  "short_url": "https://edgelink-production.quoteviral.workers.dev/abc123",
  "expires_in": 2592000
}
```

### Error (4xx/5xx)
```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Common Error Codes

- `INVALID_URL` - URL validation failed
- `SLUG_TAKEN` - Custom slug already in use
- `PRO_FEATURE_REQUIRED` - Feature requires Pro plan
- `RATE_LIMIT_EXCEEDED` - Rate limit reached
- `UNAUTHORIZED` - Invalid or missing JWT
- `NOT_FOUND` - Link not found or access denied

## Feature Detection

| Feature | Free | Pro |
|---------|------|-----|
| URL Shortening | ✅ | ✅ |
| Custom Slugs | ✅ | ✅ |
| Analytics | ✅ | ✅ |
| Rate Limit | 1,000/day | 10,000/day |
| Device Routing | ❌ | ✅ |
| Geographic Routing | ❌ | ✅ |
| Referrer Routing | ❌ | ✅ |
| Password Protection | ❌ | ✅ |
| QR Codes | ❌ | ✅ |
| Custom Domains | ❌ | ✅ |
| Webhooks | ❌ | ✅ |
| A/B Testing | ❌ | ✅ |

## Redirect Priority Order

1. A/B Testing
2. Time-based Routing
3. **Device Routing** (FR-9)
4. **Geographic Routing** (FR-10)
5. **Referrer Routing** (FR-11)
6. Default Destination

## Detection Methods

| Routing Type | Detection Method | Header/Property |
|-------------|------------------|-----------------|
| Device | User-Agent regex | `User-Agent` |
| Geographic | Cloudflare header | `cf-ipcountry` |
| Referrer | HTTP header | `Referer` |
| Time | Cloudflare timezone | `cf-timezone` |

## Support

- **Docs:** Full documentation in `API_DOCUMENTATION.md`
- **Issues:** Report bugs on GitHub
- **Email:** support@edgelink.dev
