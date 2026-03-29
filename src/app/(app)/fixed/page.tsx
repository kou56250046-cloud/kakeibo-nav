'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FixedExpense, MonthlyFixedRecord, FIXED_EXPENSE_CATEGORIES } from '@/types'
import { formatCurrency, getCurrentYearMonth, getYearMonthLabel } from '@/lib/utils'
import { Plus, Trash2, Edit2, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'

export default function FixedPage() {
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth())
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  const [monthlyRecords, setMonthlyRecords] = useState<MonthlyFixedRecord[]>([])
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', amount: '', category: '住居費', billing_day: '1' })
  const supabase = createClient()

  const init = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('family_id').eq('id', user.id).single()
    setFamilyId(data?.family_id ?? null)
  }, [supabase])

  const loadData = useCallback(async (fid: string, ym: string) => {
    const [{ data: fixed }, { data: monthly }] = await Promise.all([
      supabase.from('fixed_expenses').select('*').eq('family_id', fid).eq('is_active', true).order('category'),
      supabase.from('monthly_fixed_records').select('*, fixed_expenses(*)').eq('family_id', fid).eq('year_month', ym),
    ])
    setFixedExpenses(fixed ?? [])
    setMonthlyRecords(monthly ?? [])
    setLoading(false)
  }, [supabase])

  const ensureMonthlyRecords = useCallback(async (fid: string, ym: string, expenses: FixedExpense[]) => {
    const existingIds = new Set((await supabase.from('monthly_fixed_records').select('fixed_expense_id').eq('family_id', fid).eq('year_month', ym)).data?.map(r => r.fixed_expense_id))
    const missing = expenses.filter(e => !existingIds.has(e.id))
    if (missing.length > 0) {
      await supabase.from('monthly_fixed_records').insert(missing.map(e => ({
        family_id: fid, fixed_expense_id: e.id, year_month: ym, amount: e.amount
      })))
    }
  }, [supabase])

  useEffect(() => { init() }, [init])
  useEffect(() => {
    if (familyId) {
      setLoading(true)
      loadData(familyId, yearMonth).then(() => {
        if (fixedExpenses.length > 0) ensureMonthlyRecords(familyId, yearMonth, fixedExpenses)
      })
    }
  }, [familyId, yearMonth])

  const handleAddFixed = async () => {
    if (!familyId || !form.name || !form.amount) return
    const { data } = await supabase.from('fixed_expenses').insert({
      family_id: familyId, name: form.name, amount: parseInt(form.amount),
      category: form.category, billing_day: parseInt(form.billing_day),
    }).select().single()
    if (data) {
      await supabase.from('monthly_fixed_records').insert({
        family_id: familyId, fixed_expense_id: data.id, year_month: yearMonth, amount: data.amount
      })
    }
    setShowForm(false)
    setForm({ name: '', amount: '', category: '住居費', billing_day: '1' })
    loadData(familyId, yearMonth)
  }

  const handleDeleteFixed = async (id: string) => {
    await supabase.from('fixed_expenses').update({ is_active: false }).eq('id', id)
    setFixedExpenses(prev => prev.filter(e => e.id !== id))
  }

  const togglePaid = async (record: MonthlyFixedRecord) => {
    await supabase.from('monthly_fixed_records').update({ is_paid: !record.is_paid }).eq('id', record.id)
    setMonthlyRecords(prev => prev.map(r => r.id === record.id ? { ...r, is_paid: !r.is_paid } : r))
  }

  const updateRecordAmount = async (id: string, amount: number) => {
    await supabase.from('monthly_fixed_records').update({ amount }).eq('id', id)
    setMonthlyRecords(prev => prev.map(r => r.id === id ? { ...r, amount } : r))
    setEditingId(null)
  }

  const total = monthlyRecords.reduce((s, r) => s + r.amount, 0)
  const paidTotal = monthlyRecords.filter(r => r.is_paid).reduce((s, r) => s + r.amount, 0)

  const prevMonth = () => { const [y, m] = yearMonth.split('-').map(Number); setYearMonth(format(new Date(y, m - 2, 1), 'yyyy-MM')) }
  const nextMonth = () => { const [y, m] = yearMonth.split('-').map(Number); setYearMonth(format(new Date(y, m, 1), 'yyyy-MM')) }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-white/5"><ChevronLeft size={20} className="text-slate-400" /></button>
        <h2 className="text-base font-bold text-white">{getYearMonthLabel(yearMonth)} の固定費</h2>
        <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-white/5"><ChevronRight size={20} className="text-slate-400" /></button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-4 text-center">
          <p className="text-xs text-slate-400">固定費合計</p>
          <p className="text-xl font-bold text-sky-400 mt-1">{formatCurrency(total)}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-xs text-slate-400">支払済み</p>
          <p className="text-xl font-bold text-emerald-400 mt-1">{formatCurrency(paidTotal)}</p>
        </div>
      </div>

      {showForm && (
        <div className="glass-card p-4 flex flex-col gap-3 animate-fade-in">
          <h3 className="text-sm font-semibold text-white">固定費を追加</h3>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">名前</label>
            <input type="text" placeholder="家賃、電気代 など" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">金額</label>
              <input type="number" placeholder="0" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})}
                className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">引落日</label>
              <input type="number" min="1" max="31" value={form.billing_day} onChange={e => setForm({...form, billing_day: e.target.value})}
                className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">カテゴリ</label>
            <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
              className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500">
              {FIXED_EXPENSE_CATEGORIES.map(c => <option key={c} value={c} className="bg-slate-800">{c}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 text-sm">キャンセル</button>
            <button onClick={handleAddFixed} className="flex-1 py-2.5 rounded-xl bg-sky-500 text-white text-sm font-bold">追加</button>
          </div>
        </div>
      )}

      <button onClick={() => setShowForm(true)}
        className="flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-sky-500/40 text-sky-400 text-sm font-medium hover:bg-sky-500/10 transition-colors">
        <Plus size={16} /> 固定費を追加
      </button>

      <div className="glass-card divide-y divide-white/5">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-14 animate-pulse bg-white/5 m-2 rounded-xl" />)
        ) : monthlyRecords.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">固定費が登録されていません</div>
        ) : monthlyRecords.map(record => (
          <div key={record.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <button onClick={() => togglePaid(record)}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${record.is_paid ? 'bg-emerald-500 border-emerald-500' : 'border-white/20'}`}>
                {record.is_paid && <Check size={12} className="text-white" />}
              </button>
              <div>
                <p className={`text-sm font-medium ${record.is_paid ? 'text-slate-500 line-through' : 'text-white'}`}>
                  {(record.fixed_expenses as FixedExpense)?.name}
                </p>
                <p className="text-xs text-slate-500">{(record.fixed_expenses as FixedExpense)?.category}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {editingId === record.id ? (
                <input type="number" defaultValue={record.amount} autoFocus
                  onBlur={e => updateRecordAmount(record.id, parseInt(e.target.value))}
                  onKeyDown={e => e.key === 'Enter' && updateRecordAmount(record.id, parseInt((e.target as HTMLInputElement).value))}
                  className="w-24 bg-white/10 border border-sky-500 rounded-xl px-2 py-1 text-sm text-white text-right focus:outline-none" />
              ) : (
                <>
                  <span className="text-sm font-bold text-white">{formatCurrency(record.amount)}</span>
                  <button onClick={() => setEditingId(record.id)} className="text-slate-500 hover:text-sky-400 transition-colors">
                    <Edit2 size={13} />
                  </button>
                </>
              )}
              <button onClick={() => handleDeleteFixed((record.fixed_expenses as FixedExpense)?.id)} className="text-slate-600 hover:text-rose-400 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
