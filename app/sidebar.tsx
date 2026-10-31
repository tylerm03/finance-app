'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Layers,
  Receipt,
  BarChart3,
  PiggyBank,
  Car,
  CalendarClock,
  FileText,
  Settings,
} from 'lucide-react'

const links = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/accounts', label: 'Accounts', icon: Layers },
  { href: '/transactions', label: 'Transactions', icon: Receipt },
  { href: '/spending', label: 'Cash Flow', icon: BarChart3 },
  { href: '/savings', label: 'Savings', icon: PiggyBank },
  { href: '/assets', label: 'Assets', icon: Car },
  { href: '/recurring', label: 'Recurring', icon: CalendarClock },
  { href: '/paystubs', label: 'Paystubs', icon: FileText },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col bg-[#f6f5f3] font-sans">
      <div className="px-5 pb-4 pt-5">
        <p className="text-lg font-semibold text-[#1f1d1a]">Finance App</p>
      </div>
      <nav className="flex-1 space-y-0.5 px-2">
        {links.map((link) => {
          const isActive = pathname === link.href
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              className={
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[16px] transition-colors ' +
                (isActive
                  ? 'bg-[#ebe9e5] text-[#1f1d1a]'
                  : 'text-[#3b3834] hover:bg-[#efedea] hover:text-[#1f1d1a]')
              }
            >
              <Icon size={19} strokeWidth={1.75} />
              {link.label}
            </Link>
          )
        })}
      </nav>
      <div className="px-2 pb-4">
        <Link
          href="/settings"
          className={
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[16px] transition-colors ' +
            (pathname === '/settings'
              ? 'bg-[#ebe9e5] text-[#1f1d1a]'
              : 'text-[#3b3834] hover:bg-[#efedea] hover:text-[#1f1d1a]')
          }
        >
          <Settings size={19} strokeWidth={1.75} />
          Settings
        </Link>
      </div>
    </aside>
  )
}
