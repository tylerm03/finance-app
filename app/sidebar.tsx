'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Receipt,
  BarChart3,
  PiggyBank,
  Car,
  CalendarClock,
} from 'lucide-react'

const links = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/transactions', label: 'Transactions', icon: Receipt },
  { href: '/spending', label: 'Cash Flow', icon: BarChart3 },
  { href: '/savings', label: 'Savings', icon: PiggyBank },
  { href: '/assets', label: 'Assets', icon: Car },
  { href: '/recurring', label: 'Recurring', icon: CalendarClock },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-gray-200 bg-gray-50">
      <div className="px-5 py-5">
        <p className="text-lg font-semibold text-gray-900">Finance App</p>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {links.map((link) => {
          const isActive = pathname === link.href
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              className={
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ' +
                (isActive
                  ? 'bg-orange-100 text-orange-500'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900')
              }
            >
              <Icon size={18} />
              {link.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
