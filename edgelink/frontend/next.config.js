/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // For Cloudflare Pages with @cloudflare/next-on-pages
  // DO NOT set 'output' - next-on-pages handles this

  images: {
    unoptimized: true,
  },

  // Disable type checking during build (can enable later for production)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787',
  },
}

module.exports = nextConfig
