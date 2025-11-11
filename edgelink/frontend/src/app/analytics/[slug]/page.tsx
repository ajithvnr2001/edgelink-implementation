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
  const [user, setUser] = useState<any>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d')
  const [realtimeMode, setRealtimeMode] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  useEffect(() => {
    const currentUser = getUser()
    if (!currentUser) {
      router.push('/login')
      return
    }
    setUser(currentUser)

    fetchAnalytics()
  }, [timeRange, resolvedParams.slug])

  // Real-time polling effect
  useEffect(() => {
    if (!realtimeMode) return

    const interval = setInterval(() => {
      fetchAnalytics(true) // Silent update
    }, 2000)

    return () => clearInterval(interval)
  }, [realtimeMode, timeRange, resolvedParams.slug])

  async function fetchAnalytics(silent = false) {
    try {
      if (!silent) setLoading(true)
      const data = await getLinkAnalytics(resolvedParams.slug, timeRange) as AnalyticsData
      setAnalytics(data)
      setLastUpdate(new Date())
    } catch (err: any) {
      setError(err.message)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const toggleRealtimeMode = () => {
    if (!user || user.plan !== 'pro') {
      alert('Real-time analytics is a Pro feature. Upgrade to unlock live updates!')
      return
    }
    setRealtimeMode(!realtimeMode)
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

          {/* Time Range Selector & Real-time Toggle */}
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
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

            {/* Real-time Toggle */}
            <div className="flex items-center gap-4">
              <button
                onClick={toggleRealtimeMode}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  realtimeMode
                    ? 'bg-green-600 text-white'
                    : user?.plan === 'pro'
                    ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                }`}
                title={user?.plan !== 'pro' ? 'Real-time analytics is a Pro feature' : 'Toggle real-time updates'}
              >
                {realtimeMode ? (
                  <>
                    <span className="animate-pulse">🔴</span>
                    <span>LIVE</span>
                  </>
                ) : (
                  <>
                    {user?.plan === 'pro' ? '▶️' : '🔒'}
                    <span>Real-time</span>
                  </>
                )}
              </button>
              {realtimeMode && (
                <div className="text-sm text-gray-400">
                  Last update: {lastUpdate.toLocaleTimeString()}
                </div>
              )}
            </div>
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
        <div className={`bg-gray-800 rounded-lg p-6 mb-6 ${realtimeMode ? 'ring-2 ring-green-500 ring-opacity-50' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Geographic Distribution</h2>
            {realtimeMode && (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <span className="animate-pulse">●</span>
                Live Updates
              </span>
            )}
          </div>
          <div className="bg-gray-900 rounded-lg p-4 mb-4 text-center">
            <p className="text-gray-400">🗺️ Interactive map coming soon with MapBox integration</p>
          </div>

          {/* Top 10 Countries Table */}
          {user?.plan === 'pro' && analytics.analytics.geographic.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3 text-gray-300">Top 10 Countries</h3>
              <div className="bg-gray-900 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-950">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Rank</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Country</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Clicks</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {analytics.analytics.geographic.slice(0, 10).map((geo, index) => {
                      const percentage = analytics.total_clicks > 0
                        ? ((geo.clicks / analytics.total_clicks) * 100).toFixed(1)
                        : '0.0';
                      return (
                        <tr key={geo.country} className={`hover:bg-gray-850 transition-colors ${realtimeMode ? 'animate-pulse-slow' : ''}`}>
                          <td className="px-4 py-3 text-sm text-gray-400">#{index + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              <span className="text-2xl mr-3">{getFlagEmoji(geo.country)}</span>
                              <span className="font-medium text-white">{geo.country_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-lg font-semibold text-blue-400">{geo.clicks.toLocaleString()}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 bg-gray-700 rounded-full h-2">
                                <div
                                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-400 w-12 text-right">{percentage}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* All Countries List */}
          <div>
            <h3 className="text-lg font-medium mb-3 text-gray-300">All Countries ({analytics.analytics.geographic.length})</h3>
            <div className="space-y-2">
              {analytics.analytics.geographic.map((geo) => (
                <div key={geo.country} className="flex justify-between items-center py-2 border-b border-gray-700 hover:bg-gray-750 transition-colors">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">{getFlagEmoji(geo.country)}</span>
                    <span>{geo.country_name}</span>
                  </div>
                  <span className="text-gray-400">{geo.clicks} clicks</span>
                </div>
              ))}
            </div>
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
