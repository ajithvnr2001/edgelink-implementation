'use client'

/**
 * Analytics Detail Page
 * Week 2: Comprehensive analytics dashboard with charts
 * Based on PRD Section 11 (Week 2)
 */

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getLinkAnalytics, getUser } from '@/lib/api'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

interface AnalyticsData {
  slug: string
  destination: string
  total_clicks: number
  created_at: string
  time_range: '7d' | '30d'
  analytics: {
    time_series: Array<{ date: string; clicks: number }>
    geographic: Array<{ country: string; country_name: string; clicks: number }>
    devices: Array<{ device: string; clicks: number; percentage: number }>
    browsers: Array<{ browser: string; clicks: number; percentage: number }>
    operating_systems: Array<{ os: string; clicks: number; percentage: number }>
    referrers: Array<{ referrer: string; clicks: number; percentage: number }>
  }
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

export default function AnalyticsPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d')

  useEffect(() => {
    const user = getUser()
    if (!user) {
      router.push('/login')
      return
    }

    fetchAnalytics()
  }, [timeRange, resolvedParams.slug])

  async function fetchAnalytics() {
    try {
      setLoading(true)
      const data = await getLinkAnalytics(resolvedParams.slug, timeRange) as AnalyticsData
      setAnalytics(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error || !analytics) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Failed to load analytics'}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-500 hover:underline"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-400 hover:text-white mb-2 text-sm"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-3xl font-bold">Analytics</h1>
              <p className="text-gray-400 mt-1">/{analytics.slug}</p>
              <p className="text-sm text-gray-500 mt-1">{analytics.destination}</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-blue-500">{analytics.total_clicks}</div>
              <div className="text-sm text-gray-400">Total Clicks</div>
            </div>
          </div>

          {/* Time Range Selector */}
          <div className="mt-6 flex gap-2">
            <button
              onClick={() => setTimeRange('7d')}
              className={`px-4 py-2 rounded-lg ${
                timeRange === '7d'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              className={`px-4 py-2 rounded-lg ${
                timeRange === '30d'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Last 30 Days
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Time Series Chart */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Clicks Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.analytics.time_series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '0.5rem' }}
                labelStyle={{ color: '#F3F4F6' }}
              />
              <Legend />
              <Line type="monotone" dataKey="clicks" stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Device Breakdown */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Devices</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={analytics.analytics.devices}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ device, percentage }) => `${device}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="clicks"
                  nameKey="device"
                >
                  {analytics.analytics.devices.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '0.5rem' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {analytics.analytics.devices.map((device, index) => (
                <div key={device.device} className="flex justify-between text-sm">
                  <div className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <span className="capitalize">{device.device}</span>
                  </div>
                  <span className="text-gray-400">
                    {device.clicks} ({device.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Browser Breakdown */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Browsers</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.analytics.browsers}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="browser" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '0.5rem' }}
                />
                <Bar dataKey="clicks" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Geographic Distribution</h2>
          <div className="bg-gray-900 rounded-lg p-4 mb-4 text-center">
            <p className="text-gray-400">🗺️ Interactive map coming soon with MapBox integration</p>
          </div>
          <div className="space-y-2">
            {analytics.analytics.geographic.map((geo) => (
              <div key={geo.country} className="flex justify-between items-center">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{getFlagEmoji(geo.country)}</span>
                  <span>{geo.country_name}</span>
                </div>
                <span className="text-gray-400">{geo.clicks} clicks</span>
              </div>
            ))}
          </div>
        </div>

        {/* Operating Systems */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Operating Systems</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {analytics.analytics.operating_systems.map((os) => (
              <div key={os.os} className="bg-gray-900 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-500">{os.clicks}</div>
                <div className="text-sm text-gray-400">{os.os}</div>
                <div className="text-xs text-gray-500">{os.percentage}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Referrers */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Top Referrers</h2>
          <div className="space-y-2">
            {analytics.analytics.referrers.map((ref) => (
              <div key={ref.referrer} className="flex justify-between items-center py-2 border-b border-gray-700">
                <div>
                  <span className="font-medium">{ref.referrer}</span>
                  <span className="text-sm text-gray-400 ml-2">({ref.percentage}%)</span>
                </div>
                <span className="text-gray-400">{ref.clicks} clicks</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}
