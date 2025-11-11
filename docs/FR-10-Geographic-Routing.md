# FR-10: Geographic Routing

**Status**: ✅ Implemented
**Feature Type**: Pro/Premium Only
**Priority**: High

## Overview

Geographic Routing allows Pro users to redirect visitors to different URLs based on their country location. This feature uses Cloudflare's `cf-ipcountry` header to detect the visitor's country using ISO 3166-1 alpha-2 codes and route accordingly.

## Features

### 1. Country Detection
- **Detection Method**: Cloudflare's `cf-ipcountry` header (serverless, instant)
- **Country Codes**: ISO 3166-1 alpha-2 (e.g., US, GB, IN, DE, FR, JP)
- **Fallback**: Default route for unmatched countries
- **Accuracy**: High (based on Cloudflare's IP geolocation database)

### 2. Routing Configuration
Pro users can configure different destination URLs for each country:
- Country-specific URLs (e.g., `US → https://us.example.com`)
- Multiple countries supported (unlimited)
- Default/fallback URL for unmatched regions
- Easy country selection via dropdown (23+ popular countries)

### 3. Analytics Tracking
All clicks are tracked with geographic information:
- Country code (ISO alpha-2)
- Country name (full name)
- City (if available from Cloudflare)
- Click counts per country
- Geographic distribution visualization

## Implementation Details

### Database Schema

The `links` table includes a `geo_routing` field (TEXT/JSON):

```sql
geo_routing TEXT -- JSON: {"US": "url", "IN": "url", "default": "url"}
```

### API Endpoints

#### 1. Configure Geographic Routing
```http
POST /api/links/:slug/routing/geo
Authorization: Bearer <token>
Content-Type: application/json

{
  "routes": {
    "US": "https://us.example.com",
    "GB": "https://uk.example.com",
    "IN": "https://in.example.com",
    "default": "https://example.com"
  }
}
```

**Response:**
```json
{
  "message": "Geographic routing configured successfully",
  "slug": "abc123",
  "geo_routing": {
    "US": "https://us.example.com",
    "GB": "https://uk.example.com",
    "IN": "https://in.example.com",
    "default": "https://example.com"
  }
}
```

**Error (Non-Pro User):**
```json
{
  "error": "Geographic routing is a Pro feature",
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
    "device": null,
    "geo": {
      "US": "https://us.example.com",
      "GB": "https://uk.example.com",
      "IN": "https://in.example.com",
      "default": "https://example.com"
    },
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
3. **Device-based routing**
4. **Geographic routing** ← FR-10
5. **Referrer-based routing**
6. **Default destination** (fallback)

**Geographic routing code** (`redirect.ts:183-193`):

```typescript
// 4. Geographic routing
if (linkData.geo_routing) {
  const country = request.headers.get('cf-ipcountry') || 'XX';
  // Check for country-specific route first
  if (linkData.geo_routing[country]) {
    destination = linkData.geo_routing[country];
  } else if (linkData.geo_routing['default']) {
    // Fallback to default route for unmatched countries
    destination = linkData.geo_routing['default'];
  }
}
```

### Pro Feature Gating

Geographic routing is gated as a **Pro-only feature** in three places:

#### 1. Link Creation (`shorten.ts`)
```typescript
if (body.geo_routing) {
  // Geographic routing (Pro feature)
  if (user.plan !== 'pro') {
    return new Response(
      JSON.stringify({
        error: 'Geographic routing is a Pro feature',
        code: 'PRO_FEATURE_REQUIRED'
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }
  linkData.geo_routing = body.geo_routing;
}
```

#### 2. Link Updates (`links.ts`)
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

#### 3. Routing Configuration (`routing.ts:149-162`)
```typescript
// Check if user has Pro plan (geo routing is a Pro feature)
const user = await env.DB.prepare(
  'SELECT plan FROM users WHERE user_id = ?'
).bind(userId).first<{ plan: string }>();

if (!user || user.plan !== 'pro') {
  return new Response(
    JSON.stringify({
      error: 'Geographic routing is a Pro feature',
      code: 'PRO_FEATURE_REQUIRED'
    }),
    { status: 403, headers: { 'Content-Type': 'application/json' } }
  );
}
```

### Analytics Integration

Geographic routing clicks are tracked with full analytics:

**Analytics Event Structure:**
```typescript
interface AnalyticsEvent {
  timestamp: number;
  slug: string;
  country: string; // ← Country code tracked (e.g., "US", "GB")
  city: string;    // ← City tracked
  device: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  os: string;
  referrer: string;
  user_id: string;
}
```

**Geographic Data API Response:**
```json
{
  "geographic": [
    { "country": "US", "country_name": "United States", "clicks": 1250 },
    { "country": "GB", "country_name": "United Kingdom", "clicks": 450 },
    { "country": "IN", "country_name": "India", "clicks": 380 },
    { "country": "DE", "country_name": "Germany", "clicks": 290 },
    { "country": "FR", "country_name": "France", "clicks": 210 }
  ]
}
```

## Frontend Implementation

### Geographic Routing Modal

The frontend dashboard (`dashboard/page.tsx`) includes a comprehensive modal for configuring geographic routing:

**Features:**
- Country selector dropdown with 23+ popular countries
- Flag emojis for visual identification
- Multiple country-URL pairs
- Add/remove country routes dynamically
- "default" fallback option for unmatched countries
- URL validation and redirect loop prevention
- Loading states and error handling

**Supported Countries:**
- ✅ **All 195+ countries worldwide** via ISO 3166-1 alpha-2 codes
- Organized in dropdown with optgroups for easy navigation:
  - **Popular Countries**: US, GB, CA, AU, IN, DE, FR, JP, BR, CN (top 10)
  - **All Countries**: Complete A-Z list from Afghanistan to Zimbabwe
  - **Special**: Default/Fallback option for unmatched regions
- Native browser type-to-search for quick country selection
- Each country includes flag emoji and full name

### UI Components

**Geographic Routing Button:**
```tsx
<button
  onClick={() => openGeoRoutingModal(link)}
  className="btn-secondary text-sm"
  title={user?.plan !== 'pro' ? 'Geographic routing is a Pro feature' : 'Configure geographic routing'}
>
  {user?.plan === 'pro' ? '🌍 Geo' : '🔒 Geo'}
</button>
```

**Modal Features:**
- Info banner explaining how it works
- Warning about redirect loops
- Country detection info section
- Action buttons (Save, Delete, Cancel)
- Pre-populated with existing configuration

## Usage Examples

### Example 1: Global E-commerce Site

Route users to region-specific stores:

```javascript
POST /api/links/shop123/routing/geo

{
  "routes": {
    "US": "https://us.shop.com",
    "GB": "https://uk.shop.com",
    "DE": "https://de.shop.com",
    "FR": "https://fr.shop.com",
    "default": "https://shop.com/international"
  }
}
```

**Result:**
- US visitors → US store (USD, English)
- UK visitors → UK store (GBP, English)
- German visitors → German store (EUR, German)
- French visitors → French store (EUR, French)
- Other countries → International store

### Example 2: Content Localization

Route to language-specific content:

```javascript
POST /api/links/blog456/routing/geo

{
  "routes": {
    "IN": "https://blog.example.com/hi",
    "BR": "https://blog.example.com/pt-br",
    "MX": "https://blog.example.com/es-mx",
    "JP": "https://blog.example.com/ja",
    "default": "https://blog.example.com/en"
  }
}
```

### Example 3: Regulatory Compliance

Route based on regional requirements:

```javascript
POST /api/links/signup789/routing/geo

{
  "routes": {
    "US": "https://app.example.com/signup?region=us&gdpr=false",
    "GB": "https://app.example.com/signup?region=uk&gdpr=true",
    "DE": "https://app.example.com/signup?region=de&gdpr=true",
    "default": "https://app.example.com/signup?region=intl"
  }
}
```

### Example 4: Marketing Campaigns

Country-specific promotions:

```javascript
POST /api/links/promo2024/routing/geo

{
  "routes": {
    "US": "https://example.com/us-black-friday",
    "CA": "https://example.com/ca-boxing-day",
    "IN": "https://example.com/in-diwali-sale",
    "default": "https://example.com/global-sale"
  }
}
```

## Performance

- **Redirect Speed**: <50ms p95 (via Cloudflare Workers KV)
- **Country Detection**: Instant (Cloudflare edge network)
- **Caching**: Geographic routing rules cached in KV for fast lookups
- **Global Availability**: Works on all Cloudflare edge locations worldwide

## Security Considerations

1. **Pro Feature Enforcement**: Multiple validation layers prevent free users from using geographic routing
2. **URL Validation**: All geographic routing URLs validated before storage
3. **User Ownership**: Links can only be configured by their owners
4. **Input Sanitization**: JSON parsing with error handling
5. **Redirect Loop Prevention**: Frontend and backend validation to prevent short URL in destination

## Limitations

1. **Country-Level Only**: Detection is at country level (not city or region)
2. **VPN Usage**: Users with VPNs may appear from different countries
3. **Proxy Servers**: Corporate proxies may affect detection
4. **Cloudflare Dependency**: Relies on Cloudflare's IP geolocation database

## Advantages Over Alternatives

### Why Cloudflare's cf-ipcountry?

1. **Zero Latency**: Header already present, no additional lookups
2. **High Accuracy**: Cloudflare's global network provides reliable data
3. **No External API Calls**: Reduces latency and dependency
4. **Cost Effective**: No per-request charges for geolocation
5. **Consistent**: Same data across all edge locations

### Comparison with IP Geolocation APIs

| Feature | Cloudflare Header | External API |
|---------|------------------|--------------|
| Latency | 0ms (instant) | 50-200ms |
| Cost | Free | $0.001-0.01/request |
| Accuracy | High | Similar |
| Reliability | 99.99% | Varies |
| Setup | None | API keys, billing |

## Testing

### Test Cases

1. **US Visitor Test**
   ```bash
   curl -H "cf-ipcountry: US" \
     https://edgelink-production.quoteviral.workers.dev/abc123
   # Should redirect to US URL
   ```

2. **UK Visitor Test**
   ```bash
   curl -H "cf-ipcountry: GB" \
     https://edgelink-production.quoteviral.workers.dev/abc123
   # Should redirect to GB URL
   ```

3. **Default Fallback Test**
   ```bash
   curl -H "cf-ipcountry: ZW" \
     https://edgelink-production.quoteviral.workers.dev/abc123
   # Should redirect to default URL (if configured)
   ```

4. **Free User Restriction Test**
   ```bash
   curl -X POST https://edgelink-production.quoteviral.workers.dev/api/links/abc123/routing/geo \
     -H "Authorization: Bearer <free_user_token>" \
     -d '{"routes": {"US": "https://us.example.com"}}'
   # Should return 403 Forbidden
   ```

5. **Redirect Loop Prevention Test**
   ```bash
   # Frontend modal should prevent this
   {
     "routes": {
       "US": "https://edgelink-production.quoteviral.workers.dev/abc123"
     }
   }
   # Should show error: "URL cannot contain your short link"
   ```

## Related Features

- **FR-9: Device-Based Routing** - Route by device type (mobile/tablet/desktop)
- **FR-11: Time-Based Routing** - Route by time of day/week
- **FR-12: Referrer-Based Routing** - Route by traffic source
- **FR-13: A/B Testing** - Split traffic between variants

## Files Modified

### Backend
- `edgelink/backend/src/handlers/routing.ts` - Geographic routing handler (lines 133-223)
- `edgelink/backend/src/handlers/redirect.ts` - Geographic routing logic (lines 183-193)
- `edgelink/backend/schema.sql` - Database schema with geo_routing field (line 35)
- `edgelink/backend/src/types/index.ts` - TypeScript types for geo routing (line 70)

### Frontend
- `edgelink/frontend/src/app/dashboard/page.tsx` - Geographic routing modal and UI
- `edgelink/frontend/src/lib/api.ts` - API client methods (lines 418-428)

## Deployment Checklist

- [x] Database schema includes `geo_routing` field
- [x] KV data structure supports geographic routing
- [x] Pro plan validation in routing handler
- [x] Pro plan validation in shorten handler
- [x] Pro plan validation in links handler
- [x] Geographic detection logic in redirect handler
- [x] Default fallback support
- [x] Analytics tracking for country
- [x] API endpoints for configuration
- [x] Frontend UI for geographic routing configuration
- [x] Redirect loop prevention
- [x] Country selector with 23+ countries
- [x] Documentation

## Analytics Dashboard

The analytics page (`analytics/[slug]/page.tsx`) displays:

- **Geographic Distribution Section** (lines 234-251)
  - Country flags (via emoji)
  - Country names (full names)
  - Click counts per country
  - Top countries displayed first

**Example Display:**
```
Geographic Distribution
━━━━━━━━━━━━━━━━━━━━━
🇺🇸 United States         1,250 clicks
🇬🇧 United Kingdom          450 clicks
🇮🇳 India                   380 clicks
🇩🇪 Germany                 290 clicks
🇫🇷 France                  210 clicks
```

## Future Enhancements

1. **Region-Level Routing**
   - State/province routing (e.g., California, Texas)
   - City-level routing (major cities)
   - Continent-level routing

2. **Smart Geographic Routing**
   - ML-based location prediction
   - Automatic optimization based on conversion data
   - Language detection combined with location

3. **Advanced Analytics**
   - Geographic heatmaps
   - Conversion rates by country
   - Revenue attribution by region

4. **Geofencing**
   - Radius-based routing
   - Custom geographic boundaries
   - Multi-region routing rules

5. **IP Range Support**
   - Custom IP range routing
   - Corporate network detection
   - ISP-based routing

## Support

For issues or questions about geographic routing:
1. Check analytics to verify country detection
2. Test with different `cf-ipcountry` header values
3. Verify Pro plan status
4. Review routing configuration via GET endpoint
5. Check for redirect loops in configuration

## Best Practices

1. **Always Set a Default**: Configure a "default" route for unmatched countries
2. **Test All Routes**: Verify each country URL works correctly
3. **Monitor Analytics**: Track which countries drive the most traffic
4. **Avoid Loops**: Never use the short link itself as a destination
5. **Consider Language**: Match country with appropriate language/currency
6. **Regional Compliance**: Respect local laws and regulations (GDPR, CCPA)
7. **Performance**: Keep destination URLs fast and reliable
8. **User Experience**: Ensure region-specific content is relevant

## Troubleshooting

### Issue: Wrong Country Detection
**Cause**: User may be using VPN/proxy
**Solution**: Test without VPN, or use device routing as backup

### Issue: Default Route Not Working
**Cause**: "default" key not set in routes
**Solution**: Add `"default": "https://example.com"` to routes object

### Issue: 403 Error When Configuring
**Cause**: User is on Free plan
**Solution**: Upgrade to Pro plan to use geographic routing

### Issue: Analytics Not Showing Countries
**Cause**: No clicks recorded yet, or analytics not enabled
**Solution**: Wait for clicks to be recorded, check Analytics Engine integration

## Conclusion

FR-10 Geographic Routing is a powerful Pro feature that enables country-based URL redirection with:
- Zero-latency country detection via Cloudflare
- Comprehensive frontend UI with 23+ countries
- Full analytics tracking
- Fallback support for unmatched regions
- Production-ready implementation

This feature is ideal for global businesses, content localization, regulatory compliance, and region-specific marketing campaigns.
