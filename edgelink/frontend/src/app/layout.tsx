import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'EdgeLink - Developer-First URL Shortener',
  description: 'Fast, affordable URL shortener built on Cloudflare Edge. Free tier with 500 links/month, 1K API calls/day, and 1 custom domain.',
  keywords: ['url shortener', 'link shortener', 'cloudflare', 'edge computing', 'developer tools'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
