'use client'

export const runtime = 'edge';

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  PlusIcon,
  FolderIcon,
  PencilIcon,
  TrashIcon,
  ChartBarIcon,
  LinkIcon,
  ArrowTopRightOnSquareIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import {
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  getUser,
  LinkGroup,
} from '@/lib/api'
import MobileNav from '@/components/MobileNav'
import BottomNav from '@/components/BottomNav'

const GROUP_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
]

export default function GroupsPage() {
  const router = useRouter()
  const [groups, setGroups] = useState<LinkGroup[]>([])
  const [ungroupedCount, setUngroupedCount] = useState(0)
  const [ungroupedClicks, setUngroupedClicks] = useState(0)
  const [maxGroups, setMaxGroups] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState<{ email: string; plan: string } | null>(null)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [editingGroup, setEditingGroup] = useState<LinkGroup | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: GROUP_COLORS[0],
  })
  const [saving, setSaving] = useState(false)

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const userData = getUser()
    if (!userData) {
      router.push('/login')
      return
    }
    setUser(userData)
    loadGroups()
  }, [router])

  const loadGroups = async () => {
    try {
      setLoading(true)
      const data = await getGroups()
      setGroups(data.groups)
      setUngroupedCount(data.ungrouped_count)
      setUngroupedClicks(data.ungrouped_clicks)
      setMaxGroups(data.max_groups)
    } catch (err: any) {
      if (err.code === 'PRO_REQUIRED') {
        setError('pro_required')
      } else {
        setError(err.message || 'Failed to load groups')
      }
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setModalMode('create')
    setEditingGroup(null)
    setFormData({
      name: '',
      description: '',
      color: GROUP_COLORS[0],
    })
    setShowModal(true)
  }

  const openEditModal = (group: LinkGroup) => {
    setModalMode('edit')
    setEditingGroup(group)
    setFormData({
      name: group.name,
      description: group.description || '',
      color: group.color,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (modalMode === 'create') {
        await createGroup(formData)
      } else if (editingGroup) {
        await updateGroup(editingGroup.group_id, formData)
      }
      setShowModal(false)
      loadGroups()
    } catch (err: any) {
      alert(err.message || 'Failed to save group')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (groupId: string) => {
    setDeleting(true)
    try {
      await deleteGroup(groupId)
      setDeleteConfirm(null)
      loadGroups()
    } catch (err: any) {
      alert(err.message || 'Failed to delete group')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
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
              <FolderIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white mb-2">Link Groups</h1>
              <p className="text-gray-400 mb-6">
                Organize your links into groups and view aggregated analytics. This is a Pro feature.
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

  return (
    <div className="min-h-screen bg-gray-900">
      <MobileNav />

      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Link Groups</h1>
            <p className="text-gray-400 mt-1">
              {groups.length} of {maxGroups} groups used
            </p>
          </div>
          <button
            onClick={openCreateModal}
            disabled={groups.length >= maxGroups}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            New Group
          </button>
        </div>

        {error && error !== 'pro_required' && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Groups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Ungrouped Links Card */}
          <Link
            href="/dashboard?filter=ungrouped"
            className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: '#6B7280' }}
                >
                  <LinkIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Ungrouped</h3>
                  <p className="text-sm text-gray-400">
                    {ungroupedCount} links
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Total clicks</span>
                <span className="text-white font-medium">
                  {ungroupedClicks.toLocaleString()}
                </span>
              </div>
            </div>
          </Link>

          {/* Group Cards */}
          {groups.map((group) => (
            <div
              key={group.group_id}
              className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <Link
                  href={`/groups/${group.group_id}`}
                  className="flex items-center gap-3 flex-1"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: group.color }}
                  >
                    <FolderIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{group.name}</h3>
                    <p className="text-sm text-gray-400">
                      {group.link_count || 0} links
                    </p>
                  </div>
                </Link>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Link
                    href={`/groups/${group.group_id}/analytics`}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                    title="Analytics"
                  >
                    <ChartBarIcon className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => openEditModal(group)}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                    title="Edit"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(group.group_id)}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded"
                    title="Delete"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {group.description && (
                <p className="mt-2 text-sm text-gray-400 line-clamp-2">
                  {group.description}
                </p>
              )}

              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Total clicks</span>
                  <span className="text-white font-medium">
                    {(group.total_clicks || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {groups.length === 0 && (
            <div className="col-span-full text-center py-12">
              <FolderIcon className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                No groups yet
              </h3>
              <p className="text-gray-400 mb-4">
                Create your first group to organize your links
              </p>
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <PlusIcon className="h-5 w-5" />
                Create Group
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-gray-800 rounded-lg w-full max-w-md border border-gray-700">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white">
                {modalMode === 'create' ? 'Create Group' : 'Edit Group'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Marketing Campaign"
                  required
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe this group..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {GROUP_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-lg ${
                        formData.color === color
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-800'
                          : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !formData.name.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors"
                >
                  {saving ? 'Saving...' : modalMode === 'create' ? 'Create' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="relative bg-gray-800 rounded-lg w-full max-w-sm border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-2">
              Delete Group?
            </h3>
            <p className="text-gray-400 mb-6">
              Links in this group will be moved to Ungrouped. They won&apos;t be deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
