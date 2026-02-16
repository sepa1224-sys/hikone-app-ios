'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { MessageSquare, Send, CheckCircle, Home, ChevronLeft, User, Tag, FileText } from 'lucide-react'
import BottomNavigation from '@/components/BottomNavigation'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 立場の選択肢
const ROLES = [
  { value: 'individual', label: '個人' },
  { value: 'business', label: 'お店の人' },
  { value: 'government', label: '行政関係者' },
]

// カテゴリの選択肢
const CATEGORIES = [
  { value: 'app_feedback', label: 'アプリへのご意見' },
  { value: 'city_proposal', label: '街への提案' },
  { value: 'bug_report', label: '不具合報告' },
  { value: 'other', label: 'その他' },
]

export default function ContactPage() {
  const router = useRouter()
  const [role, setRole] = useState('')
  const [category, setCategory] = useState('')
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // バリデーション
    if (!role) {
      setError('あなたの立場を選択してください')
      return
    }
    if (!category) {
      setError('カテゴリを選択してください')
      return
    }
    if (!content.trim()) {
      setError('内容を入力してください')
      return
    }
    if (content.trim().length < 10) {
      setError('内容は10文字以上で入力してください')
      return
    }

    setSending(true)

    try {
      // Supabase の contacts テーブルに保存
      const { error: insertError } = await supabase
        .from('contacts')
        .insert({
          role: role,
          category: category,
          content: content.trim(),
          created_at: new Date().toISOString(),
        })

      if (insertError) {
        console.error('保存エラー:', insertError)
        setError('送信に失敗しました。もう一度お試しください。')
        setSending(false)
        return
      }

      // 送信成功
      setSent(true)
    } catch (err) {
      console.error('送信エラー:', err)
      setError('送信に失敗しました。もう一度お試しください。')
    } finally {
      setSending(false)
    }
  }

  // 送信完了画面
  if (sent) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
        <div className="max-w-xl mx-auto p-6 pb-24">
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
              <CheckCircle size={48} className="text-green-500" />
            </div>
            <h1 className="text-2xl font-black text-gray-800 mb-3">
              ご意見ありがとうございます！
            </h1>
            <p className="text-gray-500 font-bold mb-8">
              いただいたご意見は、より良い街づくりに<br/>
              活用させていただきます。
            </p>
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-all"
            >
              <Home size={20} />
              ホームに戻る
            </button>
          </div>
        </div>
        <BottomNavigation />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-xl mx-auto p-6 pb-24">
        {/* ヘッダー */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-black text-gray-800">街を良くする目安箱</h1>
            <p className="text-xs text-gray-500 font-bold">お問い合わせ ご意見 ご提案</p>
          </div>
        </div>

        {/* フォームカード */}
        <div className="bg-white rounded-[2rem] p-6 shadow-lg border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <MessageSquare size={24} className="text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-800">ご意見をお聞かせください</h2>
              <p className="text-xs text-gray-500 font-bold">
                アプリや街への提案をお待ちしています
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* あなたの立場 */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 ml-1">
                <User size={16} className="text-blue-500" />
                <span className="text-sm font-black text-gray-700">あなたの立場</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`py-3 px-4 rounded-xl font-bold text-sm transition-all ${
                      role === r.value
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* カテゴリ */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 ml-1">
                <Tag size={16} className="text-blue-500" />
                <span className="text-sm font-black text-gray-700">カテゴリ</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className={`py-3 px-4 rounded-xl font-bold text-sm transition-all ${
                      category === c.value
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 内容 */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 ml-1">
                <FileText size={16} className="text-blue-500" />
                <span className="text-sm font-black text-gray-700">内容</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="ご意見 ご提案の内容をご記入ください..."
                rows={6}
                className="w-full bg-white border-2 border-gray-200 rounded-2xl p-4 font-bold text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all resize-none text-sm"
              />
              <p className="text-[10px] text-gray-400 text-right">
                {content.length}文字（10文字以上）
              </p>
            </div>

            {/* エラーメッセージ */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-sm text-red-600 font-bold text-center">{error}</p>
              </div>
            )}

            {/* 送信ボタン */}
            <button
              type="submit"
              disabled={sending}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 disabled:from-gray-300 disabled:to-gray-400 text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              {sending ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                  送信中...
                </>
              ) : (
                <>
                  <Send size={20} />
                  送信する
                </>
              )}
            </button>
          </form>

          {/* 注意書き */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 text-center leading-relaxed">
              ※ いただいたご意見は匿名で処理されます。<br/>
              ※ 個別の返信はいたしかねますのでご了承ください。<br/>
              ※ 緊急を要する場合は、市役所へ直接お問い合わせください。
            </p>
          </div>
        </div>
      </div>

      {/* 下部ナビゲーション */}
      <BottomNavigation />
    </div>
  )
}
