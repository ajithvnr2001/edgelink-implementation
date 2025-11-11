# EdgeLink Frontend - Windows PowerShell Deployment Script
# Alternative deployment without next-on-pages

Write-Host "🚀 Starting deployment..." -ForegroundColor Green

# Clean previous builds
Write-Host "🧹 Cleaning previous builds..." -ForegroundColor Yellow
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force out -ErrorAction SilentlyContinue

# Build with standard Next.js export
Write-Host "🔨 Building Next.js..." -ForegroundColor Yellow
npm run build

# Create _routes.json for Cloudflare Pages
Write-Host "📝 Creating Cloudflare Pages routes..." -ForegroundColor Yellow
$routesJson = @"
{
  "version": 1,
  "include": ["/*"],
  "exclude": []
}
"@

New-Item -Path ".next" -Name "_routes.json" -ItemType File -Value $routesJson -Force

# Deploy to Cloudflare Pages
Write-Host "☁️  Deploying to Cloudflare Pages..." -ForegroundColor Yellow
wrangler pages deploy .next --project-name=edgelink-production --branch=main --commit-dirty=true

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "🌐 Your site: https://edgelink-production.pages.dev" -ForegroundColor Cyan
