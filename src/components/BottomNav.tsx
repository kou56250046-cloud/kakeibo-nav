'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Camera, TrendingUp, BarChart2, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', icon: Home, label: 'ホーム' },
  { href: '/scan', icon: Camera, label: 'スキャン' },
  { href: '/reports', icon: BarChart2, label: 'レポート' },
  { href: '/prices', icon: TrendingUp, label: '最安値' },
  { href: '/settings', icon: Settings, label: '設定' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-safe">
      <div className="w-full max-w-2xl px-4 pb-3">
        <div className="glass-card px-2 py-2 flex items-center justify-around">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all',
                  active
                    ? 'text-sky-400 bg-sky-400/10'
                    : 'text-slate-400 hover:text-slate-200'
                )}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
