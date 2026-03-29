'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { OcrResult, OcrItem, EXPENSE_CATEGORIES } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Camera, CheckCircle, Loader2, X, Plus, Minus, Edit2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

type Step = 'capture' | 'processing' | 'review' | 'saving' | 'done'

export default function ScanPage() {
  const [step, setStep] = useState<Step>('capture')
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null)
  const [editResult, setEditResult] = useState<OcrResult | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPreviewUrl(URL.createObjectURL(file))
    setStep('processing')
    setError(null)

    try {
      const base64 = await fileToBase64(file)
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
      })
      if (!res.ok) throw new Error('OCR失敗')
      const data: OcrResult = await res.json()
      setOcrResult(data)
      setEditResult(JSON.parse(JSON.stringify(data)))
      setStep('review')
    } catch {
      setError('レシートの読み取りに失敗しました。再度お試しください。')
      setStep('capture')
    }
  }

  const handleSave = async () => {
    if (!editResult) return
    setStep('saving')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('未ログイン')

      const { data: profile } = await supabase.from('profiles').select('family_id').eq('id', user.id).single()
      if (!profile?.family_id) throw new Error('家族グループ未設定')

      const familyId = profile.family_id
      const totalAmount = editResult.items.reduce((s, i) => s + i.unit_price * i.quantity, 0)

      const { data: tx, error: txErr } = await supabase.from('transactions').insert({
        family_id: familyId,
        user_id: user.id,
        date: editResult.date,
        store_name: editResult.store_name || null,
        total_amount: totalAmount,
        category: editResult.items[0]?.category ?? 'その他',
        is_ocr: true,
      }).select().single()

      if (txErr) throw txErr

      const items = editResult.items.map(item => ({
        transaction_id: tx.id,
        product_name: item.product_name,
        normalized_name: normalizeProductName(item.product_name),
        unit_price: item.unit_price,
        quantity: item.quantity,
        category: item.category,
      }))
      await supabase.from('transaction_items').insert(items)

      const priceHistoryItems = editResult.items.map(item => ({
        family_id: familyId,
        product_name: item.product_name,
        normalized_name: normalizeProductName(item.product_name),
        store_name: editResult.store_name || '不明',
        unit_price: item.unit_price,
        date: editResult.date,
      }))
      await supabase.from('price_history').insert(priceHistoryItems)

      setStep('done')
    } catch (e) {
      console.error(e)
      setError('保存に失敗しました')
      setStep('review')
    }
  }

  const updateItem = (idx: number, field: keyof OcrItem, value: string | number) => {
    if (!editResult) return
    const items = [...editResult.items]
    items[idx] = { ...items[idx], [field]: value }
    setEditResult({ ...editResult, items })
  }

  const removeItem = (idx: number) => {
    if (!editResult) return
    setEditResult({ ...editResult, items: editResult.items.filter((_, i) => i !== idx) })
  }

  if (step === 'done') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <CheckCircle size={40} className="text-emerald-400" />
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-white">記録完了！</p>
          <p className="text-slate-400 text-sm mt-1">価格履歴も自動で更新されました</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setStep('capture'); setPreviewUrl(null); setOcrResult(null) }}
            className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 text-sm font-medium">
            続けて撮影
          </button>
          <button onClick={() => router.push('/dashboard')}
            className="px-5 py-2.5 rounded-xl bg-sky-500 text-white text-sm font-medium">
            ダッシュボードへ
          </button>
        </div>
      </div>
    )
  }

  if (step === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        {previewUrl && <img src={previewUrl} alt="レシート" className="w-40 h-48 object-cover rounded-2xl opacity-50" />}
        <Loader2 size={36} className="text-sky-400 animate-spin" />
        <p className="text-slate-300 text-sm">AIがレシートを解析中...</p>
      </div>
    )
  }

  if (step === 'saving') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 size={36} className="text-emerald-400 animate-spin" />
        <p className="text-slate-300 text-sm">保存中...</p>
      </div>
    )
  }

  if (step === 'review' && editResult) {
    const total = editResult.items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
    return (
      <div className="flex flex-col gap-4 animate-fade-in">
        <div className="flex items-center gap-3">
          {previewUrl && <img src={previewUrl} alt="レシート" className="w-14 h-18 object-cover rounded-xl" />}
          <div>
            <h2 className="font-bold text-white">{editResult.store_name || '店舗不明'}</h2>
            <p className="text-slate-400 text-sm">{editResult.date}</p>
          </div>
        </div>

        <div className="glass-card divide-y divide-white/5">
          {editResult.items.map((item, idx) => (
            <div key={idx} className="p-3 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <input
                  value={item.product_name}
                  onChange={e => updateItem(idx, 'product_name', e.target.value)}
                  className="w-full bg-transparent text-sm text-white font-medium focus:outline-none"
                />
                <select
                  value={item.category}
                  onChange={e => updateItem(idx, 'category', e.target.value)}
                  className="bg-transparent text-xs text-slate-400 focus:outline-none mt-0.5"
                >
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c} className="bg-slate-800">{c}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => updateItem(idx, 'quantity', Math.max(1, item.quantity - 1))}
                  className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                  <Minus size={12} />
                </button>
                <span className="text-xs text-slate-300 w-4 text-center">{item.quantity}</span>
                <button onClick={() => updateItem(idx, 'quantity', item.quantity + 1)}
                  className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                  <Plus size={12} />
                </button>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-sm font-bold text-white">{formatCurrency(item.unit_price * item.quantity)}</span>
                <button onClick={() => removeItem(idx)} className="text-slate-600 hover:text-rose-400 transition-colors">
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="glass-card p-4 flex items-center justify-between">
          <span className="text-slate-300 font-medium">合計</span>
          <span className="text-xl font-bold text-white">{formatCurrency(total)}</span>
        </div>

        {error && <p className="text-rose-400 text-sm text-center">{error}</p>}

        <div className="flex gap-3">
          <button onClick={() => { setStep('capture'); setPreviewUrl(null) }}
            className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 text-sm font-medium">
            やり直す
          </button>
          <button onClick={handleSave}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-sm font-bold shadow-lg shadow-sky-500/25">
            ✓ この内容で保存
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] gap-6 animate-fade-in">
      <div className="text-center">
        <h1 className="text-xl font-bold text-white">レシートを撮影</h1>
        <p className="text-slate-400 text-sm mt-1">AIが自動で読み取り・分類します</p>
      </div>

      {error && (
        <div className="w-full px-4 py-3 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-300 text-sm text-center">
          {error}
        </div>
      )}

      <button
        onClick={() => fileRef.current?.click()}
        className="w-36 h-36 rounded-3xl bg-gradient-to-br from-orange-500/20 to-sky-500/20 border-2 border-dashed border-sky-500/40 flex flex-col items-center justify-center gap-3 hover:border-sky-400 transition-colors active:scale-95"
      >
        <Camera size={40} className="text-sky-400" />
        <span className="text-sm text-sky-300 font-medium">カメラで撮影</span>
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCapture}
      />

      <p className="text-xs text-slate-500 text-center max-w-xs">
        レシートが見やすい角度で撮影すると<br />認識精度が上がります
      </p>
    </div>
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function normalizeProductName(name: string): string {
  return name.replace(/\s+/g, ' ').trim().toLowerCase()
}
