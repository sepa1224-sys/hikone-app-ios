'use client'

import { useEffect, useState } from 'react'
import { getShopBalance, requestPayout, getPayoutRequests } from '@/lib/actions/shop'
import { useAuth } from '@/components/AuthProvider'
import { ArrowLeft, Send, History, RefreshCcw } from 'lucide-react'
import Link from 'next/link'

interface PayoutRequest {
  id: string
  amount: number
  status: string
  created_at: string
}

export default function ShopTransferPage() {
  const { user } = useAuth()
  const [balance, setBalance] = useState<number>(0)
  const [requests, setRequests] = useState<PayoutRequest[]>([])
  const [amount, setAmount] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    if (!user) return
    setLoading(true)
    try {
      const [balanceRes, requestsRes] = await Promise.all([
        getShopBalance(user.id),
        getPayoutRequests(user.id)
      ])

      if (balanceRes.success && typeof balanceRes.balance === 'number') {
        setBalance(balanceRes.balance)
      }
      
      if (requestsRes.success && requestsRes.requests) {
        setRequests(requestsRes.requests)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const requestAmount = parseInt(amount)
    if (isNaN(requestAmount) || requestAmount <= 0) {
      setError('有効な金額を入力してください')
      return
    }

    if (requestAmount > balance) {
      setError('振込可能額を超えています')
      return
    }

    if (!password || password.length !== 4) {
      setError('暗証番号を4桁で入力してください')
      return
    }

    setSubmitting(true)
    setError('')
    setMessage('')

    try {
      const result = await requestPayout(user.id, requestAmount, password)
      if (result.success) {
        setMessage('振込申請が完了しました')
        setAmount('')
        setPassword('')
        // データ再取得
        fetchData()
        setTimeout(() => setMessage(''), 3000)
      } else {
        setError(result.message || '申請に失敗しました')
      }
    } catch (e) {
      setError('エラーが発生しました')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-bold">申請中</span>
      case 'approved': return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-bold">承認済み</span>
      case 'paid': return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold">振込完了</span>
      case 'rejected': return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-bold">却下</span>
      default: return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-bold">{status}</span>
    }
  }

  if (!user) {
    return <div className="p-8 text-center">ログインが必要です</div>
  }

  if (loading) {
    return <div className="p-8 text-center">読み込み中...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー */}
      <div className="bg-white p-4 flex items-center shadow-sm sticky top-0 z-10">
        <Link href="/shop/dashboard" className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="flex-1 text-center font-bold text-gray-800 mr-8">振込申請</h1>
      </div>

      <div className="flex-1 p-6 max-w-lg mx-auto w-full space-y-6">
        
        {/* 現在の残高 */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-200">
          <p className="text-blue-100 text-sm font-bold mb-1">振込可能残高</p>
          <div className="text-4xl font-black">
            {balance.toLocaleString()} <span className="text-xl">円</span>
          </div>
        </div>

        {/* 申請フォーム */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Send size={20} className="text-blue-600" />
            振込を申請する
          </h2>
          
          <form onSubmit={handleRequest} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">申請金額</label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500 font-bold text-lg"
                  min="1"
                  max={balance}
                  required
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">円</div>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-right">
                最大申請可能額: {balance.toLocaleString()}円
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">暗証番号 (4桁)</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="1234"
                className="w-full p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500 font-bold text-lg tracking-widest text-center"
                required
              />
              <div className="mt-2 text-right">
                <Link href="/shop/settings/pin" className="text-xs text-blue-600 font-bold hover:underline">
                  暗証番号の設定・変更はこちら
                </Link>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm font-bold rounded-xl text-center">
                {error}
              </div>
            )}
            
            {message && (
              <div className="p-3 bg-green-50 text-green-600 text-sm font-bold rounded-xl text-center">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || balance <= 0}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  申請する
                </>
              )}
            </button>
          </form>
        </div>

        {/* 申請履歴 */}
        <div>
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2 px-2">
            <History size={20} className="text-gray-500" />
            申請履歴
          </h2>
          
          <div className="space-y-3">
            {requests.length === 0 ? (
              <div className="text-center py-8 text-gray-400 bg-white rounded-2xl border border-gray-100 border-dashed">
                履歴はありません
              </div>
            ) : (
              requests.map((req) => (
                <div key={req.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-800 text-lg">
                      {req.amount.toLocaleString()}円
                    </div>
                    <div className="text-xs text-gray-400 font-bold mt-1">
                      {new Date(req.created_at).toLocaleDateString('ja-JP')}
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusLabel(req.status)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
