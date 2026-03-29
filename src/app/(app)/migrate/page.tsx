'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface FirebaseTransaction {
  date?: string
  amount?: number | string
  category?: string
  store?: string
  place?: string
  memo?: string
  note?: string
}

export default function MigratePage() {
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle')
  const [log, setLog] = useState<string[]>([])
  const [jsonText, setJsonText] = useState('')
  const supabase = createClient()

  const addLog = (msg: string) => setLog(prev => [...prev, msg])

  const handleMigrate = useCallback(async () => {
    if (!jsonText.trim()) return
    setStatus('processing')
    setLog([])

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('未ログイン')

      const { data: prof } = await supabase.from('profiles').select('family_id').eq('id', user.id).single()
      if (!prof?.family_id) throw new Error('家族グループに参加してください')

      const familyId = prof.family_id

      let rawData: FirebaseTransaction[]
      try {
        rawData = JSON.parse(jsonText)
        if (!Array.isArray(rawData)) throw new Error()
      } catch {
        throw new Error('JSONの形式が正しくありません。配列形式で入力してください。')
      }

      addLog(`${rawData.length}件のデータを検出しました`)

      const records = rawData.map((item, idx) => {
        const amount = typeof item.amount === 'string' ? parseInt(item.amount.replace(/[^\d]/g, '')) : (item.amount ?? 0)
        const date = item.date ? item.date.slice(0, 10) : new Date().toISOString().slice(0, 10)
        const storeName = item.store || item.place || null

        return {
          family_id: familyId,
          user_id: user.id,
          date,
          store_name: storeName,
          total_amount: Math.abs(amount),
          category: normalizeCategory(item.category ?? 'その他'),
          memo: item.memo || item.note || null,
          is_ocr: false,
        }
      }).filter(r => r.total_amount > 0)

      addLog(`有効なデータ: ${records.length}件`)

      const batchSize = 50
      let imported = 0
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize)
        const { error } = await supabase.from('transactions').insert(batch)
        if (error) { addLog(`バッチ${Math.floor(i/batchSize)+1} エラー: ${error.message}`) }
        else { imported += batch.length; addLog(`${imported}/${records.length} 件インポート完了`) }
      }

      addLog(`✅ 移行完了: ${imported}件`)
      setStatus('done')
    } catch (e: unknown) {
      addLog(`❌ エラー: ${e instanceof Error ? e.message : String(e)}`)
      setStatus('error')
    }
  }, [jsonText, supabase])

  const handleFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setJsonText(ev.target?.result as string)
    reader.readAsText(file)
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div>
        <h1 className="text-lg font-bold text-white">データ移行ツール</h1>
        <p className="text-slate-400 text-xs mt-1">Firebase版からデータをインポートします</p>
      </div>

      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">手順</h3>
        <ol className="text-xs text-slate-400 space-y-1.5 list-decimal list-inside">
          <li>旧アプリのFirebase ConsoleからデータをJSON形式でエクスポート</li>
          <li>以下にJSONを貼り付けるかファイルをアップロード</li>
          <li>「移行開始」ボタンを押す</li>
        </ol>
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-slate-300">JSONデータ</label>
          <label className="flex items-center gap-1.5 text-xs text-sky-400 cursor-pointer hover:text-sky-300">
            <Upload size={13} />
            ファイルを選択
            <input type="file" accept=".json" className="hidden" onChange={handleFileLoad} />
          </label>
        </div>
        <textarea
          value={jsonText}
          onChange={e => setJsonText(e.target.value)}
          placeholder='[{"date":"2024-01-15","amount":1580,"category":"食費","store":"イオン"}]'
          rows={6}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-sky-500 resize-none"
        />
        <p className="text-xs text-slate-500 mt-1">サポート形式: date, amount, category, store/place, memo/note</p>
      </div>

      <button
        onClick={handleMigrate}
        disabled={status === 'processing' || !jsonText.trim()}
        className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-sm font-bold disabled:opacity-50 active:scale-95 transition-transform"
      >
        {status === 'processing' ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
        移行開始
      </button>

      {log.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            {status === 'done' ? <CheckCircle size={16} className="text-emerald-400" /> :
             status === 'error' ? <AlertCircle size={16} className="text-rose-400" /> :
             <Loader2 size={16} className="text-sky-400 animate-spin" />}
            <h3 className="text-sm font-semibold text-slate-300">実行ログ</h3>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto no-scrollbar">
            {log.map((l, i) => (
              <p key={i} className="text-xs text-slate-400 font-mono">{l}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function normalizeCategory(cat: string): string {
  const map: Record<string, string> = {
    '食品': '食費', '食料': '食費', 'food': '食費',
    '日用': '日用品', '雑貨': '日用品', 'daily': '日用品',
    '外食': '外食費', 'dining': '外食費',
    '交通': '交通費', 'transport': '交通費',
    '医療': '医療費', 'medical': '医療費',
    '服': '衣類', '衣服': '衣類', 'clothes': '衣類',
    '娯楽': '娯楽', 'entertainment': '娯楽',
    '教育': '教育費', 'education': '教育費',
    '家賃': '住居費', '住居': '住居費', 'rent': '住居費',
    '光熱費': '水道光熱費', '電気': '水道光熱費', 'utility': '水道光熱費',
    '通信': '通信費', 'phone': '通信費',
    '保険': '保険', 'insurance': '保険',
  }
  for (const [key, val] of Object.entries(map)) {
    if (cat.includes(key)) return val
  }
  return 'その他'
}
