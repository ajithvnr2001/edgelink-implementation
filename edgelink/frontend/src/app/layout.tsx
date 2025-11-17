import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'EdgeLink - Developer-First URL Shortener',
  description: 'Fast, affordable URL shortener built on Cloudflare Edge. Free tier with 1,000 links, 10K clicks/month. Pro: 100K links, 500K clicks/month, $15/mo.',
  keywords: ['url shortener', 'link shortener', 'cloudflare', 'edge computing', 'developer tools', 'api', 'webhooks', 'custom domains'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans">
        {children}
      </body>
    </html>
  )
}
