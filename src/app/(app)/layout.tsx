import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import Header from '@/components/Header'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex flex-col min-h-screen max-w-2xl mx-auto">
      <Header />
      <main className="flex-1 overflow-y-auto pb-24 px-4 pt-4">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
