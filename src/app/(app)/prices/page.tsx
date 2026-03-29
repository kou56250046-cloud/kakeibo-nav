'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PriceHistory } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { TrendingDown, Search, Sparkles, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface ProductSummary {
  normalized_name: string
  product_name: string
  entries: PriceHistory[]
  best_price: number
  best_store: string
  latest_price: number
  latest_store: string
  savings: number
}

interface AiSuggestion {
  product_name: string
  best_store: string
  best_price: number
  avg_price: number
  potential_savings: number
  suggestion: string
}

export default function PricesPage() {
  const [products, setProducts] = useState<ProductSummary[]>([])
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([])
  const [loadingSuggest, setLoadingSuggest] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const supabase = createClient()

  const init = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('family_id').eq('id', user.id).single()
    return data?.family_id
  }, [supabase])

  const loadHistory = useCallback(async (fid: string) => {
    const { data } = await supabase.from('price_history').select('*').eq('family_id', fid).order('date', { ascending: false }).limit(500)
    if (!data) return []
    const map = new Map<string, ProductSummary>()
    for (const row of data) {
      const key = row.normalized_name
      if (!map.has(key)) {
        map.set(key, { normalized_name: key, product_name: row.product_name, entries: [], best_price: Infinity, best_store: '', latest_price: 0, latest_store: '', savings: 0 })
      }
      const p = map.get(key)!
      p.entries.push(row)
      if (row.unit_price < p.best_price) { p.best_price = row.unit_price; p.best_store = row.store_name }
      if (p.entries.length === 1 || new Date(row.date) > new Date(p.entries[0].date)) {
        p.latest_price = row.unit_price; p.latest_store = row.store_name
      }
    }
    const result = Array.from(map.values()).map(p => ({
      ...p,
      savings: p.latest_price - p.best_price
    }))
    return result.sort((a, b) => b.savings - a.savings)
  }, [supabase])

  useEffect(() => {
    init().then(fid => {
      if (fid) {
        setFamilyId(fid)
        loadHistory(fid).then(data => { setProducts(data); setLoading(false) })
      } else setLoading(false)
    })
  }, [init, loadHistory])

  const handleAiSuggest = async () => {
    if (!familyId || products.length === 0) return
    setLoadingSuggest(true)
    const historyData = products.slice(0, 20).map(p => ({
      product_name: p.product_name,
      entries: p.entries.slice(0, 10).map(e => ({ store: e.store_name, price: e.unit_price, date: e.date }))
    }))
    const res = await fetch('/api/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceHistory: historyData })
    })
    const data = await res.json()
    setSuggestions(data)
    setLoadingSuggest(false)
  }

  const filtered = products.filter(p =>
    !query || p.product_name.toLowerCase().includes(query.toLowerCase())
  )

  if (loading) return (
    <div className="flex justify-center items-center h-48"><Loader2 className="text-sky-400 animate-spin" size={32} /></div>
  )

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div>
        <h1 className="text-lg font-bold text-white">価格履歴 & 最安値</h1>
        <p className="text-slate-400 text-xs mt-0.5">購入履歴から自動で蓄積</p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="商品名で検索..."
          className="w-full bg-white/10 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500" />
      </div>

      {/* AI提案ボタン */}
      <button onClick={handleAiSuggest} disabled={loadingSuggest || products.length === 0}
        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-violet-500/20 to-sky-500/20 border border-violet-500/30 text-violet-300 text-sm font-medium hover:from-violet-500/30 hover:to-sky-500/30 transition-all disabled:opacity-50">
        {loadingSuggest ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        AIが最安値を分析する
      </button>

      {suggestions.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-violet-300 mb-3 flex items-center gap-1.5">
            <Sparkles size={14} /> AI節約提案
          </h3>
          <div className="space-y-3">
            {suggestions.map((s, i) => (
              <div key={i} className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-medium text-white">{s.product_name}</p>
                  {s.potential_savings > 0 && (
                    <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
                      最大{formatCurrency(s.potential_savings)}お得
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">{s.suggestion}</p>
                <p className="text-xs text-sky-400 mt-1">最安値: {s.best_store} {formatCurrency(s.best_price)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 商品一覧 */}
      <div className="flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="glass-card py-12 text-center text-slate-500 text-sm">
            {query ? '該当する商品がありません' : 'レシートを撮影すると価格履歴が蓄積されます'}
          </div>
        ) : filtered.map(p => (
          <div key={p.normalized_name} className="glass-card overflow-hidden">
            <button className="w-full p-4 flex items-center justify-between text-left"
              onClick={() => setExpanded(expanded === p.normalized_name ? null : p.normalized_name)}>
              <div>
                <p className="text-sm font-medium text-white">{p.product_name}</p>
                <p className="text-xs text-slate-400">{p.entries.length}件の購入記録</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">{formatCurrency(p.latest_price)}</p>
                {p.savings > 0 && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1 justify-end">
                    <TrendingDown size={11} /> {formatCurrency(p.savings)} 高い
                  </p>
                )}
                {p.savings < 0 && (
                  <p className="text-xs text-sky-400 text-xs">最安値!</p>
                )}
              </div>
            </button>

            {expanded === p.normalized_name && (
              <div className="border-t border-white/5 px-4 pb-4">
                <div className="flex items-center gap-2 mt-3 mb-2">
                  <div className="flex-1 text-xs text-slate-400">
                    最安値: <span className="text-emerald-400 font-medium">{formatCurrency(p.best_price)}</span> @ {p.best_store}
                  </div>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
                  {p.entries.map((e, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{format(new Date(e.date), 'M/d', { locale: ja })} {e.store_name}</span>
                      <span className={`font-medium ${e.unit_price === p.best_price ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {formatCurrency(e.unit_price)}
                        {e.unit_price === p.best_price && ' ✓'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
