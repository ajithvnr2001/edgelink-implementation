# EdgeLink Frontend - Next.js Dashboard

Developer-first URL shortener dashboard built with Next.js 14 and Tailwind CSS.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local

# Edit .env.local and set:
# NEXT_PUBLIC_API_URL=http://localhost:8787 (for development)
# NEXT_PUBLIC_API_URL=https://your-worker.workers.dev (for production)
```

### 3. Development

```bash
npm run dev

# Open http://localhost:3000
```

### 4. Build

```bash
npm run build
```

### 5. Deploy to Cloudflare Pages

```bash
# Build for Cloudflare Pages
npm run pages:build

# Deploy
npm run pages:deploy

# Or use Cloudflare Pages dashboard for automatic deployments
```

## Features

### Implemented (Week 1 MVP)
- ✅ Anonymous link creation (homepage)
- ✅ User authentication (signup/login)
- ✅ Dashboard with link management
- ✅ Link creation with custom slugs
- ✅ Link deletion
- ✅ Click tracking display
- ✅ Responsive design
- ✅ Dark mode

### Coming Soon
- [ ] Link editing
- [ ] Link analytics charts
- [ ] QR code generation (Pro)
- [ ] Device/geo routing setup (Pro)
- [ ] Custom domain management
- [ ] Bulk operations
- [ ] API key management
- [ ] Team collaboration

## Project Structure

```
frontend/
├── src/
│   ├── app/                 # Next.js 14 App Router
│   │   ├── page.tsx         # Homepage (anonymous shortener)
│   │   ├── login/           # Login page
│   │   ├── signup/          # Signup page
│   │   ├── dashboard/       # Dashboard (authenticated)
│   │   ├── layout.tsx       # Root layout
│   │   └── globals.css      # Global styles
│   └── lib/                 # Utilities
│       └── api.ts           # API client
├── public/                  # Static assets
├── next.config.js           # Next.js config
├── tailwind.config.js       # Tailwind config
└── package.json             # Dependencies
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Deployment**: Cloudflare Pages
- **API**: REST API (Cloudflare Workers backend)
- **Auth**: JWT-based (stored in localStorage)

## Design System

### Colors
- Primary: #3B82F6 (Blue)
- Success: #10B981 (Green)
- Error: #EF4444 (Red)
- Dark Mode: Default theme

### Typography
- Sans: Inter
- Mono: JetBrains Mono

## API Integration

The frontend communicates with the Cloudflare Workers backend via REST API.

### Endpoints Used
- `POST /auth/signup` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - User logout
- `POST /api/shorten` - Create short link
- `GET /api/links` - Get user's links
- `PUT /api/links/:slug` - Update link
- `DELETE /api/links/:slug` - Delete link
- `GET /api/stats/:slug` - Get link analytics

## Performance

- Static export for Cloudflare Pages
- Client-side data fetching
- JWT authentication
- Responsive images
- Tailwind CSS optimizations

## Development Roadmap

- [x] Week 1: Basic UI + Auth + Link Management
- [ ] Week 2: Analytics dashboard
- [ ] Week 3: Custom domains UI
- [ ] Week 4: Pro features UI (QR, routing, etc.)
