# EdgeLink Local Development Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn installed
- Wrangler CLI installed: `npm install -g wrangler`
- Cloudflare account (for wrangler login)

### Initial Setup

1. **Login to Wrangler**
   ```bash
   wrangler login
   ```

2. **Set JWT Secrets (Required for Authentication)**
   ```bash
   cd edgelink/backend

   # Set JWT secret (use a strong random string)
   wrangler secret put JWT_SECRET
   # When prompted, enter: your-super-secret-jwt-key-at-least-64-characters-long-for-security

   # Set refresh token secret
   wrangler secret put REFRESH_TOKEN_SECRET
   # When prompted, enter: your-super-secret-refresh-token-key-at-least-64-characters-long
   ```

3. **Initialize Database**
   ```bash
   cd edgelink/backend

   # Create tables
   wrangler d1 execute edgelink-production --file=./schema.sql --local
   ```

## 🛠️ Running the Application

### Method 1: Using Two Terminals (Recommended)

**Terminal 1 - Backend:**
```bash
cd edgelink/backend
npm install
npm run dev
```

This starts the backend at: `http://localhost:8787`

**Terminal 2 - Frontend:**
```bash
cd edgelink/frontend
npm install
npm run dev
```

This starts the frontend at: `http://localhost:3000`

### Method 2: Using npm-run-all (Single Command)

From the root directory:
```bash
npm install
npm run dev
```

## 🔍 Testing the Setup

1. **Check Backend Health**
   ```bash
   curl http://localhost:8787/health
   ```

   Should return:
   ```json
   {
     "status": "healthy",
     "timestamp": 1234567890,
     "version": "1.0.0"
   }
   ```

2. **Test Signup**
   ```bash
   curl -X POST http://localhost:8787/auth/signup \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "TestPass123",
       "name": "Test User"
     }'
   ```

3. **Access Frontend**
   - Open browser: `http://localhost:3000`
   - Click "Sign Up" and create an account
   - Try logging in

## 📁 Environment Files

### Frontend (.env.local)
Already configured with:
```env
NEXT_PUBLIC_API_URL=http://localhost:8787
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_ENVIRONMENT=development
```

### Backend (wrangler.toml)
Already configured with:
```toml
[vars]
ENVIRONMENT = "development"
FRONTEND_URL = "http://localhost:3000"
```

## 🐛 Troubleshooting

### "Failed to Fetch" Error on Login/Signup

**Symptoms:**
- Login or signup shows "Failed to fetch" error
- Network tab shows `net::ERR_CONNECTION_REFUSED`

**Solutions:**

1. **Backend Not Running**
   - Make sure backend is running on port 8787
   - Check Terminal 1 for backend logs
   - Restart backend: `cd edgelink/backend && npm run dev`

2. **Port Already in Use**
   ```bash
   # Kill process on port 8787
   lsof -ti:8787 | xargs kill -9

   # Kill process on port 3000
   lsof -ti:3000 | xargs kill -9
   ```

3. **JWT Secrets Not Set**
   ```bash
   cd edgelink/backend
   wrangler secret put JWT_SECRET --local
   wrangler secret put REFRESH_TOKEN_SECRET --local
   ```

4. **Database Not Initialized**
   ```bash
   cd edgelink/backend
   wrangler d1 execute edgelink-production --file=./schema.sql --local
   ```

5. **CORS Issues**
   - Check browser console for CORS errors
   - Backend already configured to allow all origins
   - Clear browser cache and try again

### "Database Error" on Signup

**Solution:**
```bash
cd edgelink/backend
wrangler d1 execute edgelink-production --file=./schema.sql --local
```

### Frontend Shows "500 Internal Server Error"

**Check Backend Logs:**
- Look at Terminal 1 (backend) for error messages
- Common issues:
  - Missing JWT secrets
  - Database not initialized
  - Missing environment variables

### Port Conflicts

**Change Ports:**

Backend (in package.json):
```json
"dev": "wrangler dev --port 8788"
```

Frontend (in package.json):
```json
"dev": "next dev -p 3001"
```

Then update .env.local:
```env
NEXT_PUBLIC_API_URL=http://localhost:8788
```

## 🔄 Restart Everything

If things aren't working, try a full restart:

```bash
# Kill all processes
pkill -f wrangler
pkill -f next

# Backend
cd edgelink/backend
npm run dev

# Frontend (new terminal)
cd edgelink/frontend
npm run dev
```

## 📝 Common Development Tasks

### Create a Short Link
```bash
# Get access token first by logging in through the UI, then:
curl -X POST http://localhost:8787/api/shorten \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "url": "https://example.com",
    "custom_slug": "test123"
  }'
```

### View Database
```bash
cd edgelink/backend
wrangler d1 execute edgelink-production --command="SELECT * FROM users" --local
wrangler d1 execute edgelink-production --command="SELECT * FROM links" --local
```

### Clear Local Data
```bash
cd edgelink/backend

# Clear all users
wrangler d1 execute edgelink-production --command="DELETE FROM users" --local

# Clear all links
wrangler d1 execute edgelink-production --command="DELETE FROM links" --local
```

## 🌐 Production URLs (For Reference)

When deploying to production:
- **Frontend:** `https://shortedbro.xyz`
- **Backend API:** `https://go.shortedbro.xyz`
- **Short Links:** `https://go.shortedbro.xyz/{slug}`

## 📞 Need Help?

If you're still having issues:
1. Check the browser console for errors (F12)
2. Check the backend terminal for error logs
3. Verify all secrets are set: `wrangler secret list`
4. Try deleting node_modules and reinstalling:
   ```bash
   rm -rf edgelink/frontend/node_modules edgelink/backend/node_modules
   cd edgelink/frontend && npm install
   cd ../backend && npm install
   ```

## ✅ Quick Checklist

Before starting development, ensure:
- [ ] Wrangler is logged in
- [ ] JWT secrets are set
- [ ] Database schema is applied
- [ ] Backend is running on port 8787
- [ ] Frontend is running on port 3000
- [ ] .env.local exists in frontend directory
- [ ] No port conflicts
