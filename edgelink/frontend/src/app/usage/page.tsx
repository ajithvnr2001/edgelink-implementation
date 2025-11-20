'use client'

export const runtime = 'edge';

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getUsage, getUser, type UsageData } from '@/lib/api'
import MobileNav from '@/components/MobileNav'
import BottomNav from '@/components/BottomNav'
import {
  ArrowLeftIcon,
  LinkIcon,
  CursorArrowRaysIcon,
  GlobeAltIcon,
  FolderIcon,
  KeyIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  CodeBracketIcon
} from '@heroicons/react/24/outline'

export default function UsagePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadData = async () => {
      const currentUser = getUser()
      if (!currentUser) {
        router.push('/login')
        return
      }
      setUser(currentUser)

      try {
        const usageData = await getUsage()
        setUsage(usageData)
      } catch (err: any) {
        setError(err.message || 'Failed to load usage data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  const formatNumber = (num: number) => {
    return num.toLocaleString()
  }

  const getUsagePercentage = (used: number, max: number) => {
    if (max === 0) return 0
    return Math.min((used / max) * 100, 100)
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const formatResetDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    )
  }

  if (!usage) return null

  const usageMetrics = [
    {
      name: 'Links',
      used: usage.usage.links,
      max: usage.limits.maxLinks,
      icon: LinkIcon,
      description: 'Total active links'
    },
    {
      name: 'Monthly Clicks',
      used: usage.usage.monthlyClicks,
      max: usage.limits.maxClicksPerMonth,
      icon: CursorArrowRaysIcon,
      description: 'Clicks across all links this month'
    },
    {
      name: 'API Calls Today',
      used: usage.usage.apiCallsToday,
      max: usage.limits.maxApiCallsPerDay,
      icon: CodeBracketIcon,
      description: 'API requests made today'
    },
    {
      name: 'Custom Domains',
      used: usage.usage.customDomains,
      max: usage.limits.maxCustomDomains,
      icon: GlobeAltIcon,
      description: 'Custom branded domains'
    },
    {
      name: 'Groups',
      used: usage.usage.groups,
      max: usage.limits.maxGroups,
      icon: FolderIcon,
      description: 'Link organization groups'
    }
  ]

  const features = [
    { name: 'Advanced Analytics', enabled: usage.features.analytics, description: 'Charts, graphs, and detailed insights' },
    { name: 'API Access', enabled: usage.features.apiAccess, description: 'Programmatic link management' },
    { name: 'QR Codes', enabled: usage.features.qrCode, description: 'Generate QR codes for links' },
    { name: 'Geographic Routing', enabled: usage.features.geoRouting, description: 'Route users by country' },
    { name: 'Device Routing', enabled: usage.features.deviceRouting, description: 'Route by mobile/desktop' },
    { name: 'Referrer Routing', enabled: usage.features.referrerRouting, description: 'Route by traffic source' },
    { name: 'Webhooks', enabled: usage.features.webhooks, description: 'Real-time click notifications' },
    { name: 'Bulk Operations', enabled: usage.features.bulkOperations, description: 'Import/Export links' },
    { name: 'Link Groups', enabled: usage.features.groups, description: 'Organize links into groups' },
    { name: 'Edit Slug', enabled: usage.features.editSlug, description: 'Change short URL after creation' },
    { name: 'Link Expiration', enabled: usage.features.linkExpiration, description: 'Set links to expire' },
    { name: 'Password Protection', enabled: usage.features.passwordProtection, description: 'Protect links with passwords' }
  ]

  return (
    <div className="min-h-screen bg-gray-900">
      <MobileNav />

      <main className="max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-6">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Dashboard
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Usage & Limits</h1>
              <p className="text-gray-400 mt-1">
                {usage.plan === 'lifetime' ? 'Lifetime Plan' : usage.plan === 'pro' ? 'Pro Plan' : 'Free Plan'} - Track your usage and limits
              </p>
            </div>

            {usage.plan === 'free' && (
              <Link
                href="/pricing"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Upgrade to Pro
              </Link>
            )}
          </div>
        </div>

        {/* Subscription Info for Pro Users */}
        {usage.subscription && (
          <div className={`border rounded-lg p-4 mb-6 ${
            usage.subscription.cancelAtPeriodEnd
              ? 'bg-yellow-500/10 border-yellow-500/30'
              : 'bg-gray-800 border-gray-700'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm">
                  <ArrowPathIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-400">
                    Billing cycle: <strong className="text-white">{formatResetDate(usage.subscription.periodStart)}</strong> - <strong className="text-white">{formatResetDate(usage.subscription.periodEnd)}</strong>
                  </span>
                </div>
                {usage.subscription.cancelAtPeriodEnd && (
                  <p className="text-yellow-500 text-sm mt-2">
                    Your subscription will cancel on {formatResetDate(usage.subscription.periodEnd)}. Pro features will be disabled after this date.
                  </p>
                )}
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                usage.subscription.status === 'active'
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {usage.subscription.status}
              </span>
            </div>
          </div>
        )}

        {/* Reset Notice for Free Users */}
        {!usage.subscription && usage.plan !== 'lifetime' && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <ArrowPathIcon className="h-4 w-4" />
              <span>Monthly limits reset on <strong className="text-white">{formatResetDate(usage.resetDate)}</strong></span>
            </div>
          </div>
        )}

        {/* Lifetime Notice */}
        {usage.plan === 'lifetime' && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-sm text-green-400">
              <CheckCircleIcon className="h-4 w-4" />
              <span>You have lifetime access - no monthly limits or renewal required!</span>
            </div>
          </div>
        )}

        {/* Usage Metrics */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Usage Metrics</h2>

          <div className="space-y-6">
            {usageMetrics.map((metric) => {
              const percentage = getUsagePercentage(metric.used, metric.max)
              const Icon = metric.icon

              return (
                <div key={metric.name}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-gray-400" />
                      <span className="text-white font-medium">{metric.name}</span>
                    </div>
                    <span className="text-sm text-gray-400">
                      {formatNumber(metric.used)} / {formatNumber(metric.max)}
                    </span>
                  </div>

                  <div className="w-full bg-gray-700 rounded-full h-2.5 mb-1">
                    <div
                      className={`h-2.5 rounded-full transition-all ${getProgressColor(percentage)}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>

                  <p className="text-xs text-gray-500">{metric.description}</p>
                </div>
              )
            })}
          </div>

          {/* API Keys */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyIcon className="h-5 w-5 text-gray-400" />
                <span className="text-white font-medium">API Keys</span>
              </div>
              <span className="text-sm text-gray-400">
                {usage.usage.apiKeys} active
              </span>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Feature Access</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature) => (
              <div
                key={feature.name}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  feature.enabled
                    ? 'bg-green-500/10 border border-green-500/20'
                    : 'bg-gray-700/50 border border-gray-600'
                }`}
              >
                {feature.enabled ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircleIcon className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <span className={`font-medium ${feature.enabled ? 'text-white' : 'text-gray-400'}`}>
                    {feature.name}
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upgrade CTA for Free Users */}
        {usage.plan === 'free' && (
          <div className="mt-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-center">
            <h3 className="text-xl font-bold text-white mb-2">Unlock More with Pro</h3>
            <p className="text-blue-100 mb-4">
              Get 100,000 links, 500,000 clicks/month, custom domains, and all premium features.
            </p>
            <Link
              href="/pricing"
              className="inline-block bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Upgrade Now
            </Link>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
