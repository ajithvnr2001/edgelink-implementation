'use client'

import { useState, useRef, useEffect } from 'react'
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
  XMarkIcon,
  ShareIcon,
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

// Haptic feedback utility
const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
    }
    navigator.vibrate(patterns[type])
  }
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
  const [showBottomSheet, setShowBottomSheet] = useState(false)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isSwipeActive, setIsSwipeActive] = useState(false)

  // Touch tracking
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const touchStartTime = useRef(0)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const shortUrl = link.custom_domain
    ? `https://${link.custom_domain}/${link.slug}`
    : `${shortDomain}/${link.slug}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl)
      setCopied(true)
      triggerHaptic('medium')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Shortened Link',
          url: shortUrl,
        })
        triggerHaptic('light')
      } catch (err) {
        // User cancelled or share failed
        console.error('Share failed:', err)
      }
    } else {
      handleCopy()
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

  // Touch handlers for swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    touchStartTime.current = Date.now()

    // Start long-press timer
    longPressTimer.current = setTimeout(() => {
      triggerHaptic('heavy')
      setShowBottomSheet(true)
    }, 500)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const deltaX = e.touches[0].clientX - touchStartX.current
    const deltaY = e.touches[0].clientY - touchStartY.current

    // Cancel long-press if moved
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
    }

    // Only handle horizontal swipes
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      setIsSwipeActive(true)
      // Limit swipe distance
      const maxSwipe = 120
      const newOffset = Math.max(-maxSwipe, Math.min(maxSwipe, deltaX))
      setSwipeOffset(newOffset)
    }
  }

  const handleTouchEnd = () => {
    // Clear long-press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }

    // Handle swipe actions
    if (isSwipeActive) {
      if (swipeOffset < -80) {
        // Swipe left - show quick actions (copy, delete)
        triggerHaptic('light')
        setShowBottomSheet(true)
      } else if (swipeOffset > 80 && isPro) {
        // Swipe right - go to analytics
        triggerHaptic('light')
        window.location.href = `/analytics/${link.slug}`
      }
    }

    // Reset swipe state
    setSwipeOffset(0)
    setIsSwipeActive(false)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
      }
    }
  }, [])

  const handleDeleteClick = () => {
    if (onDelete) {
      triggerHaptic('medium')
      onDelete(link.slug)
    }
    setShowBottomSheet(false)
    setShowMenu(false)
  }

  return (
    <>
      <div
        ref={cardRef}
        className="bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-all relative overflow-hidden select-none"
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwipeActive ? 'none' : 'transform 0.3s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Swipe action indicators */}
        {swipeOffset < -40 && (
          <div className="absolute inset-y-0 right-0 w-24 bg-red-500/20 flex items-center justify-center">
            <TrashIcon className="h-6 w-6 text-red-400" />
          </div>
        )}
        {swipeOffset > 40 && isPro && (
          <div className="absolute inset-y-0 left-0 w-24 bg-primary-500/20 flex items-center justify-center">
            <ChartBarIcon className="h-6 w-6 text-primary-400" />
          </div>
        )}

        <div className="p-4">
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
                  className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-white shrink-0 -m-1"
                  title="Copy link"
                >
                  {copied ? (
                    <CheckIcon className="h-5 w-5 text-green-500" />
                  ) : (
                    <ClipboardIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Mobile menu toggle */}
            <div className="relative md:hidden">
              <button
                onClick={() => {
                  triggerHaptic('light')
                  setShowBottomSheet(true)
                }}
                className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-white -m-1"
              >
                <EllipsisVerticalIcon className="h-5 w-5" />
              </button>
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
                  onClick={handleDeleteClick}
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

          {/* Mobile swipe hint - shown only on first few renders */}
          <div className="md:hidden mt-2 text-xs text-gray-600 text-center">
            <span>Swipe or long-press for actions</span>
          </div>
        </div>
      </div>

      {/* Bottom Sheet Modal for Mobile */}
      {showBottomSheet && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setShowBottomSheet(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" />

          {/* Bottom Sheet */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-gray-800 rounded-t-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-600 rounded-full" />
            </div>

            {/* Link Info */}
            <div className="px-6 pb-4 border-b border-gray-700">
              <p className="text-blue-400 font-medium truncate">
                {link.custom_domain || shortDomain.replace('https://', '')}/{link.slug}
              </p>
              <p className="text-sm text-gray-400 truncate mt-1">
                {truncateUrl(link.destination, 50)}
              </p>
            </div>

            {/* Actions */}
            <div className="py-2">
              {/* Copy */}
              <button
                onClick={() => {
                  handleCopy()
                  setShowBottomSheet(false)
                }}
                className="flex items-center gap-4 w-full px-6 py-4 text-gray-200 hover:bg-gray-700 active:bg-gray-600 min-h-[56px]"
              >
                <ClipboardIcon className="h-6 w-6" />
                <span className="text-base">Copy Link</span>
              </button>

              {/* Share */}
              <button
                onClick={() => {
                  handleShare()
                  setShowBottomSheet(false)
                }}
                className="flex items-center gap-4 w-full px-6 py-4 text-gray-200 hover:bg-gray-700 active:bg-gray-600 min-h-[56px]"
              >
                <ShareIcon className="h-6 w-6" />
                <span className="text-base">Share</span>
              </button>

              {/* Edit */}
              {onEdit && (
                <button
                  onClick={() => {
                    triggerHaptic('light')
                    onEdit(link.slug)
                    setShowBottomSheet(false)
                  }}
                  className="flex items-center gap-4 w-full px-6 py-4 text-gray-200 hover:bg-gray-700 active:bg-gray-600 min-h-[56px]"
                >
                  <PencilIcon className="h-6 w-6" />
                  <span className="text-base">Edit</span>
                </button>
              )}

              {/* Analytics (Pro) */}
              {isPro && (
                <Link
                  href={`/analytics/${link.slug}`}
                  onClick={() => {
                    triggerHaptic('light')
                    setShowBottomSheet(false)
                  }}
                  className="flex items-center gap-4 w-full px-6 py-4 text-gray-200 hover:bg-gray-700 active:bg-gray-600 min-h-[56px]"
                >
                  <ChartBarIcon className="h-6 w-6" />
                  <span className="text-base">View Analytics</span>
                </Link>
              )}

              {/* Move to Group (Pro) */}
              {isPro && onMoveToGroup && (
                <button
                  onClick={() => {
                    triggerHaptic('light')
                    onMoveToGroup(link.slug)
                    setShowBottomSheet(false)
                  }}
                  className="flex items-center gap-4 w-full px-6 py-4 text-gray-200 hover:bg-gray-700 active:bg-gray-600 min-h-[56px]"
                >
                  <FolderIcon className="h-6 w-6" />
                  <span className="text-base">Move to Group</span>
                </button>
              )}

              {/* QR Code (Pro) */}
              {isPro && onViewQR && (
                <button
                  onClick={() => {
                    triggerHaptic('light')
                    onViewQR(link.slug)
                    setShowBottomSheet(false)
                  }}
                  className="flex items-center gap-4 w-full px-6 py-4 text-gray-200 hover:bg-gray-700 active:bg-gray-600 min-h-[56px]"
                >
                  <QrCodeIcon className="h-6 w-6" />
                  <span className="text-base">QR Code</span>
                </button>
              )}

              {/* Delete */}
              {onDelete && (
                <button
                  onClick={handleDeleteClick}
                  className="flex items-center gap-4 w-full px-6 py-4 text-red-400 hover:bg-gray-700 active:bg-gray-600 min-h-[56px]"
                >
                  <TrashIcon className="h-6 w-6" />
                  <span className="text-base">Delete</span>
                </button>
              )}
            </div>

            {/* Cancel button */}
            <div className="px-6 pb-6 pt-2">
              <button
                onClick={() => setShowBottomSheet(false)}
                className="w-full py-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-200 font-medium min-h-[56px]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  )
}
