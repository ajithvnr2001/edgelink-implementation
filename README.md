# EdgeLink - URL Shortener with Smart Routing

A powerful, feature-rich URL shortener built on Cloudflare's edge network with advanced routing capabilities, analytics, and team collaboration features.

## 🚀 Quick Start (Local Development)

### 1. Setup Environment

```bash
# Clone the repository
git clone <repository-url>
cd edgelink-implementation

# Run the setup script
./setup-local-env.sh

# Install dependencies
npm install
cd edgelink/backend && npm install
cd ../frontend && npm install
cd ../..
```

### 2. Configure Wrangler & Database

```bash
# Login to Cloudflare
wrangler login

# Set JWT secrets
cd edgelink/backend
wrangler secret put JWT_SECRET
# Enter a strong random string (64+ characters)

wrangler secret put REFRESH_TOKEN_SECRET
# Enter another strong random string (64+ characters)

# Initialize database
wrangler d1 execute edgelink-production --file=./schema.sql --local
```

### 3. Start Development

```bash
# From the root directory
npm run dev

# Or use the startup script
./start-dev.sh
```

- **Backend:** http://localhost:8787
- **Frontend:** http://localhost:3000

## 🌐 Production Domains

- **Frontend/Dashboard:** https://shortedbro.xyz
- **Backend API:** https://go.shortedbro.xyz
- **Short Links:** https://go.shortedbro.xyz/{slug}

## 📚 Documentation

- **[Local Development Guide](LOCAL_DEVELOPMENT_GUIDE.md)** - Complete setup and troubleshooting
- **[API Documentation](API_DOCUMENTATION.md)** - Full API reference
- **[API Quick Reference](API_QUICK_REFERENCE.md)** - Quick command reference
- **[Authentication Guide](AUTHENTICATION_GUIDE.md)** - Auth setup and troubleshooting
- **[Webhook Documentation](WEBHOOK_DOCUMENTATION.md)** - Webhook integration guide
- **[Capabilities](CAPABILITIES.md)** - Complete feature list

## ✨ Key Features

### Core Features
- ✅ URL Shortening with custom slugs
- ✅ Link Management (CRUD operations)
- ✅ Link Expiration & Password Protection
- ✅ Bulk Import/Export (CSV/JSON)
- ✅ QR Code Generation (SVG/PNG)

### Smart Routing
- ✅ Device-Based Routing (mobile/desktop/tablet)
- ✅ Geographic Routing (country-based)
- ✅ Referrer-Based Routing (social media optimization)
- ✅ Time-Based Routing (schedule-based redirects)
- ✅ A/B Testing

### Analytics
- ✅ Real-time Click Tracking
- ✅ Device & Browser Analytics
- ✅ Geographic Analytics
- ✅ Referrer Tracking
- ✅ Export Analytics (CSV/JSON)

### Advanced Features
- ✅ Custom Domains (Pro)
- ✅ Webhooks (Pro)
- ✅ Team Collaboration (Pro)
- ✅ API Keys for Automation
- ✅ JWT Authentication
- ✅ Rate Limiting

## 🛠️ Tech Stack

- **Backend:** Cloudflare Workers (TypeScript)
- **Frontend:** Next.js 14 (React, TypeScript, Tailwind CSS)
- **Database:** Cloudflare D1 (SQLite)
- **Storage:** Cloudflare KV + R2
- **Analytics:** Cloudflare Analytics Engine
- **CDN:** Cloudflare Pages

## 📦 Project Structure

```
edgelink-implementation/
├── edgelink/
│   ├── backend/          # Cloudflare Workers backend
│   │   ├── src/
│   │   │   ├── handlers/ # API endpoint handlers
│   │   │   ├── middleware/
│   │   │   └── utils/
│   │   ├── schema.sql    # Database schema
│   │   └── wrangler.toml # Worker configuration
│   │
│   ├── frontend/         # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/      # App routes
│   │   │   ├── components/
│   │   │   └── lib/      # Utilities & API client
│   │   └── .env.local    # Local development config
│   │
│   └── browser-extension/ # Chrome/Firefox extension
│
├── docs/                 # Technical documentation
├── examples/             # SDK examples
└── LOCAL_DEVELOPMENT_GUIDE.md
```

## 🐛 Troubleshooting

### "Failed to Fetch" Error

This usually means the backend isn't running or .env.local is missing.

**Fix:**
```bash
# 1. Create .env.local
./setup-local-env.sh

# 2. Start backend
cd edgelink/backend
npm run dev

# 3. Start frontend (new terminal)
cd edgelink/frontend
npm run dev
```

See [LOCAL_DEVELOPMENT_GUIDE.md](LOCAL_DEVELOPMENT_GUIDE.md) for more troubleshooting.

## 🚢 Deployment

### Backend (Cloudflare Workers)

```bash
cd edgelink/backend

# Deploy to production
wrangler deploy --config wrangler.prod.toml --env production

# Set production secrets
wrangler secret put JWT_SECRET --env production
wrangler secret put REFRESH_TOKEN_SECRET --env production
```

### Frontend (Cloudflare Pages)

```bash
cd edgelink/frontend

# Build and deploy
npm run build
wrangler pages deploy .next --project-name=edgelink-production
```

## 🔑 Environment Variables

### Development (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8787
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_SHORT_URL_DOMAIN=localhost:8787
```

### Production (.env.production)
```env
NEXT_PUBLIC_API_URL=https://go.shortedbro.xyz
NEXT_PUBLIC_FRONTEND_URL=https://shortedbro.xyz
NEXT_PUBLIC_SHORT_URL_DOMAIN=go.shortedbro.xyz
```

## 📊 API Endpoints

### Authentication
- `POST /auth/signup` - Create account
- `POST /auth/login` - Login
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - Logout

### Links
- `POST /api/shorten` - Create short link
- `GET /api/links` - List links
- `GET /api/links/:slug` - Get link details
- `PUT /api/links/:slug` - Update link
- `DELETE /api/links/:slug` - Delete link

### Analytics
- `GET /api/analytics/:slug` - Get link analytics
- `GET /api/analytics/:slug/export` - Export analytics

See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for complete API reference.

## 🤝 Contributing

Contributions are welcome! Please read the development guide first.

## 📄 License

MIT License - See LICENSE file for details

## 🔗 Links

- **Production:** https://shortedbro.xyz
- **API:** https://go.shortedbro.xyz
- **GitHub:** https://github.com/ajithvnr2001/edgelink-implementation

## 💡 Support

For issues and questions:
1. Check [LOCAL_DEVELOPMENT_GUIDE.md](LOCAL_DEVELOPMENT_GUIDE.md)
2. Review [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
3. Open an issue on GitHub

---

Built with ❤️ using Cloudflare's edge network
