'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CATEGORY_COLORS } from '@/types'
import { formatCurrency, getDateRange, PeriodType } from '@/lib/utils'
import { format, eachWeekOfInterval, eachMonthOfInterval, startOfMonth, endOfMonth } from 'date-fns'
import { ja } from 'date-fns/locale'
import dynamic from 'next/dynamic'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const BarChart = dynamic(() => import('@/components/charts/BarChart'), { ssr: false })
const DoughnutChart = dynamic(() => import('@/components/charts/DoughnutChart'), { ssr: false })

export default function ReportsPage() {
  const [period, setPeriod] = useState<PeriodType>('month')
  const [offset, setOffset] = useState(0)
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState({ income: 0, expense: 0, fixed: 0 })
  const [categoryTotals, setCategoryTotals] = useState<Record<string, number>>({})
  const [chartData, setChartData] = useState<{ labels: string[], income: number[], expense: number[] }>({ labels: [], income: [], expense: [] })
  const supabase = createClient()

  const dateRange = getDateRange(period, offset)

  const init = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('family_id').eq('id', user.id).single()
    setFamilyId(data?.family_id ?? null)
  }, [supabase])

  const loadData = useCallback(async (fid: string) => {
    setLoading(true)
    const start = format(dateRange.start, 'yyyy-MM-dd')
    const end = format(dateRange.end, 'yyyy-MM-dd')

    const [txRes, incRes] = await Promise.all([
      supabase.from('transactions').select('*').eq('family_id', fid).gte('date', start).lte('date', end),
      supabase.from('income_records').select('*').eq('family_id', fid).gte('date', start).lte('date', end),
    ])

    const txs = txRes.data ?? []
    const incs = incRes.data ?? []

    const totalExpense = txs.reduce((s, t) => s + t.total_amount, 0)
    const totalIncome = incs.reduce((s, i) => s + i.amount, 0)
    setSummary({ income: totalIncome, expense: totalExpense, fixed: 0 })

    const catTotals = txs.reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.total_amount
      return acc
    }, {})
    setCategoryTotals(catTotals)

    // グラフ用データ生成
    if (period === 'year') {
      const months = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end })
      const labels = months.map(m => format(m, 'M月', { locale: ja }))
      const incomeData = months.map(m => {
        const s = format(startOfMonth(m), 'yyyy-MM-dd')
        const e = format(endOfMonth(m), 'yyyy-MM-dd')
        return incs.filter(i => i.date >= s && i.date <= e).reduce((sum, i) => sum + i.amount, 0)
      })
      const expenseData = months.map(m => {
        const s = format(startOfMonth(m), 'yyyy-MM-dd')
        const e = format(endOfMonth(m), 'yyyy-MM-dd')
        return txs.filter(t => t.date >= s && t.date <= e).reduce((sum, t) => sum + t.total_amount, 0)
      })
      setChartData({ labels, income: incomeData, expense: expenseData })
    } else if (period === 'month') {
      const weeks = eachWeekOfInterval({ start: dateRange.start, end: dateRange.end }, { weekStartsOn: 1 })
      const labels = weeks.map((w, i) => `第${i + 1}週`)
      const incomeData = weeks.map((w, i) => {
        const nextW = weeks[i + 1] ?? dateRange.end
        return incs.filter(i2 => i2.date >= format(w, 'yyyy-MM-dd') && i2.date < format(nextW, 'yyyy-MM-dd')).reduce((sum, i2) => sum + i2.amount, 0)
      })
      const expenseData = weeks.map((w, i) => {
        const nextW = weeks[i + 1] ?? dateRange.end
        return txs.filter(t => t.date >= format(w, 'yyyy-MM-dd') && t.date < format(nextW, 'yyyy-MM-dd')).reduce((sum, t) => sum + t.total_amount, 0)
      })
      setChartData({ labels, income: incomeData, expense: expenseData })
    } else {
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(dateRange.start)
        d.setDate(d.getDate() + i)
        return d
      })
      const labels = days.map(d => format(d, 'E', { locale: ja }))
      const incomeData = days.map(d => incs.filter(i => i.date === format(d, 'yyyy-MM-dd')).reduce((s, i) => s + i.amount, 0))
      const expenseData = days.map(d => txs.filter(t => t.date === format(d, 'yyyy-MM-dd')).reduce((s, t) => s + t.total_amount, 0))
      setChartData({ labels, income: incomeData, expense: expenseData })
    }

    setLoading(false)
  }, [supabase, dateRange, period])

  useEffect(() => { init() }, [init])
  useEffect(() => { if (familyId) loadData(familyId) }, [familyId, period, offset])

  const balance = summary.income - summary.expense
  const savingsRate = summary.income > 0 ? Math.round((balance / summary.income) * 100) : 0

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div>
        <h1 className="text-lg font-bold text-white">レポート</h1>
      </div>

      {/* 期間タブ */}
      <div className="glass-card p-1 flex">
        {(['week', 'month', 'year'] as PeriodType[]).map(p => (
          <button key={p} onClick={() => { setPeriod(p); setOffset(0) }}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${period === p ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            {p === 'week' ? '週' : p === 'month' ? '月' : '年'}
          </button>
        ))}
      </div>

      {/* 期間ナビ */}
      <div className="flex items-center justify-between">
        <button onClick={() => setOffset(o => o - 1)} className="p-2 rounded-xl hover:bg-white/5">
          <ChevronLeft size={20} className="text-slate-400" />
        </button>
        <span className="text-sm font-medium text-white">{dateRange.label}</span>
        <button onClick={() => setOffset(o => o + 1)} disabled={offset >= 0} className="p-2 rounded-xl hover:bg-white/5 disabled:opacity-30">
          <ChevronRight size={20} className="text-slate-400" />
        </button>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: '収入', value: summary.income, color: 'text-emerald-400' },
          { label: '支出', value: summary.expense, color: 'text-rose-400' },
          { label: '収支差', value: balance, color: balance >= 0 ? 'text-sky-400' : 'text-orange-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-card p-3 text-center">
            <p className="text-xs text-slate-400">{label}</p>
            <p className={`text-sm font-bold mt-1 ${color}`}>{formatCurrency(Math.abs(value))}</p>
          </div>
        ))}
      </div>

      {/* 貯蓄率 */}
      {summary.income > 0 && (
        <div className="glass-card p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-slate-400">貯蓄率</span>
            <span className={`text-sm font-bold ${savingsRate >= 20 ? 'text-emerald-400' : 'text-sky-400'}`}>{savingsRate}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div className={`h-2 rounded-full ${savingsRate >= 20 ? 'bg-emerald-400' : 'bg-sky-400'}`}
              style={{ width: `${Math.min(100, Math.max(0, savingsRate))}%`, transition: 'width 0.7s ease-out' }} />
          </div>
          {balance > 0 && <p className="text-xs text-emerald-400 mt-1.5">🎉 累計節約 {formatCurrency(balance)}</p>}
        </div>
      )}

      {/* 収支棒グラフ */}
      {!loading && chartData.labels.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">収支推移</h3>
          <BarChart labels={chartData.labels} incomeData={chartData.income} expenseData={chartData.expense} />
        </div>
      )}

      {/* カテゴリ円グラフ */}
      {!loading && Object.keys(categoryTotals).length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">カテゴリ別支出</h3>
          <DoughnutChart data={categoryTotals} />
        </div>
      )}

      {/* カテゴリランキング */}
      {!loading && Object.keys(categoryTotals).length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">支出ランキング</h3>
          <div className="space-y-2">
            {Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).map(([cat, amt], i) => {
              const ratio = summary.expense > 0 ? Math.round(amt / summary.expense * 100) : 0
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-4">{i + 1}</span>
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CATEGORY_COLORS[cat] ?? '#9ca3af' }} />
                  <span className="text-sm text-slate-300 flex-1">{cat}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-white/10 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full" style={{ width: `${ratio}%`, backgroundColor: CATEGORY_COLORS[cat] ?? '#9ca3af' }} />
                    </div>
                    <span className="text-xs text-slate-400 w-8 text-right">{ratio}%</span>
                    <span className="text-xs font-medium text-white w-20 text-right">{formatCurrency(amt)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
