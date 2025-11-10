# FR-9: Device-Based Routing

**Status**: ✅ Implemented
**Feature Type**: Pro/Premium Only
**Priority**: High

## Overview

Device-Based Routing allows Pro users to redirect visitors to different URLs based on their device type (mobile, tablet, or desktop). This feature uses User-Agent header parsing to detect the device type and route accordingly.

## Features

### 1. Device Detection
- **Mobile**: Detected via User-Agent patterns: `/Mobile|Android|iPhone/i`
- **Tablet**: Detected via User-Agent patterns: `/iPad|Tablet/i`
- **Desktop**: Default when neither mobile nor tablet patterns match

### 2. Routing Configuration
Pro users can configure different destination URLs for each device type:
- Mobile URL (e.g., `https://mobile.example.com`)
- Tablet URL (e.g., `https://tablet.example.com`)
- Desktop URL (e.g., `https://www.example.com`)

### 3. Analytics Tracking
All clicks are tracked with device type information:
- Device type (mobile/tablet/desktop)
- Browser (Chrome, Safari, Firefox, Edge)
- Operating System (Windows, macOS, Linux, Android, iOS)
- Geographic location (country, city)
- Referrer source

## Implementation Details

### Database Schema

The `links` table includes a `device_routing` field (TEXT/JSON):

```sql
device_routing TEXT -- JSON: {"mobile": "url", "desktop": "url", "tablet": "url"}
```

### API Endpoints

#### 1. Configure Device Routing
```http
POST /api/links/:slug/routing/device
Authorization: Bearer <token>
Content-Type: application/json

{
  "mobile": "https://mobile.example.com",
  "tablet": "https://tablet.example.com",
  "desktop": "https://www.example.com"
}
```

**Response:**
```json
{
  "message": "Device routing configured successfully",
  "slug": "abc123",
  "device_routing": {
    "mobile": "https://mobile.example.com",
    "tablet": "https://tablet.example.com",
    "desktop": "https://www.example.com"
  }
}
```

**Error (Non-Pro User):**
```json
{
  "error": "Device routing is a Pro feature",
  "code": "PRO_FEATURE_REQUIRED"
}
```

#### 2. Get Routing Configuration
```http
GET /api/links/:slug/routing
Authorization: Bearer <token>
```

**Response:**
```json
{
  "slug": "abc123",
  "destination": "https://example.com",
  "routing": {
    "device": {
      "mobile": "https://mobile.example.com",
      "tablet": "https://tablet.example.com",
      "desktop": "https://www.example.com"
    },
    "geo": null,
    "time": null,
    "referrer": null
  }
}
```

#### 3. Delete Routing Configuration
```http
DELETE /api/links/:slug/routing
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "All routing rules removed successfully",
  "slug": "abc123"
}
```

### Redirect Logic

When a user visits a short link (e.g., `https://edgelink.com/abc123`), the redirect handler follows this priority order:

1. **A/B Testing** (highest priority)
2. **Time-based routing**
3. **Device-based routing** ← FR-9
4. **Geographic routing**
5. **Referrer-based routing**
6. **Default destination** (fallback)

**Device routing code** (`redirect.ts:168-181`):

```typescript
// 3. Device-based routing
if (linkData.device_routing) {
  const userAgent = request.headers.get('user-agent') || '';
  const isMobile = /Mobile|Android|iPhone/i.test(userAgent);
  const isTablet = /iPad|Tablet/i.test(userAgent);

  if (isMobile && linkData.device_routing.mobile) {
    destination = linkData.device_routing.mobile;
  } else if (isTablet && linkData.device_routing.tablet) {
    destination = linkData.device_routing.tablet;
  } else if (!isMobile && !isTablet && linkData.device_routing.desktop) {
    destination = linkData.device_routing.desktop;
  }
}
```

### Pro Feature Gating

Device routing is gated as a **Pro-only feature** in three places:

#### 1. Link Creation (`shorten.ts:120-135`)
```typescript
if (body.device_routing) {
  // Device routing (Pro feature)
  if (user.plan !== 'pro') {
    return new Response(
      JSON.stringify({
        error: 'Device routing is a Pro feature',
        code: 'PRO_FEATURE_REQUIRED'
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }
  linkData.device_routing = body.device_routing;
}
```

#### 2. Link Updates (`links.ts:232-254`)
```typescript
const proFeatures = [
  'password',
  'device_routing',
  'geo_routing',
  'referrer_routing',
  'ab_testing'
];

for (const feature of proFeatures) {
  if (body[feature as keyof typeof body] && userPlan !== 'pro') {
    return new Response(
      JSON.stringify({
        error: `${feature} is a Pro feature. Upgrade to use it.`,
        code: 'PRO_FEATURE_REQUIRED'
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

#### 3. Routing Configuration (`routing.ts:34-47`)
```typescript
// Check if user has Pro plan (device routing is a Pro feature)
const user = await env.DB.prepare(
  'SELECT plan FROM users WHERE user_id = ?'
).bind(userId).first<{ plan: string }>();

if (!user || user.plan !== 'pro') {
  return new Response(
    JSON.stringify({
      error: 'Device routing is a Pro feature',
      code: 'PRO_FEATURE_REQUIRED'
    }),
    { status: 403, headers: { 'Content-Type': 'application/json' } }
  );
}
```

### Analytics Integration

Device-based routing clicks are tracked with full analytics:

**Analytics Event Structure:**
```typescript
interface AnalyticsEvent {
  timestamp: number;
  slug: string;
  country: string;
  city: string;
  device: 'mobile' | 'tablet' | 'desktop'; // ← Device type tracked
  browser: string;
  os: string;
  referrer: string;
  user_id: string;
}
```

**Device Data API Response:**
```json
{
  "devices": [
    { "device": "mobile", "clicks": 450, "percentage": 45.0 },
    { "device": "desktop", "clicks": 350, "percentage": 35.0 },
    { "device": "tablet", "clicks": 200, "percentage": 20.0 }
  ]
}
```

## Usage Examples

### Example 1: Mobile App Landing Page

Configure a link to send mobile users to app stores:

```javascript
POST /api/links/app123/routing/device

{
  "mobile": "https://apps.apple.com/app/myapp",
  "tablet": "https://apps.apple.com/app/myapp",
  "desktop": "https://www.myapp.com/download"
}
```

**Result:**
- Mobile users → App Store
- Tablet users → App Store
- Desktop users → Download page

### Example 2: Responsive Web App

Route users to optimized versions:

```javascript
POST /api/links/web456/routing/device

{
  "mobile": "https://m.example.com",
  "tablet": "https://tablet.example.com",
  "desktop": "https://www.example.com"
}
```

### Example 3: Marketing Campaign

Different landing pages per device:

```javascript
POST /api/links/promo789/routing/device

{
  "mobile": "https://example.com/mobile-offer",
  "desktop": "https://example.com/desktop-offer"
}
```

## Performance

- **Redirect Speed**: <50ms p95 (via Cloudflare Workers KV)
- **Device Detection**: Regex-based User-Agent parsing (microseconds)
- **Caching**: Device routing rules cached in KV for fast lookups

## Security Considerations

1. **Pro Feature Enforcement**: Multiple validation layers prevent free users from using device routing
2. **URL Validation**: All device routing URLs validated before storage
3. **User Ownership**: Links can only be configured by their owners
4. **Input Sanitization**: JSON parsing with error handling

## Limitations

1. **User-Agent Spoofing**: Device detection relies on User-Agent header (can be spoofed)
2. **Browser Extensions**: Some extensions modify User-Agent strings
3. **Desktop Mobile Mode**: Desktop browsers in mobile mode may be detected as mobile

## Testing

### Test Cases

1. **Mobile Device Test**
   ```bash
   curl -H "User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)" \
     https://edgelink.com/abc123
   # Should redirect to mobile URL
   ```

2. **Tablet Device Test**
   ```bash
   curl -H "User-Agent: Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)" \
     https://edgelink.com/abc123
   # Should redirect to tablet URL
   ```

3. **Desktop Device Test**
   ```bash
   curl -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)" \
     https://edgelink.com/abc123
   # Should redirect to desktop URL
   ```

4. **Free User Restriction Test**
   ```bash
   curl -X POST https://edgelink.com/api/links/abc123/routing/device \
     -H "Authorization: Bearer <free_user_token>" \
     -d '{"mobile": "https://m.example.com"}'
   # Should return 403 Forbidden
   ```

## Related Features

- **FR-10: Geographic Routing** - Route by country/region
- **FR-11: Time-Based Routing** - Route by time of day/week
- **FR-12: Referrer-Based Routing** - Route by traffic source
- **FR-13: A/B Testing** - Split traffic between variants

## Files Modified

- `edgelink/backend/src/handlers/routing.ts` - Added Pro plan checks
- `edgelink/backend/src/handlers/redirect.ts` - Device routing logic (already implemented)
- `edgelink/backend/src/handlers/shorten.ts` - Pro gating during creation (already implemented)
- `edgelink/backend/src/handlers/links.ts` - Pro gating during updates (already implemented)
- `edgelink/backend/src/handlers/analytics.ts` - Device tracking (already implemented)

## Deployment Checklist

- [x] Database schema includes `device_routing` field
- [x] KV data structure supports device routing
- [x] Pro plan validation in routing handler
- [x] Pro plan validation in shorten handler
- [x] Pro plan validation in links handler
- [x] Device detection logic in redirect handler
- [x] Analytics tracking for device type
- [x] API endpoints for configuration
- [ ] Frontend UI for device routing configuration
- [ ] End-to-end testing

## Future Enhancements

1. **Advanced Device Detection**
   - Use more sophisticated libraries (e.g., UAParser.js)
   - Detect specific device models (iPhone 13, Galaxy S21)
   - Support for wearables and IoT devices

2. **Device-Specific Analytics**
   - Conversion rates by device type
   - Device-specific A/B testing
   - Device preference learning

3. **Smart Routing**
   - ML-based device detection
   - Automatic optimization based on conversion data
   - Device capability detection (screen size, features)

## Support

For issues or questions about device-based routing:
1. Check analytics to verify device detection
2. Test with different User-Agent strings
3. Verify Pro plan status
4. Review routing configuration via GET endpoint
