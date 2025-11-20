'use client'

import { useState, useRef, ReactNode } from 'react'
import { ArrowPathIcon } from '@heroicons/react/24/outline'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: ReactNode
  className?: string
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

export default function PullToRefresh({
  onRefresh,
  children,
  className = '',
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isPulling, setIsPulling] = useState(false)

  const touchStartY = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const threshold = 80 // Distance to trigger refresh
  const maxPull = 120 // Maximum pull distance

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only enable pull to refresh when at top of container
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY
      setIsPulling(true)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return

    const currentY = e.touches[0].clientY
    const diff = currentY - touchStartY.current

    // Only pull down, not up
    if (diff > 0) {
      // Apply resistance to make pull feel natural
      const resistance = 0.5
      const distance = Math.min(diff * resistance, maxPull)
      setPullDistance(distance)

      // Trigger haptic when crossing threshold
      if (distance >= threshold && pullDistance < threshold) {
        triggerHaptic('medium')
      }
    }
  }

  const handleTouchEnd = async () => {
    if (!isPulling) return

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      triggerHaptic('heavy')

      try {
        await onRefresh()
      } catch (error) {
        console.error('Refresh failed:', error)
      } finally {
        setIsRefreshing(false)
      }
    }

    setPullDistance(0)
    setIsPulling(false)
  }

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator - mobile only */}
      <div
        className="absolute left-0 right-0 flex justify-center items-center transition-all duration-200 pointer-events-none md:hidden"
        style={{
          height: `${pullDistance}px`,
          opacity: pullDistance > 20 ? 1 : 0,
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          className={`p-2 rounded-full bg-gray-700 ${
            isRefreshing ? 'animate-spin' : ''
          }`}
          style={{
            transform: `rotate(${(pullDistance / threshold) * 180}deg)`,
          }}
        >
          <ArrowPathIcon
            className={`h-6 w-6 ${
              pullDistance >= threshold ? 'text-primary-500' : 'text-gray-400'
            }`}
          />
        </div>
      </div>

      {/* Content - only apply transform on mobile */}
      <div
        className="md:transform-none"
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  )
}
