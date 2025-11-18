'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  PlusIcon,
  FolderIcon,
  ChartBarIcon,
  ChartBarSquareIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  GlobeAltIcon,
  KeyIcon,
  BellIcon,
  ArrowsRightLeftIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline'
import { logout, getUser } from '@/lib/api'

interface MobileNavProps {
  onLogout?: () => void
}

export default function MobileNav({ onLogout }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState<{ email: string; plan: string } | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    const userData = getUser()
    setUser(userData)
  }, [])

  const handleLogout = async () => {
    await logout()
    setIsOpen(false)
    if (onLogout) {
      onLogout()
    } else {
      window.location.href = '/login'
    }
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: HomeIcon },
    { href: '/create', label: 'Create Link', icon: PlusIcon },
    { href: '/groups', label: 'Groups', icon: FolderIcon, pro: true },
    { href: '/analytics/overview', label: 'Analytics', icon: ChartBarIcon, pro: true },
    { href: '/domains', label: 'Domains', icon: GlobeAltIcon, pro: true },
    { href: '/apikeys', label: 'API Keys', icon: KeyIcon, pro: true },
    { href: '/webhooks', label: 'Webhooks', icon: BellIcon, pro: true },
    { href: '/import-export', label: 'Import/Export', icon: ArrowsRightLeftIcon, pro: true },
    { href: '/billing/settings', label: 'Billing', icon: CreditCardIcon },
    { href: '/usage', label: 'Usage', icon: ChartBarSquareIcon },
    { href: '/settings/account', label: 'Settings', icon: Cog6ToothIcon },
  ]

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl font-bold text-white">EdgeLink</span>
            {user?.plan === 'pro' && (
              <span className="px-2 py-0.5 text-xs font-semibold bg-blue-600 text-white rounded-full">
                PRO
              </span>
            )}
          </Link>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 text-gray-400 hover:text-white"
            aria-label="Toggle menu"
          >
            {isOpen ? (
              <XMarkIcon className="h-6 w-6" />
            ) : (
              <Bars3Icon className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`lg:hidden fixed top-0 right-0 z-50 h-full w-72 bg-gray-900 border-l border-gray-800 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
            <span className="text-lg font-semibold text-white">Menu</span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 text-gray-400 hover:text-white"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-3">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                      {item.pro && user?.plan !== 'pro' && (
                        <span className="ml-auto px-1.5 py-0.5 text-xs bg-gray-700 text-gray-400 rounded">
                          PRO
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* User Info & Logout */}
          <div className="border-t border-gray-800 p-4">
            {user && (
              <div className="mb-3 text-sm text-gray-400 truncate">
                {user.email}
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-3 text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Spacer for fixed header */}
      <div className="lg:hidden h-14" />
    </>
  )
}
