'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { claimShop } from '@/lib/actions/shop'
import { Loader2, Store, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function ShopClaimPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ログインしていない場合はログインページへ
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?next=/shop/claim')
    }
  }, [user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    
    if (code.length !== 8) {
      setError('招待コードは8文字で入力してください')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      const res = await claimShop(user.id, code)
      if (res.success) {
        // 成功時の処理
        router.push('/shop/dashboard')
      } else {
        setError(res.message || 'エラーが発生しました')
      }
    } catch (err) {
      console.error(err)
      setError('予期せぬエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return <div className="flex justify-center items-center min-h-screen"><Loader2 className="animate-spin" /></div>
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-blue-600 p-6 text-center">
          <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Store className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">店舗オーナー登録</h1>
          <p className="text-blue-100 text-sm">招待コードを入力して店舗と連携します</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="code" className="block text-sm font-bold text-gray-700 mb-2">
                招待コード (8桁)
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="例: AB12CD34"
                maxLength={8}
                className="w-full px-4 py-3 text-center text-2xl font-mono font-bold border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 tracking-widest placeholder:tracking-normal placeholder:text-gray-300 uppercase"
                required
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                管理者から発行された8桁のコードを入力してください
              </p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 8}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  処理中...
                </>
              ) : (
                <>
                  連携する
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              トップページに戻る
            </Link>
          </div>
        </div>
      </div>
      
      {profile?.role === 'shop' && (
        <div className="mt-6 bg-yellow-50 text-yellow-800 px-4 py-3 rounded-xl text-sm max-w-md flex items-start gap-2 border border-yellow-200">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">既に店舗アカウントです</p>
            <p className="mt-1">新しい招待コードを入力すると、別の店舗のオーナーとして登録が上書きされます。</p>
          </div>
        </div>
      )}
    </div>
  )
}
