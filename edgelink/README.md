# EdgeLink - Developer-First URL Shortener

A fast, affordable URL shortener built on Cloudflare's edge network with enterprise-grade features.

## 🚀 Features

### Week 1 MVP (✅ Completed)

**Core Functionality:**
- ✅ Anonymous link creation (30-day expiry, no signup required)
- ✅ Custom slug support (5-20 characters)
- ✅ Ultra-fast redirects (<50ms target)
- ✅ Collision detection with automatic retry
- ✅ JWT-based authentication (HS256, 24-hour expiry)
- ✅ Rate limiting (1K/day free, 10K/day pro)
- ✅ User registration and login
- ✅ Link management dashboard
- ✅ Click tracking with Analytics Engine
- ✅ Device fingerprinting for security

**Advanced Features (Pro tier ready):**
- ✅ Device-based routing (mobile/desktop/tablet)
- ✅ Geographic routing (by country)
- ✅ Referrer-based routing
- ✅ A/B testing support
- ✅ UTM parameter auto-append
- ✅ Password-protected links
- ✅ Link expiration

### Week 2 Features ✅
- [x] Analytics dashboard with comprehensive charts
- [x] Time series line charts (clicks over time)
- [x] Device breakdown pie charts
- [x] Browser distribution bar charts
- [x] Geographic distribution (country-based)
- [x] Operating system analytics
- [x] Top referrers tracking
- [x] Time range filtering (7d/30d)

### Week 3 Features ✅
- [x] Custom domain management with DNS verification
- [x] SSL provisioning documentation
- [x] API key generation and management
- [x] Domain limit enforcement (Free: 1, Pro: 5)
- [x] API key limit enforcement (Max: 5 per user)
- [x] URL safety checking (abuse prevention)
- [x] Email verification structure
- [x] Rate limiting for sensitive operations
- [x] Input sanitization utilities

### Week 4-8 Features ✅
- [x] QR code generation (Pro)
- [x] Advanced analytics export (CSV/JSON)
- [x] Webhooks
- [x] A/B testing
- [x] Team collaboration
- [x] Monitoring & alerts
- [x] Advanced routing features

### Week 9-12 Features ✅
- [x] **Browser Extension (Chrome/Firefox)**
  - Instant URL shortening from any page
  - Context menu integration (right-click)
  - Keyboard shortcuts (Ctrl+Shift+S)
  - AI-powered slug suggestions
  - Recent links viewer
  - Advanced options (UTM, password, expiration)
  - Beautiful dark theme UI
  - Comprehensive settings page
  - See: `browser-extension/README.md`

### Account Management ✅
- [x] **User Account Deletion**
  - Immediate account deletion
  - Scheduled deletion (30-day grace period)
  - Cancel scheduled deletion
  - GDPR-compliant data export
  - Complete data removal (cascade deletes)
  - Multiple confirmation steps for safety
  - Available in web dashboard and browser extension
  - See: `ACCOUNT_DELETION.md`

### Coming Soon
- [ ] MapBox geographic heatmap integration
- [ ] Email service integration (Resend/SendGrid)
- [ ] Google Safe Browsing API integration
- [ ] Mobile apps (iOS/Android)
- [ ] Zapier integration

## 📁 Project Structure

```
edgelink/
├── backend/                 # Cloudflare Workers
│   ├── src/
│   │   ├── index.ts        # Main worker entry point
│   │   ├── auth/           # JWT authentication
│   │   ├── handlers/       # API route handlers
│   │   ├── middleware/     # Auth & rate limiting
│   │   ├── types/          # TypeScript interfaces
│   │   └── utils/          # Helper functions
│   ├── schema.sql          # D1 database schema
│   ├── wrangler.toml       # Cloudflare config
│   └── package.json
│
├── frontend/               # Next.js 14 Dashboard
│   ├── src/
│   │   ├── app/           # Pages (App Router)
│   │   └── lib/           # API client & utilities
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── browser-extension/      # Browser Extension (Chrome/Firefox)
│   ├── manifest.json      # Extension manifest (v3)
│   ├── popup/             # Popup UI
│   ├── background/        # Service worker
│   ├── content/           # Content scripts
│   ├── options/           # Settings page
│   ├── lib/               # API client
│   ├── icons/             # Extension icons
│   └── README.md          # Extension documentation
│
└── shared/                 # Shared types (future)
```

## 🛠️ Tech Stack

### Backend
- **Runtime**: Cloudflare Workers (Edge Compute)
- **Database**: D1 (SQLite), Workers KV (Fast Redirects)
- **Analytics**: Analytics Engine (10M events/day free)
- **Storage**: R2 (File exports/imports)
- **Auth**: JWT with Web Crypto API (HS256)
- **Rate Limiting**: KV-based (simple, effective)

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Deployment**: Cloudflare Pages
- **State**: localStorage (JWT tokens)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Cloudflare account
- Wrangler CLI

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create D1 database
wrangler d1 create edgelink
# Copy database_id to wrangler.toml

# Initialize database schema
wrangler d1 execute edgelink --file=./schema.sql

# Create KV namespace
wrangler kv:namespace create "LINKS_KV"
wrangler kv:namespace create "LINKS_KV" --preview
# Copy IDs to wrangler.toml

# Create R2 bucket
wrangler r2 bucket create edgelink-storage

# Set JWT secret
wrangler secret put JWT_SECRET
# Enter a strong random string (32+ characters)
# Generate with: openssl rand -base64 32

# Start development server
npm run dev
# Server runs on http://localhost:8787
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local and set NEXT_PUBLIC_API_URL

# Start development server
npm run dev
# Dashboard runs on http://localhost:3000
```

### 3. Browser Extension Setup (Optional)

```bash
cd browser-extension

# Chrome:
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select browser-extension/ folder

# Firefox:
# 1. Open about:debugging#/runtime/this-firefox
# 2. Click "Load Temporary Add-on"
# 3. Select manifest.json

# See browser-extension/README.md for detailed instructions
```

### 4. Deploy to Production

EdgeLink includes comprehensive deployment guides for both development and production environments:

**📘 Development Deployment**: [`DEV_DEPLOYMENT.md`](DEV_DEPLOYMENT.md)
- Complete guide for deploying to a dev environment
- Testing and validation procedures
- Development monitoring setup
- Quick iteration workflow

**📗 Production Deployment**: [`PROD_DEPLOYMENT.md`](PROD_DEPLOYMENT.md)
- Production-ready deployment with security hardening
- SSL/TLS configuration and custom domains
- Monitoring, alerts, and backup strategies
- CI/CD pipeline setup
- Rollback procedures

**Quick Start (Development)**:
```bash
# See DEV_DEPLOYMENT.md for full instructions
cd backend
wrangler deploy --env dev

cd ../frontend
npm run build
npx wrangler pages deploy .next --project-name=edgelink-dev --branch=dev
```

**Quick Start (Production)**:
```bash
# See PROD_DEPLOYMENT.md for full instructions
cd backend
wrangler deploy --env production

cd ../frontend
npm run build
npx wrangler pages deploy .next --project-name=edgelink --branch=main
```

**Browser Extension Publishing**:
- Chrome Web Store: See `PROD_DEPLOYMENT.md` Section 7
- Firefox Add-ons: See `PROD_DEPLOYMENT.md` Section 7
- Detailed instructions in `browser-extension/README.md`

## 📊 Architecture

### Request Flow

#### URL Shortening (Anonymous)
```
User → POST /api/shorten
  → Check rate limit (KV)
  → Generate slug (collision detection)
  → Store in KV (fast path)
  → Store in D1 (management)
  → Return short URL
```

#### URL Redirect
```
User → GET /{slug}
  → Fetch from KV (< 10ms)
  → Check expiration, password
  → Apply routing rules (device, geo, referrer)
  → Write analytics event (async)
  → Increment click count (async)
  → 301 Redirect to destination
```

#### Authentication
```
User → POST /auth/login
  → Verify password (PBKDF2)
  → Generate JWT (HS256, 24h expiry)
  → Generate refresh token (30d)
  → Store refresh token in D1
  → Return tokens + user info
```

### Data Storage

**KV (Fast Path):**
- Link redirects
- Rate limit counters
- Session data

**D1 (Metadata):**
- Users & authentication
- Link metadata
- Usage tracking
- Custom domains
- Refresh tokens

**Analytics Engine:**
- Click events (real-time)
- Device, browser, OS stats
- Geographic data
- Referrer tracking

## 🔐 Security Features

- ✅ JWT-based authentication (HS256)
- ✅ Device fingerprinting (anti-theft)
- ✅ 24-hour token expiration
- ✅ Refresh token rotation
- ✅ Password hashing (PBKDF2, 100K iterations)
- ✅ Rate limiting per user tier
- ✅ HTTPS-only (Cloudflare enforced)
- ✅ GDPR compliant (no PII tracking)
- ✅ Input validation and sanitization

## 📈 Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| Redirect Latency (p95) | <50ms | ✅ Implemented |
| Link Creation Time | <200ms | ✅ Implemented |
| JWT Validation | <5ms | ✅ Implemented |
| Uptime | 99.9% | ✅ Cloudflare SLA |
| Dashboard Load | <1.5s | ✅ Optimized |

## 💰 Pricing Model

### Free Forever
- 500 links/month
- 50K clicks tracked/month
- 1 custom domain
- 1K API calls/day
- 30 days analytics retention
- Unlimited link editing

### Pro ($9/month)
- 5,000 links/month
- 500K clicks tracked/month
- 5 custom domains
- 10K API calls/day
- 1 year analytics retention
- QR codes
- Device routing
- Geographic routing
- A/B testing
- Webhooks
- Password protection
- Advanced export

## 🧪 Testing

```bash
# Test anonymous link creation
curl -X POST http://localhost:8787/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Test redirect
curl -I http://localhost:8787/abc123

# Test signup
curl -X POST http://localhost:8787/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "Test1234"}'

# Test authenticated link creation
curl -X POST http://localhost:8787/api/shorten \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"url": "https://example.com", "custom_slug": "mylink"}'
```

## 📝 API Documentation

### Authentication

**POST /auth/signup**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "Optional Name"
}
```

**POST /auth/login**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

### Links

**POST /api/shorten** (Anonymous or Authenticated)
```json
{
  "url": "https://example.com/very/long/url",
  "custom_slug": "mylink",
  "expires_at": "2025-12-31T23:59:59Z",
  "utm_template": "utm_source=twitter&utm_medium=social"
}
```

**GET /{slug}** - Redirect to destination

**GET /api/links** - Get user's links (authenticated)

**PUT /api/links/{slug}** - Update link (authenticated)

**DELETE /api/links/{slug}** - Delete link (authenticated)

**GET /api/stats/{slug}** - Get analytics (authenticated)

## 🎯 Roadmap

### Week 1 ✅ Completed
- Core redirect engine
- JWT authentication
- Rate limiting
- Basic dashboard

### Week 2 ✅ Completed
- Analytics dashboard with charts
- Real-time click tracking queries
- Time series visualizations
- Device/browser/OS breakdowns
- Geographic distribution
- Top referrers tracking

### Week 3 ✅ Completed
- Custom domain management
- SSL provisioning
- Domain verification
- API key generation
- Security utilities

### Week 4 ✅ Completed
- QR code generation
- Link expiration UI
- Performance optimization

### Week 5 ✅ Completed
- AI slug suggestions
- Bulk import/export
- Advanced analytics

### Week 6 ✅ Completed
- Team collaboration backend
- Role-based access control

### Week 7 ✅ Completed
- A/B testing
- Team management UI

### Week 8 ✅ Completed
- Monitoring & alerts
- Advanced analytics

### Weeks 9-12 ✅ Completed
- **Browser Extension (Chrome/Firefox)**
  - Popup UI with authentication
  - Context menus & keyboard shortcuts
  - Background service worker
  - Content script with inline notifications
  - Comprehensive settings page
  - AI slug suggestions integration
  - Recent links viewer
  - Production ready (v1.0.0)

### Account Management ✅ Completed
- **User Account Deletion & Data Management**
  - Immediate deletion (with multiple confirmations)
  - Scheduled deletion (30-day grace period)
  - Cancel deletion during grace period
  - GDPR-compliant data export (JSON)
  - Complete cascade delete logic
  - Web dashboard UI (Next.js)
  - Browser extension integration
  - Security measures (password + confirmation)

## 📊 Infrastructure Costs

At 5,000 users (150 Pro + 4,850 Free):
- **Cloudflare Workers**: ~$184/month
- **Revenue**: $900/month (150 × $6)
- **Gross Margin**: 79%

## 🤝 Contributing

This is currently a private project. Contributions will be opened after MVP launch.

## 📄 License

Proprietary - All rights reserved

## 📚 Documentation

- **[Development Deployment Guide](DEV_DEPLOYMENT.md)** - Deploy to dev environment
- **[Production Deployment Guide](PROD_DEPLOYMENT.md)** - Deploy to production
- **[Account Deletion Guide](ACCOUNT_DELETION.md)** - User account management
- **[Browser Extension](browser-extension/README.md)** - Extension documentation
- **[Week Summaries](WEEK9_SUMMARY.md)** - Development progress (Weeks 9-12)

## 🔗 Links

- **Frontend**: (To be deployed)
- **Backend API**: (To be deployed)
- **Status Page**: Coming soon

## 👨‍💻 Development Team

Built with ❤️ by the EdgeLink team

## 🌐 Browser Extension

EdgeLink now includes a powerful browser extension for **Chrome** and **Firefox**!

### Features
- ⚡ **Instant shortening** from any page
- 🖱️ **Right-click context menu** on any link
- ⌨️ **Keyboard shortcut**: `Ctrl+Shift+S` (or `Cmd+Shift+S` on Mac)
- 🤖 **AI-powered slug suggestions**
- 📊 **Recent links viewer** in popup
- 🔐 **Authentication** with your EdgeLink account
- 👤 **Anonymous mode** for quick shortening
- 🎨 **Beautiful dark theme** UI
- ⚙️ **Comprehensive settings** page
- 📋 **Auto-copy** to clipboard
- 🔔 **Notifications** (browser + inline)

### Installation

**Chrome:**
1. Download or clone this repository
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `browser-extension/` folder

**Firefox:**
1. Download or clone this repository
2. Open `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select `browser-extension/manifest.json`

For detailed instructions, see [`browser-extension/README.md`](browser-extension/README.md)

### Quick Start
1. Install the extension
2. Click the EdgeLink icon in your toolbar
3. (Optional) Login or continue as guest
4. Start shortening URLs!

**Keyboard Shortcut**: Press `Ctrl+Shift+S` on any page to instantly shorten the current URL.

---

**Status**: Week 12 Complete ✅
**Current Phase**: Production Ready 🚀
**Browser Extension**: v1.0.0 ✅
**Next**: Store Submission (Chrome Web Store & Firefox Add-ons)
