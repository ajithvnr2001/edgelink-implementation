'use client'

export const runtime = 'edge';

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChartBarIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon,
  LinkIcon,
  FolderIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { getOverallAnalytics, getUser } from '@/lib/api'
import MobileNav from '@/components/MobileNav'
import BottomNav from '@/components/BottomNav'

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

export default function OverallAnalyticsPage() {
  const router = useRouter()
  const [analytics, setAnalytics] = useState<any>(null)
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState<{ email: string; plan: string } | null>(null)

  useEffect(() => {
    const userData = getUser()
    if (!userData) {
      router.push('/login')
      return
    }
    setUser(userData)
  }, [router])

  useEffect(() => {
    if (user) {
      loadAnalytics()
    }
  }, [user, timeRange])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const data = await getOverallAnalytics(timeRange)
      setAnalytics(data)
    } catch (err: any) {
      if (err.code === 'PRO_REQUIRED') {
        setError('pro_required')
      } else {
        setError(err.message || 'Failed to load analytics')
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading && !analytics) {
    return (
      <div className="min-h-screen bg-gray-900">
        <MobileNav />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
        <BottomNav />
      </div>
    )
  }

  if (error === 'pro_required') {
    return (
      <div className="min-h-screen bg-gray-900">
        <MobileNav />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto text-center">
            <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
              <ChartBarIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white mb-2">
                Overall Analytics
              </h1>
              <p className="text-gray-400 mb-6">
                View aggregated analytics across all your links. This is a Pro feature.
              </p>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Upgrade to Pro
                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900">
        <MobileNav />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <Link href="/dashboard" className="text-blue-400 hover:text-blue-300">
              Back to Dashboard
            </Link>
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <MobileNav />

      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Overall Analytics</h1>
            <p className="text-gray-400 mt-1">
              {analytics?.total_links || 0} links &middot;{' '}
              {analytics?.total_clicks?.toLocaleString() || 0} total clicks
            </p>
          </div>

          {/* Time range selector */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTimeRange('7d')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                timeRange === '7d'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                timeRange === '30d'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              30 Days
            </button>
          </div>
        </div>

        {analytics && (
          <div className="space-y-6">
            {/* Clicks over time */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">
                Clicks Over Time
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.time_series}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="date"
                      stroke="#9CA3AF"
                      fontSize={12}
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })
                      }
                    />
                    <YAxis stroke="#9CA3AF" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '0.5rem',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="clicks"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Groups Breakdown */}
            {analytics.groups_breakdown && analytics.groups_breakdown.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FolderIcon className="h-5 w-5" />
                  Performance by Group
                </h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.groups_breakdown} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                      <YAxis
                        dataKey="group_name"
                        type="category"
                        stroke="#9CA3AF"
                        fontSize={12}
                        width={100}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '0.5rem',
                        }}
                      />
                      <Bar dataKey="clicks" radius={[0, 4, 4, 0]}>
                        {analytics.groups_breakdown.map((entry: any, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Devices */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <DevicePhoneMobileIcon className="h-5 w-5" />
                  Devices
                </h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.devices}
                        dataKey="clicks"
                        nameKey="device"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        label={({ device, percent }) =>
                          `${device} ${(percent * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {analytics.devices.map((_: any, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '0.5rem',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Countries */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <GlobeAltIcon className="h-5 w-5" />
                  Top Countries
                </h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.countries.slice(0, 5)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                      <YAxis
                        dataKey="country"
                        type="category"
                        stroke="#9CA3AF"
                        fontSize={12}
                        width={50}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '0.5rem',
                        }}
                      />
                      <Bar dataKey="clicks" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Top Links */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                Top Performing Links
              </h3>
              <div className="space-y-2">
                {analytics.top_links.map((link: any, index: number) => (
                  <div
                    key={link.slug}
                    className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 w-6">{index + 1}.</span>
                      <Link
                        href={`/analytics/${link.slug}`}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        {link.slug}
                      </Link>
                    </div>
                    <span className="text-gray-300">
                      {link.clicks.toLocaleString()} clicks
                    </span>
                  </div>
                ))}
                {analytics.top_links.length === 0 && (
                  <p className="text-gray-400 text-center py-4">No data available</p>
                )}
              </div>
            </div>

            {/* Referrers */}
            {analytics.referrers.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Top Referrers
                </h3>
                <div className="space-y-2">
                  {analytics.referrers.map((ref: any, index: number) => (
                    <div
                      key={ref.referrer}
                      className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500 w-6">{index + 1}.</span>
                        <span className="text-gray-300 truncate">
                          {ref.referrer || 'Direct'}
                        </span>
                      </div>
                      <span className="text-gray-300">
                        {ref.clicks.toLocaleString()} clicks
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
