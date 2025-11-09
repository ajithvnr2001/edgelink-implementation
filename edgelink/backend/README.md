# EdgeLink Backend - Cloudflare Workers

Developer-first URL shortener built on Cloudflare's edge network.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Create D1 Database

```bash
# Create the database
wrangler d1 create edgelink

# Copy the database_id from output and update wrangler.toml

# Initialize schema
wrangler d1 execute edgelink --file=./schema.sql
```

### 3. Create KV Namespace

```bash
# Create production KV namespace
wrangler kv:namespace create "LINKS_KV"

# Create preview KV namespace
wrangler kv:namespace create "LINKS_KV" --preview

# Copy the IDs from output and update wrangler.toml
```

### 4. Create R2 Bucket

```bash
wrangler r2 bucket create edgelink-storage
```

### 5. Set Secrets

```bash
# Generate a strong JWT secret (at least 32 characters)
wrangler secret put JWT_SECRET

# When prompted, paste a secure random string
# Example: openssl rand -base64 32
```

### 6. Development

```bash
# Start local development server
npm run dev

# The server will run on http://localhost:8787
```

### 7. Deployment

```bash
# Deploy to Cloudflare Workers
npm run deploy
```

## Architecture

### Tech Stack
- **Runtime**: Cloudflare Workers (Edge Compute)
- **Storage**: Workers KV (Fast Reads), D1 (SQLite), R2 (File Storage)
- **Analytics**: Analytics Engine (Real-time Events)
- **Auth**: JWT with HS256 (Self-managed, no external dependencies)
- **Rate Limiting**: Workers Rate Limiting API

### Project Structure

```
backend/
├── src/
│   ├── index.ts           # Main worker entry point
│   ├── types/             # TypeScript types and interfaces
│   ├── auth/              # JWT authentication
│   ├── handlers/          # API route handlers
│   ├── middleware/        # Request middleware
│   └── utils/             # Utility functions
├── wrangler.toml          # Cloudflare Workers config
├── schema.sql             # D1 database schema
└── package.json           # Dependencies
```

## API Endpoints

### Authentication
- `POST /auth/signup` - Create new user account
- `POST /auth/login` - Login and get JWT
- `POST /auth/refresh` - Refresh access token
- `POST /auth/verify-email` - Verify email address

### Links
- `POST /api/shorten` - Create short link (anonymous or authenticated)
- `GET /{slug}` - Redirect to destination URL
- `GET /api/links` - List user's links (authenticated)
- `GET /api/stats/{slug}` - Get link analytics (authenticated)
- `PUT /api/links/{slug}` - Update link (authenticated)
- `DELETE /api/links/{slug}` - Delete link (authenticated)

### Domains
- `POST /api/domains` - Add custom domain (authenticated)
- `GET /api/domains` - List user's domains (authenticated)
- `POST /api/domains/{id}/verify` - Verify domain ownership (authenticated)
- `DELETE /api/domains/{id}` - Remove domain (authenticated)

## Rate Limits

- **Free Tier**: 1,000 API calls/day
- **Pro Tier**: 10,000 API calls/day

## Performance Targets

- Redirect Latency (p95): <50ms
- Link Creation Time: <200ms
- JWT Validation Time: <5ms
- Uptime: 99.9%

## Security Features

- JWT-based authentication with HS256
- Device fingerprinting for token theft detection
- 24-hour access token expiration
- 30-day refresh token expiration
- HTTPS-only (enforced by Cloudflare)
- Rate limiting per user tier
- GDPR compliant (no PII tracking)

## Database Schema

See `schema.sql` for complete database structure including:
- Users and authentication
- Links and redirects
- Refresh tokens
- Custom domains
- Usage tracking
- Webhooks

## Monitoring

- Built-in Cloudflare Workers Analytics
- Custom metrics via Analytics Engine
- Performance monitoring via Workers dashboard
- Error tracking and alerting

## Development Roadmap

- [x] Week 1: Core redirect engine + JWT
- [ ] Week 2: Analytics + D1 setup
- [ ] Week 3: Custom domains + security
- [ ] Week 4: Polish + launch (MVP)
