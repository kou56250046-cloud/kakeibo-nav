'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Transaction, EXPENSE_CATEGORIES, CATEGORY_COLORS } from '@/types'
import { formatCurrency, getCurrentYearMonth, getYearMonthLabel } from '@/lib/utils'
import { Trash2, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export default function HistoryPage() {
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth())
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const supabase = createClient()

  const init = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('family_id').eq('id', user.id).single()
    setFamilyId(data?.family_id ?? null)
  }, [supabase])

  const loadData = useCallback(async (fid: string, ym: string) => {
    const [y, m] = ym.split('-').map(Number)
    const start = `${ym}-01`
    const end = new Date(y, m, 0).toISOString().split('T')[0]
    const { data } = await supabase.from('transactions').select('*, profiles(display_name)').eq('family_id', fid).gte('date', start).lte('date', end).order('date', { ascending: false })
    setTransactions(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { init() }, [init])
  useEffect(() => { if (familyId) { setLoading(true); loadData(familyId, yearMonth) } }, [familyId, yearMonth, loadData])

  const handleDelete = async (id: string) => {
    await supabase.from('transactions').delete().eq('id', id)
    setTransactions(prev => prev.filter(t => t.id !== id))
  }

  const filtered = filterCategory === 'all' ? transactions : transactions.filter(t => t.category === filterCategory)
  const total = filtered.reduce((s, t) => s + t.total_amount, 0)

  const prevMonth = () => { const [y, m] = yearMonth.split('-').map(Number); setYearMonth(format(new Date(y, m - 2, 1), 'yyyy-MM')) }
  const nextMonth = () => { const [y, m] = yearMonth.split('-').map(Number); setYearMonth(format(new Date(y, m, 1), 'yyyy-MM')) }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-white/5"><ChevronLeft size={20} className="text-slate-400" /></button>
        <h2 className="text-base font-bold text-white">{getYearMonthLabel(yearMonth)} の支出</h2>
        <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-white/5"><ChevronRight size={20} className="text-slate-400" /></button>
      </div>

      <div className="glass-card p-4 flex items-center justify-between">
        <span className="text-slate-400 text-sm">合計支出</span>
        <span className="text-xl font-bold text-rose-400">{formatCurrency(total)}</span>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        <button onClick={() => setFilterCategory('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-colors ${filterCategory === 'all' ? 'bg-sky-500 text-white' : 'bg-white/10 text-slate-400'}`}>
          すべて
        </button>
        {EXPENSE_CATEGORIES.map(c => (
          <button key={c} onClick={() => setFilterCategory(c)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-colors ${filterCategory === c ? 'text-white' : 'bg-white/10 text-slate-400'}`}
            style={filterCategory === c ? { backgroundColor: CATEGORY_COLORS[c] + 'cc' } : {}}>
            {c}
          </button>
        ))}
      </div>

      <div className="glass-card divide-y divide-white/5">
        {loading ? (
          [1,2,3,4,5].map(i => <div key={i} className="h-14 animate-pulse bg-white/5 m-2 rounded-xl" />)
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">支出がありません</div>
        ) : filtered.map(tx => (
          <div key={tx.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0"
                style={{ backgroundColor: `${CATEGORY_COLORS[tx.category] ?? '#9ca3af'}20` }}>
                {getCategoryEmoji(tx.category)}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-white font-medium truncate">{tx.store_name || tx.category}</p>
                <p className="text-xs text-slate-500">
                  {format(new Date(tx.date), 'M月d日(E)', { locale: ja })}
                  {tx.is_ocr && <span className="ml-1.5 text-sky-400/60">📷</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-sm font-bold text-rose-400">-{formatCurrency(tx.total_amount)}</span>
              <button onClick={() => handleDelete(tx.id)} className="text-slate-600 hover:text-rose-400 transition-colors">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    '食費': '🛒', '日用品': '🧴', '外食費': '🍜', '交通費': '🚃',
    '医療費': '💊', '衣類': '👗', '娯楽': '🎮', '教育費': '📚',
    '住居費': '🏠', '水道光熱費': '💡', '通信費': '📱', '保険': '🛡️', 'その他': '📦'
  }
  return map[category] ?? '📦'
}
