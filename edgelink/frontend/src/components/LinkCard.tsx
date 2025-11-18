'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ClipboardIcon,
  TrashIcon,
  PencilIcon,
  ChartBarIcon,
  FolderIcon,
  QrCodeIcon,
  CheckIcon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline'

interface LinkCardProps {
  link: {
    slug: string
    destination: string
    custom_domain?: string
    group_id?: string | null
    click_count: number
    created_at: string
    expires_at?: string
  }
  shortDomain: string
  onDelete?: (slug: string) => void
  onEdit?: (slug: string) => void
  onMoveToGroup?: (slug: string) => void
  onViewQR?: (slug: string) => void
  isPro?: boolean
}

export default function LinkCard({
  link,
  shortDomain,
  onDelete,
  onEdit,
  onMoveToGroup,
  onViewQR,
  isPro = false,
}: LinkCardProps) {
  const [copied, setCopied] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const shortUrl = link.custom_domain
    ? `https://${link.custom_domain}/${link.slug}`
    : `${shortDomain}/${link.slug}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const truncateUrl = (url: string, maxLength: number = 40) => {
    if (url.length <= maxLength) return url
    return url.substring(0, maxLength) + '...'
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
      {/* Header with short URL and actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <a
              href={shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 font-medium truncate"
            >
              {link.custom_domain || shortDomain.replace('https://', '')}/{link.slug}
            </a>
            <button
              onClick={handleCopy}
              className="p-1 text-gray-400 hover:text-white shrink-0"
              title="Copy link"
            >
              {copied ? (
                <CheckIcon className="h-4 w-4 text-green-500" />
              ) : (
                <ClipboardIcon className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu toggle */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 text-gray-400 hover:text-white md:hidden"
          >
            <EllipsisVerticalIcon className="h-5 w-5" />
          </button>

          {/* Mobile dropdown menu */}
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 mt-1 w-48 bg-gray-700 rounded-lg shadow-lg border border-gray-600 z-20 py-1">
                {onEdit && (
                  <button
                    onClick={() => {
                      onEdit(link.slug)
                      setShowMenu(false)
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-200 hover:bg-gray-600"
                  >
                    <PencilIcon className="h-4 w-4" />
                    Edit
                  </button>
                )}
                {isPro && (
                  <Link
                    href={`/analytics/${link.slug}`}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-200 hover:bg-gray-600"
                    onClick={() => setShowMenu(false)}
                  >
                    <ChartBarIcon className="h-4 w-4" />
                    Analytics
                  </Link>
                )}
                {isPro && onMoveToGroup && (
                  <button
                    onClick={() => {
                      onMoveToGroup(link.slug)
                      setShowMenu(false)
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-200 hover:bg-gray-600"
                  >
                    <FolderIcon className="h-4 w-4" />
                    Move to Group
                  </button>
                )}
                {isPro && onViewQR && (
                  <button
                    onClick={() => {
                      onViewQR(link.slug)
                      setShowMenu(false)
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-200 hover:bg-gray-600"
                  >
                    <QrCodeIcon className="h-4 w-4" />
                    QR Code
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => {
                      onDelete(link.slug)
                      setShowMenu(false)
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-gray-600"
                  >
                    <TrashIcon className="h-4 w-4" />
                    Delete
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Desktop action buttons */}
        <div className="hidden md:flex items-center gap-1">
          {onEdit && (
            <button
              onClick={() => onEdit(link.slug)}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
              title="Edit"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          )}
          {isPro && (
            <Link
              href={`/analytics/${link.slug}`}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
              title="Analytics"
            >
              <ChartBarIcon className="h-4 w-4" />
            </Link>
          )}
          {isPro && onMoveToGroup && (
            <button
              onClick={() => onMoveToGroup(link.slug)}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
              title="Move to Group"
            >
              <FolderIcon className="h-4 w-4" />
            </button>
          )}
          {isPro && onViewQR && (
            <button
              onClick={() => onViewQR(link.slug)}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
              title="QR Code"
            >
              <QrCodeIcon className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(link.slug)}
              className="p-1.5 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded"
              title="Delete"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Destination URL */}
      <div className="mt-2">
        <a
          href={link.destination}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray-400 hover:text-gray-300 break-all"
          title={link.destination}
        >
          {truncateUrl(link.destination)}
        </a>
      </div>

      {/* Stats row */}
      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <ChartBarIcon className="h-3.5 w-3.5" />
            {link.click_count.toLocaleString()} clicks
          </span>
          <span>{formatDate(link.created_at)}</span>
        </div>
        {link.expires_at && (
          <span className="text-yellow-500">
            Expires {formatDate(link.expires_at)}
          </span>
        )}
      </div>
    </div>
  )
}
