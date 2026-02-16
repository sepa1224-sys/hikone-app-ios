'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Gift, ArrowLeft, Clock, CheckCircle2, XCircle, Package, Copy, Check, Lock } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import { getGiftExchangeType } from '@/lib/constants/giftExchangeTypes'
import BottomNavigation from '@/components/BottomNavigation'

interface RedeemHistory {
  id: string
  user_id: string
  gift_card_type: string
  points_amount: number
  status: 'pending' | 'approved' | 'rejected' | 'sent'
  gift_code?: string
  created_at: string
  updated_at?: string
}

export default function RedeemHistoryPage() {
  const router = useRouter()
  const { user: authUser } = useAuth()
  const [history, setHistory] = useState<RedeemHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null)
  
  // 実行済みフラグとAbortController
  const isFetchingRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isMountedRef = useRef(true)

  // 交換履歴を取得
  useEffect(() => {
    isMountedRef.current = true

    async function fetchHistory() {
      if (!authUser?.id) {
        setLoading(false)
        return
      }

      // 既に取得中の場合は重複を避ける（ただし初回は必ず実行）
      if (isFetchingRef.current) return
      
      try {
        setLoading(true)
        setError(null)
        isFetchingRef.current = true

        console.log('📜 [RedeemHistory] データ取得開始:', authUser.id)

        const { data, error: fetchError } = await supabase
          .from('gift_exchange_requests')
          .select('*')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false })

        if (fetchError) throw fetchError

        console.log('✅ [RedeemHistory] データ取得成功:', data?.length || 0)

        if (isMountedRef.current) {
          setHistory(data || [])
        }
      } catch (err: any) {
        console.error('❌ [RedeemHistory] 履歴取得エラー:', err)
        if (isMountedRef.current) {
          setError('履歴の取得に失敗しました。')
        }
      } finally {
        isFetchingRef.current = false
        if (isMountedRef.current) {
          setLoading(false)
        }
      }
    }

    fetchHistory()

    return () => {
      isMountedRef.current = false
      isFetchingRef.current = false
    }
  }, [authUser?.id])

  // コードをコピー
  const handleCopyCode = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCodeId(id)
      setTimeout(() => {
        if (isMountedRef.current) setCopiedCodeId(null)
      }, 2000)
    } catch (err) {
      console.error('コピーエラー:', err)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-20">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Gift size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900">交換履歴</h1>
              <p className="text-xs text-gray-500 font-bold">申請したギフトの状態を確認</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-bold">読み込み中...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
            <XCircle size={48} className="text-red-400 mx-auto mb-4" />
            <p className="text-gray-700 font-black mb-2">エラーが発生しました</p>
            <p className="text-sm text-gray-500 font-bold mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-black transition-all active:scale-95"
            >
              再読み込み
            </button>
          </div>
        ) : history?.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
            <Gift size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-bold">交換履歴がありません</p>
            <button
              onClick={() => router.push('/redeem')}
              className="mt-4 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-black transition-all active:scale-95"
            >
              ポイント交換所へ
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {history?.map((item) => {
              const exchangeType = getGiftExchangeType(item.gift_card_type)
              const statusConfig = {
                pending: { label: '審査中', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
                approved: { label: '承認済み', color: 'bg-blue-100 text-blue-800', icon: CheckCircle2 },
                rejected: { label: '却下', color: 'bg-red-100 text-red-800', icon: XCircle },
                sent: { label: '送付済み', color: 'bg-green-100 text-green-800', icon: Package }
              }
              const status = statusConfig[item.status]

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{exchangeType?.icon || '🎁'}</span>
                      <div>
                        <p className="text-lg font-black text-gray-900">
                          {exchangeType?.name || item.gift_card_type}
                        </p>
                        <p className="text-sm text-gray-500 font-bold">
                          {item.points_amount.toLocaleString()} pt
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1 ${status.color}`}
                    >
                      <status.icon size={14} />
                      {status.label}
                    </span>
                  </div>

                  {/* ギフトコード表示エリア */}
                  <div className="mt-2 mb-4">
                    {item.gift_code ? (
                      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-[10px] font-black text-purple-600 uppercase tracking-wider mb-1">
                              ギフトコード
                            </p>
                            <p className="text-xl font-black text-purple-900 font-mono break-all">
                              {item.gift_code}
                            </p>
                          </div>
                          <button
                            onClick={() => handleCopyCode(item.gift_code!, item.id)}
                            className="ml-4 p-3 bg-white border border-purple-200 hover:bg-purple-100 rounded-xl transition-all shadow-sm active:scale-90"
                            title="コードをコピー"
                          >
                            {copiedCodeId === item.id ? (
                              <Check size={20} className="text-green-600" />
                            ) : (
                              <Copy size={20} className="text-purple-600" />
                            )}
                          </button>
                        </div>
                        {copiedCodeId === item.id && (
                          <p className="text-[10px] text-green-600 font-black mt-2 text-center animate-pulse">
                            クリップボードにコピーしました！
                          </p>
                        )}
                      </div>
                    ) : (item.status === 'approved' || item.status === 'sent' || item.status === 'pending') ? (
                      <div className="bg-gray-50 border border-gray-200 border-dashed rounded-xl p-4 flex items-center justify-center gap-2">
                        <Lock size={16} className="text-gray-400" />
                        <p className="text-sm font-bold text-gray-400">
                          ギフトコード発行待ち
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <p className="text-[10px] text-gray-400 font-bold">
                      申請日: {new Date(item.created_at).toLocaleString('ja-JP')}
                    </p>
                    {item.updated_at && (
                      <p className="text-[10px] text-gray-400 font-bold">
                        更新日: {new Date(item.updated_at).toLocaleString('ja-JP')}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  )
}
