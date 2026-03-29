'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, getCurrentYearMonth, getYearMonthLabel, getDateRange } from '@/lib/utils'
import { Transaction, IncomeRecord, MonthlyFixedRecord, CATEGORY_COLORS } from '@/types'
import { TrendingUp, TrendingDown, Wallet, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import dynamic from 'next/dynamic'

const DoughnutChart = dynamic(() => import('@/components/charts/DoughnutChart'), { ssr: false })

export default function DashboardPage() {
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth())
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [income, setIncome] = useState<IncomeRecord[]>([])
  const [fixedRecords, setFixedRecords] = useState<MonthlyFixedRecord[]>([])
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const loadFamilyId = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase.from('profiles').select('family_id').eq('id', user.id).single()
    return data?.family_id ?? null
  }, [supabase])

  const loadData = useCallback(async (fid: string, ym: string) => {
    const [year, month] = ym.split('-').map(Number)
    const start = `${ym}-01`
    const end = new Date(year, month, 0).toISOString().split('T')[0]

    const [txRes, incRes, fixRes] = await Promise.all([
      supabase.from('transactions').select('*, profiles(display_name)').eq('family_id', fid).gte('date', start).lte('date', end).order('date', { ascending: false }),
      supabase.from('income_records').select('*, profiles(display_name)').eq('family_id', fid).gte('date', start).lte('date', end),
      supabase.from('monthly_fixed_records').select('*, fixed_expenses(*)').eq('family_id', fid).eq('year_month', ym),
    ])

    setTransactions(txRes.data ?? [])
    setIncome(incRes.data ?? [])
    setFixedRecords(fixRes.data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadFamilyId().then(fid => {
      setFamilyId(fid)
      if (fid) loadData(fid, yearMonth)
      else setLoading(false)
    })
  }, [yearMonth, loadFamilyId, loadData])

  const totalExpense = transactions.reduce((s, t) => s + t.total_amount, 0)
    + fixedRecords.reduce((s, r) => s + r.amount, 0)
  const totalIncome = income.reduce((s, i) => s + i.amount, 0)
  const balance = totalIncome - totalExpense
  const savingsRate = totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0

  const categoryTotals = transactions.reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.total_amount
    return acc
  }, {})

  const prevMonth = () => {
    const [y, m] = yearMonth.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    setYearMonth(format(d, 'yyyy-MM'))
  }
  const nextMonth = () => {
    const [y, m] = yearMonth.split('-').map(Number)
    const d = new Date(y, m, 1)
    setYearMonth(format(d, 'yyyy-MM'))
  }
  const isCurrentMonth = yearMonth === getCurrentYearMonth()

  if (!familyId && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center gap-4">
        <p className="text-slate-400">家族グループに参加していません</p>
        <Link href="/settings" className="px-4 py-2 bg-sky-500 text-white rounded-xl text-sm font-medium">
          設定で家族を作成 / 参加する
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* 月選択 */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
          <ChevronLeft size={20} className="text-slate-400" />
        </button>
        <h2 className="text-base font-bold text-white">{getYearMonthLabel(yearMonth)}</h2>
        <button onClick={nextMonth} disabled={isCurrentMonth} className="p-2 rounded-xl hover:bg-white/5 transition-colors disabled:opacity-30">
          <ChevronRight size={20} className="text-slate-400" />
        </button>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="収入" amount={totalIncome} color="text-emerald-400" icon="↑" loading={loading} />
        <SummaryCard label="支出" amount={totalExpense} color="text-rose-400" icon="↓" loading={loading} />
        <SummaryCard label="残高" amount={balance} color={balance >= 0 ? 'text-sky-400' : 'text-orange-400'} icon="=" loading={loading} />
      </div>

      {/* 貯蓄率 */}
      {!loading && totalIncome > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">今月の貯蓄率</span>
            <span className={`text-lg font-bold ${savingsRate >= 20 ? 'text-emerald-400' : savingsRate >= 10 ? 'text-sky-400' : 'text-orange-400'}`}>
              {savingsRate}%
            </span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-700 ${savingsRate >= 20 ? 'bg-emerald-400' : savingsRate >= 10 ? 'bg-sky-400' : 'bg-orange-400'}`}
              style={{ width: `${Math.min(Math.max(savingsRate, 0), 100)}%` }}
            />
          </div>
          {balance > 0 && (
            <p className="text-xs text-emerald-400 mt-1.5">
              🎉 {formatCurrency(balance)} の節約達成！
            </p>
          )}
        </div>
      )}

      {/* カテゴリ円グラフ */}
      {!loading && Object.keys(categoryTotals).length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">カテゴリ別支出</h3>
          <DoughnutChart data={categoryTotals} />
        </div>
      )}

      {/* クイックアクション */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/scan" className="glass-card p-4 flex items-center gap-3 active:scale-95 transition-transform">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <span className="text-xl">📷</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">レシート撮影</p>
            <p className="text-xs text-slate-400">ワンタップで記録</p>
          </div>
        </Link>
        <Link href="/income" className="glass-card p-4 flex items-center gap-3 active:scale-95 transition-transform">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <span className="text-xl">💴</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">収入を記録</p>
            <p className="text-xs text-slate-400">給与・副収入など</p>
          </div>
        </Link>
      </div>

      {/* 最近の支出 */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-300">最近の支出</h3>
          <Link href="/history" className="text-xs text-sky-400">すべて見る</Link>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />)}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500 text-sm">まだ支出がありません</p>
            <Link href="/scan" className="inline-flex items-center gap-1.5 mt-3 text-sky-400 text-sm font-medium">
              <Plus size={14} />
              レシートを撮影して記録する
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 5).map(tx => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
                    style={{ backgroundColor: `${CATEGORY_COLORS[tx.category] ?? '#9ca3af'}20` }}>
                    {getCategoryEmoji(tx.category)}
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">{tx.store_name || tx.category}</p>
                    <p className="text-xs text-slate-500">{format(new Date(tx.date), 'M月d日(E)', { locale: ja })}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-rose-400">-{formatCurrency(tx.total_amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ label, amount, color, icon, loading }: {
  label: string; amount: number; color: string; icon: string; loading: boolean
}) {
  return (
    <div className="glass-card p-3 flex flex-col gap-1">
      <span className="text-xs text-slate-400">{label}</span>
      {loading ? (
        <div className="h-5 bg-white/10 rounded animate-pulse" />
      ) : (
        <span className={`text-sm font-bold ${color} leading-tight`}>
          {formatCurrency(Math.abs(amount))}
        </span>
      )}
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
