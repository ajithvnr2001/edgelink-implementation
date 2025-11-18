'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HomeIcon,
  PlusCircleIcon,
  FolderIcon,
  ChartBarIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeIconSolid,
  PlusCircleIcon as PlusCircleIconSolid,
  FolderIcon as FolderIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  UserCircleIcon as UserCircleIconSolid,
} from '@heroicons/react/24/solid'

export default function BottomNav() {
  const pathname = usePathname()

  const navItems = [
    {
      href: '/dashboard',
      label: 'Home',
      icon: HomeIcon,
      iconActive: HomeIconSolid,
    },
    {
      href: '/create',
      label: 'Create',
      icon: PlusCircleIcon,
      iconActive: PlusCircleIconSolid,
    },
    {
      href: '/groups',
      label: 'Groups',
      icon: FolderIcon,
      iconActive: FolderIconSolid,
    },
    {
      href: '/analytics/overview',
      label: 'Analytics',
      icon: ChartBarIcon,
      iconActive: ChartBarIconSolid,
    },
    {
      href: '/settings/account',
      label: 'Account',
      icon: UserCircleIcon,
      iconActive: UserCircleIconSolid,
    },
  ]

  return (
    <>
      {/* Bottom Navigation Bar - Mobile Only */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-gray-900 border-t border-gray-800 pb-safe">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = isActive ? item.iconActive : item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-2 min-w-[64px] ${
                  isActive ? 'text-blue-500' : 'text-gray-400'
                }`}
              >
                <Icon className="h-6 w-6" />
                <span className="text-xs">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Spacer for fixed bottom nav */}
      <div className="lg:hidden h-20" />
    </>
  )
}
