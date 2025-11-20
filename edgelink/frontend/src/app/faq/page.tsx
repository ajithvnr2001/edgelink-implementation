'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

interface FAQItem {
  question: string
  answer: string
  category: string
}

const faqItems: FAQItem[] = [
  // General
  {
    category: 'General',
    question: 'What is EdgeLink?',
    answer: 'EdgeLink is a fast, developer-friendly URL shortening service built on Cloudflare Edge. It offers lightning-fast redirects (under 50ms globally), a powerful REST API, and advanced features like analytics, custom domains, and device/geo routing.',
  },
  {
    category: 'General',
    question: 'How fast are EdgeLink redirects?',
    answer: 'EdgeLink redirects happen in under 50ms globally thanks to Cloudflare\'s edge network. Your shortened links are served from data centers closest to your users worldwide.',
  },
  {
    category: 'General',
    question: 'Can I use EdgeLink without creating an account?',
    answer: 'Yes! You can create anonymous short links without signing up. However, anonymous links expire after 30 days and don\'t include analytics. Create a free account to get permanent links, click tracking, and more features.',
  },
  // Pricing & Plans
  {
    category: 'Pricing & Plans',
    question: 'What\'s included in the Free plan?',
    answer: 'The Free plan includes up to 1,000 shortened links, 10,000 clicks per month, 100 API calls per day, basic link management, and access to the dashboard. It\'s perfect for personal use and small projects.',
  },
  {
    category: 'Pricing & Plans',
    question: 'What does the Pro plan offer?',
    answer: 'The Pro plan ($15/month) includes 100,000 links, 500,000 clicks/month, unlimited API calls, detailed analytics (geographic, device, referrer data), custom domains, QR codes, link groups, device/geo routing, webhooks, and priority support.',
  },
  {
    category: 'Pricing & Plans',
    question: 'Can I upgrade or downgrade my plan?',
    answer: 'Yes, you can upgrade to Pro at any time from your billing settings. If you downgrade, you\'ll keep your existing links but lose access to Pro features. Your data is always preserved.',
  },
  {
    category: 'Pricing & Plans',
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards and debit cards through our secure payment processor. All payments are processed securely with industry-standard encryption.',
  },
  // Features
  {
    category: 'Features',
    question: 'What are custom domains?',
    answer: 'Custom domains allow you to use your own domain (like links.yourbrand.com) for shortened URLs instead of edgelk.io. This provides better branding and increased trust. Available on the Pro plan.',
  },
  {
    category: 'Features',
    question: 'How does device routing work?',
    answer: 'Device routing lets you redirect users to different destinations based on their device type (desktop, mobile, tablet). For example, send mobile users to your app store page and desktop users to your website.',
  },
  {
    category: 'Features',
    question: 'What is geo routing?',
    answer: 'Geo routing redirects users to different URLs based on their geographic location. Perfect for showing localized content or directing users to region-specific pages.',
  },
  {
    category: 'Features',
    question: 'Can I create QR codes for my links?',
    answer: 'Yes! Pro users can generate QR codes for any shortened link. QR codes are perfect for print materials, presentations, and offline-to-online marketing campaigns.',
  },
  {
    category: 'Features',
    question: 'What analytics data do you provide?',
    answer: 'Pro analytics include click counts over time, geographic distribution (countries and cities), device types, browsers, operating systems, referrer sources, and time-based patterns. All data is available via API.',
  },
  {
    category: 'Features',
    question: 'What are link groups?',
    answer: 'Link groups help you organize your shortened links into collections. You can view aggregate analytics for a group, making it easy to track campaigns or projects with multiple links.',
  },
  // API & Integration
  {
    category: 'API & Integration',
    question: 'Do you have an API?',
    answer: 'Yes! EdgeLink offers a comprehensive REST API with JWT authentication. You can create, update, delete, and retrieve links programmatically. Free users get 100 API calls/day, Pro users get unlimited calls.',
  },
  {
    category: 'API & Integration',
    question: 'What are webhooks?',
    answer: 'Webhooks notify your server when events occur, such as when a link receives a click or is created/updated. Pro users can configure webhook endpoints to integrate EdgeLink with their workflows.',
  },
  {
    category: 'API & Integration',
    question: 'Can I import/export my links?',
    answer: 'Yes, Pro users can bulk import links from CSV files and export all their links with analytics data. This makes migration and backup easy.',
  },
  // Account & Security
  {
    category: 'Account & Security',
    question: 'How do I reset my password?',
    answer: 'Click "Forgot Password" on the login page and enter your email address. You\'ll receive a password reset link that\'s valid for 1 hour.',
  },
  {
    category: 'Account & Security',
    question: 'Is my data secure?',
    answer: 'Yes. We use industry-standard security practices including HTTPS encryption, secure password hashing (bcrypt), and JWT authentication. Your data is stored on Cloudflare\'s secure infrastructure.',
  },
  {
    category: 'Account & Security',
    question: 'Can I delete my account?',
    answer: 'Yes, you can delete your account from Settings > Account. This will permanently delete all your data including links, analytics, and account information. This action cannot be undone.',
  },
  {
    category: 'Account & Security',
    question: 'Do you share my data with third parties?',
    answer: 'No, we never sell or share your personal data with third parties. We only use trusted service providers (like Cloudflare) necessary to operate the service. See our Privacy Policy for details.',
  },
  // Technical
  {
    category: 'Technical',
    question: 'What happens if I exceed my plan limits?',
    answer: 'If you exceed your click limit, your links will continue to work but analytics won\'t be recorded for excess clicks. If you exceed your link limit, you\'ll need to delete some links or upgrade to create more.',
  },
  {
    category: 'Technical',
    question: 'Can I use custom slugs?',
    answer: 'Yes! When creating a link, you can specify a custom slug (5-20 alphanumeric characters). If the slug is already taken, you\'ll be prompted to choose another one.',
  },
  {
    category: 'Technical',
    question: 'Do links expire?',
    answer: 'Anonymous links expire after 30 days. Links created by registered users don\'t expire unless you set a specific expiration date. Pro users can set automatic expiration for any link.',
  },
  {
    category: 'Technical',
    question: 'What characters are allowed in custom slugs?',
    answer: 'Custom slugs can contain letters (a-z, A-Z), numbers (0-9), hyphens (-), and underscores (_). They must be between 5 and 20 characters long.',
  },
]

export default function FAQPage() {
  const { isSignedIn, isLoaded } = useAuth()
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  const categories = ['All', ...Array.from(new Set(faqItems.map(item => item.category)))]

  const filteredItems = selectedCategory === 'All'
    ? faqItems
    : faqItems.filter(item => item.category === selectedCategory)

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-500 rounded-lg"></div>
              <h1 className="text-xl font-bold text-white">EdgeLink</h1>
            </Link>
          </div>
          <nav className="hidden md:flex items-center space-x-4">
            <Link href="/pricing" className="text-gray-300 hover:text-white">
              Pricing
            </Link>
            <Link href="/docs" className="text-gray-300 hover:text-white">
              Docs
            </Link>
            <Link href="/privacy" className="text-gray-300 hover:text-white">
              Privacy
            </Link>
            {isLoaded && isSignedIn ? (
              <Link href="/dashboard" className="btn-primary">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-gray-300 hover:text-white">
                  Sign In
                </Link>
                <Link href="/signup" className="btn-primary">
                  Sign Up
                </Link>
              </>
            )}
          </nav>
          {/* Mobile nav links */}
          <nav className="flex md:hidden items-center space-x-2">
            {isLoaded && isSignedIn ? (
              <Link href="/dashboard" className="btn-primary text-sm px-3 py-1.5">
                Dashboard
              </Link>
            ) : (
              <Link href="/login" className="btn-primary text-sm px-3 py-1.5">
                Sign In
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-4">Frequently Asked Questions</h1>
          <p className="text-gray-400 mb-8">
            Find answers to common questions about EdgeLink. Can&apos;t find what you&apos;re looking for? Check our{' '}
            <Link href="/docs" className="text-primary-500 hover:text-primary-400">
              documentation
            </Link>{' '}
            or contact support.
          </p>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => {
                  setSelectedCategory(category)
                  setOpenIndex(null)
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* FAQ Items */}
          <div className="space-y-3">
            {filteredItems.map((item, index) => (
              <div
                key={index}
                className="card overflow-hidden"
              >
                <button
                  onClick={() => toggleItem(index)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-750 transition-colors"
                >
                  <div className="flex-1 pr-4">
                    <span className="text-xs text-primary-500 font-medium uppercase tracking-wide">
                      {item.category}
                    </span>
                    <h3 className="text-white font-medium mt-1">{item.question}</h3>
                  </div>
                  <ChevronDownIcon
                    className={`h-5 w-5 text-gray-400 shrink-0 transition-transform duration-200 ${
                      openIndex === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openIndex === index && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-300 leading-relaxed">{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* CTA Section */}
          <div className="card p-8 mt-12 text-center">
            <h2 className="text-2xl font-semibold text-white mb-4">Still have questions?</h2>
            <p className="text-gray-400 mb-6">
              Check out our comprehensive documentation or get in touch with our support team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/docs" className="btn-primary">
                View Documentation
              </Link>
              <a
                href="mailto:support@edgelink.io"
                className="btn-secondary"
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-700 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">© 2025 EdgeLink. Built with Cloudflare Workers.</p>
            <div className="flex items-center space-x-6 mt-4 md:mt-0">
              <Link href="/privacy" className="text-gray-400 hover:text-white text-sm">
                Privacy Policy
              </Link>
              <Link href="/faq" className="text-gray-400 hover:text-white text-sm">
                FAQ
              </Link>
              <Link href="/docs" className="text-gray-400 hover:text-white text-sm">
                Documentation
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
