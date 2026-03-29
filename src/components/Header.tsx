'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Bell, LogOut } from 'lucide-react'

export default function Header() {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-40 px-4 pt-4 pb-2">
      <div className="glass-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#f97316] to-[#38bdf8] flex items-center justify-center shadow-lg shadow-sky-500/20">
            <span className="text-base">💰</span>
          </div>
          <span className="font-bold text-white tracking-wide text-sm">家計フロー・ナビ</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSignOut}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  )
}
