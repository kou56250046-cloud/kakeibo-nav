'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { IncomeRecord, INCOME_CATEGORIES } from '@/types'
import { formatCurrency, getCurrentYearMonth, getYearMonthLabel } from '@/lib/utils'
import { Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export default function IncomePage() {
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth())
  const [records, setRecords] = useState<IncomeRecord[]>([])
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ amount: '', category: '給与', memo: '', date: format(new Date(), 'yyyy-MM-dd') })
  const supabase = createClient()

  const init = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    const { data } = await supabase.from('profiles').select('family_id').eq('id', user.id).single()
    setFamilyId(data?.family_id ?? null)
  }, [supabase])

  const loadRecords = useCallback(async (fid: string, ym: string) => {
    const [y, m] = ym.split('-').map(Number)
    const start = `${ym}-01`
    const end = new Date(y, m, 0).toISOString().split('T')[0]
    const { data } = await supabase.from('income_records').select('*, profiles(display_name)').eq('family_id', fid).gte('date', start).lte('date', end).order('date', { ascending: false })
    setRecords(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { init() }, [init])
  useEffect(() => { if (familyId) { setLoading(true); loadRecords(familyId, yearMonth) } }, [familyId, yearMonth, loadRecords])

  const handleAdd = async () => {
    if (!familyId || !userId || !form.amount) return
    await supabase.from('income_records').insert({
      family_id: familyId,
      user_id: userId,
      date: form.date,
      amount: parseInt(form.amount),
      category: form.category,
      memo: form.memo || null,
    })
    setShowForm(false)
    setForm({ amount: '', category: '給与', memo: '', date: format(new Date(), 'yyyy-MM-dd') })
    loadRecords(familyId, yearMonth)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('income_records').delete().eq('id', id)
    setRecords(prev => prev.filter(r => r.id !== id))
  }

  const total = records.reduce((s, r) => s + r.amount, 0)

  const prevMonth = () => {
    const [y, m] = yearMonth.split('-').map(Number)
    setYearMonth(format(new Date(y, m - 2, 1), 'yyyy-MM'))
  }
  const nextMonth = () => {
    const [y, m] = yearMonth.split('-').map(Number)
    setYearMonth(format(new Date(y, m, 1), 'yyyy-MM'))
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-white/5"><ChevronLeft size={20} className="text-slate-400" /></button>
        <h2 className="text-base font-bold text-white">{getYearMonthLabel(yearMonth)} の収入</h2>
        <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-white/5"><ChevronRight size={20} className="text-slate-400" /></button>
      </div>

      <div className="glass-card p-5 text-center">
        <p className="text-slate-400 text-sm">今月の収入合計</p>
        <p className="text-3xl font-bold text-emerald-400 mt-1">{formatCurrency(total)}</p>
      </div>

      {showForm && (
        <div className="glass-card p-4 flex flex-col gap-3 animate-fade-in">
          <h3 className="text-sm font-semibold text-white">収入を追加</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">日付</label>
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})}
                className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">カテゴリ</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500">
                {INCOME_CATEGORIES.map(c => <option key={c} value={c} className="bg-slate-800">{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">金額 (円)</label>
            <input type="number" placeholder="0" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})}
              className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">メモ（任意）</label>
            <input type="text" placeholder="副業・ボーナスなど" value={form.memo} onChange={e => setForm({...form, memo: e.target.value})}
              className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 text-sm">キャンセル</button>
            <button onClick={handleAdd} className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-bold">追加</button>
          </div>
        </div>
      )}

      <button onClick={() => setShowForm(true)}
        className="flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-emerald-500/40 text-emerald-400 text-sm font-medium hover:bg-emerald-500/10 transition-colors">
        <Plus size={16} /> 収入を追加
      </button>

      <div className="glass-card divide-y divide-white/5">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-14 animate-pulse bg-white/5 m-2 rounded-xl" />)
        ) : records.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">収入記録がありません</div>
        ) : records.map(r => (
          <div key={r.id} className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-white">{r.category} {r.memo ? `— ${r.memo}` : ''}</p>
              <p className="text-xs text-slate-500">{format(new Date(r.date), 'M月d日(E)', { locale: ja })}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-base font-bold text-emerald-400">+{formatCurrency(r.amount)}</span>
              <button onClick={() => handleDelete(r.id)} className="text-slate-600 hover:text-rose-400 transition-colors">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
