'use client'

export const runtime = 'edge';

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeftIcon,
  ChartBarIcon,
  PlusIcon,
  TrashIcon,
  FolderIcon,
} from '@heroicons/react/24/outline'
import {
  getGroup,
  removeLinksFromGroup,
  deleteLink,
  getUser,
  Link as LinkType,
  LinkGroup,
} from '@/lib/api'
import MobileNav from '@/components/MobileNav'
import BottomNav from '@/components/BottomNav'
import LinkCard from '@/components/LinkCard'

export default function GroupDetailPage() {
  const router = useRouter()
  const params = useParams()
  const groupId = params.id as string

  const [group, setGroup] = useState<LinkGroup | null>(null)
  const [links, setLinks] = useState<LinkType[]>([])
  const [total, setTotal] = useState(0)
  const [totalClicks, setTotalClicks] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState<{ email: string; plan: string } | null>(null)

  // Selected links for bulk operations
  const [selectedLinks, setSelectedLinks] = useState<Set<string>>(new Set())
  const [bulkRemoving, setBulkRemoving] = useState(false)

  const shortDomain = process.env.NEXT_PUBLIC_SHORT_DOMAIN || 'https://edgelink.dev'

  useEffect(() => {
    const userData = getUser()
    if (!userData) {
      router.push('/login')
      return
    }
    setUser(userData)
  }, [router])

  useEffect(() => {
    if (groupId) {
      loadGroup()
    }
  }, [groupId, page])

  const loadGroup = async () => {
    try {
      setLoading(true)
      const data = await getGroup(groupId, { page, limit: 50 })
      setGroup(data.group)
      setLinks(data.links)
      setTotal(data.total)
      setTotalClicks(data.total_clicks)
      setTotalPages(data.total_pages)
    } catch (err: any) {
      setError(err.message || 'Failed to load group')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteLink = async (slug: string) => {
    if (!confirm('Are you sure you want to delete this link?')) return

    try {
      await deleteLink(slug)
      loadGroup()
    } catch (err: any) {
      alert(err.message || 'Failed to delete link')
    }
  }

  const handleRemoveFromGroup = async (slug: string) => {
    try {
      await removeLinksFromGroup(groupId, [slug])
      loadGroup()
    } catch (err: any) {
      alert(err.message || 'Failed to remove link from group')
    }
  }

  const handleBulkRemove = async () => {
    if (selectedLinks.size === 0) return

    setBulkRemoving(true)
    try {
      await removeLinksFromGroup(groupId, Array.from(selectedLinks))
      setSelectedLinks(new Set())
      loadGroup()
    } catch (err: any) {
      alert(err.message || 'Failed to remove links from group')
    } finally {
      setBulkRemoving(false)
    }
  }

  const toggleSelectLink = (slug: string) => {
    const newSelected = new Set(selectedLinks)
    if (newSelected.has(slug)) {
      newSelected.delete(slug)
    } else {
      newSelected.add(slug)
    }
    setSelectedLinks(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedLinks.size === links.length) {
      setSelectedLinks(new Set())
    } else {
      setSelectedLinks(new Set(links.map((l) => l.slug)))
    }
  }

  if (loading && !group) {
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900">
        <MobileNav />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <Link
              href="/groups"
              className="text-blue-400 hover:text-blue-300"
            >
              Back to Groups
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
        <div className="mb-6">
          <Link
            href="/groups"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Groups
          </Link>

          {group && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: group.color }}
                >
                  <FolderIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">{group.name}</h1>
                  <p className="text-gray-400">
                    {total} links &middot; {totalClicks.toLocaleString()} clicks
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/groups/${groupId}/analytics`}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  <ChartBarIcon className="h-5 w-5" />
                  Analytics
                </Link>
                <Link
                  href="/create"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <PlusIcon className="h-5 w-5" />
                  Add Link
                </Link>
              </div>
            </div>
          )}

          {group?.description && (
            <p className="mt-3 text-gray-400">{group.description}</p>
          )}
        </div>

        {/* Bulk actions */}
        {selectedLinks.size > 0 && (
          <div className="mb-4 p-3 bg-gray-800 rounded-lg border border-gray-700 flex items-center justify-between">
            <span className="text-gray-300">
              {selectedLinks.size} link{selectedLinks.size !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={handleBulkRemove}
              disabled={bulkRemoving}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded transition-colors"
            >
              <TrashIcon className="h-4 w-4" />
              {bulkRemoving ? 'Removing...' : 'Remove from Group'}
            </button>
          </div>
        )}

        {/* Select all */}
        {links.length > 0 && (
          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedLinks.size === links.length}
                onChange={toggleSelectAll}
                className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
              />
              Select all
            </label>
          </div>
        )}

        {/* Links List */}
        <div className="space-y-3">
          {links.map((link) => (
            <div key={link.slug} className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selectedLinks.has(link.slug)}
                onChange={() => toggleSelectLink(link.slug)}
                className="mt-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <LinkCard
                  link={link}
                  shortDomain={shortDomain}
                  isPro={user?.plan === 'pro'}
                  onDelete={handleDeleteLink}
                  onMoveToGroup={() => handleRemoveFromGroup(link.slug)}
                />
              </div>
            </div>
          ))}

          {links.length === 0 && !loading && (
            <div className="text-center py-12">
              <FolderIcon className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                No links in this group
              </h3>
              <p className="text-gray-400 mb-4">
                Add links to this group from the dashboard
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Go to Dashboard
              </Link>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded transition-colors"
            >
              Previous
            </button>
            <span className="text-gray-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
