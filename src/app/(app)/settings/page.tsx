'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, Family } from '@/types'
import { Users, Copy, Link, Check, ExternalLink } from 'lucide-react'

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [family, setFamily] = useState<Family | null>(null)
  const [familyMembers, setFamilyMembers] = useState<Profile[]>([])
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof)
    if (prof?.family_id) {
      const [{ data: fam }, { data: members }] = await Promise.all([
        supabase.from('families').select('*').eq('id', prof.family_id).single(),
        supabase.from('profiles').select('*').eq('family_id', prof.family_id),
      ])
      setFamily(fam)
      setFamilyMembers(members ?? [])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const handleCreateFamily = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: fam } = await supabase.from('families').insert({ name: `${profile?.display_name}の家族` }).select().single()
    if (fam) {
      await supabase.from('profiles').update({ family_id: fam.id }).eq('id', user.id)
      setMsg('家族グループを作成しました！招待コードを共有してください。')
      load()
    }
  }

  const handleJoinFamily = async () => {
    if (!joinCode.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: fam } = await supabase.from('families').select('*').eq('invite_code', joinCode.trim()).single()
    if (!fam) { setMsg('招待コードが見つかりません'); return }
    await supabase.from('profiles').update({ family_id: fam.id }).eq('id', user.id)
    setMsg('家族グループに参加しました！')
    load()
  }

  const copyInviteCode = async () => {
    if (!family?.invite_code) return
    await navigator.clipboard.writeText(family.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="flex justify-center pt-20"><div className="w-8 h-8 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" /></div>

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <h1 className="text-lg font-bold text-white">設定</h1>

      {/* プロフィール */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">プロフィール</h3>
        <div className="flex items-center gap-3">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-12 h-12 rounded-full" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-sky-500/20 flex items-center justify-center text-xl">👤</div>
          )}
          <div>
            <p className="font-medium text-white">{profile?.display_name ?? '名前未設定'}</p>
            <p className="text-xs text-slate-400">{family ? family.name : '未参加'}</p>
          </div>
        </div>
      </div>

      {msg && (
        <div className="px-4 py-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm">
          {msg}
        </div>
      )}

      {/* 家族グループ */}
      {family ? (
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-sky-400" />
            <h3 className="text-sm font-semibold text-slate-300">家族グループ</h3>
          </div>
          <p className="text-white font-medium mb-3">{family.name}</p>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 bg-white/10 border border-white/10 rounded-xl px-3 py-2 font-mono text-sm text-sky-300 tracking-widest">
              {family.invite_code}
            </div>
            <button onClick={copyInviteCode}
              className={`p-2.5 rounded-xl transition-colors ${copied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-slate-400 hover:text-white'}`}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <p className="text-xs text-slate-500">このコードを家族に共有してグループ参加してもらいましょう</p>

          <div className="mt-4 pt-4 border-t border-white/5">
            <p className="text-xs text-slate-400 mb-2">メンバー ({familyMembers.length}人)</p>
            <div className="flex gap-2">
              {familyMembers.map(m => (
                <div key={m.id} title={m.display_name ?? ''} className="w-8 h-8 rounded-full overflow-hidden bg-sky-500/20 flex items-center justify-center text-sm">
                  {m.avatar_url ? <img src={m.avatar_url} alt="" className="w-full h-full object-cover" /> : '👤'}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-sky-400" />
            <h3 className="text-sm font-semibold text-slate-300">家族グループ</h3>
          </div>
          <button onClick={handleCreateFamily}
            className="py-3 rounded-xl bg-sky-500 text-white text-sm font-bold">
            新しい家族グループを作成
          </button>
          <div className="flex gap-2">
            <input value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="招待コードを入力"
              className="flex-1 bg-white/10 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500" />
            <button onClick={handleJoinFamily}
              className="px-4 py-2.5 rounded-xl bg-violet-500 text-white text-sm font-bold">
              参加
            </button>
          </div>
        </div>
      )}

      {/* データ移行 */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">データ移行</h3>
        <p className="text-xs text-slate-400 mb-3">旧アプリ（Firebase版）のデータを移行できます</p>
        <a href="/migrate" className="flex items-center gap-2 py-2.5 px-4 rounded-xl border border-white/10 text-slate-300 text-sm hover:bg-white/5 transition-colors">
          <ExternalLink size={14} />
          Firebase → Supabase データ移行ツール
        </a>
      </div>

      {/* リンク */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">クイックリンク</h3>
        <div className="space-y-2">
          <a href="/income" className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-white/5 transition-colors text-sm text-slate-300">
            💴 収入管理 <span className="text-slate-500">→</span>
          </a>
          <a href="/fixed" className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-white/5 transition-colors text-sm text-slate-300">
            🔄 固定費管理 <span className="text-slate-500">→</span>
          </a>
          <a href="/history" className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-white/5 transition-colors text-sm text-slate-300">
            📋 支出履歴 <span className="text-slate-500">→</span>
          </a>
        </div>
      </div>
    </div>
  )
}
