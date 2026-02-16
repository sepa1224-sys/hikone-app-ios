'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { getAdminPayoutRequests, approvePayout } from '@/lib/actions/admin'
import { Loader2, CheckCircle2, AlertCircle, Check, Clock, ChevronLeft } from 'lucide-react'

export default function AdminPayoutsPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchRequests()
    }
  }, [user])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const res = await getAdminPayoutRequests()
      if (res.success) {
        setRequests(res.requests || [])
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (request: any) => {
    if (!confirm(`${request.shop_name} への ${request.amount.toLocaleString()}円 の振込を完了としてマークしますか？\n（店舗のポイント残高から減算されます）`)) {
      return
    }

    setProcessingId(request.id)
    try {
      // 2026-02-12: shop_id引数は Server Action 側で自動解決される場合もあるが、
      // ここでは明示的に request.shop_id (これは owner_id) を渡しています。
      const res = await approvePayout(request.id, request.shop_id, request.amount)
      if (res.success) {
        alert('振込完了処理を行いました')
        fetchRequests() // リスト更新
      } else {
        alert(`エラー: ${res.message}`)
      }
    } catch (error) {
      console.error(error)
      alert('処理中にエラーが発生しました')
    } finally {
      setProcessingId(null)
    }
  }

  if (authLoading) {
    return <div className="flex justify-center items-center min-h-screen"><Loader2 className="animate-spin" /></div>
  }

  // 管理者チェック
  if (!user || !profile?.is_admin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <AlertCircle className="text-red-500 mb-4" size={48} />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">アクセス権限がありません</h1>
        <p className="text-gray-600 mb-4">このページは管理者専用です。</p>
        <Link href="/" className="text-blue-600 hover:underline">トップページへ戻る</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/admin" className="inline-flex items-center text-gray-500 hover:text-gray-900 transition-colors">
            <ChevronLeft size={20} />
            <span className="font-bold">ダッシュボードに戻る</span>
          </Link>
        </div>

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">振込申請管理 (Admin)</h1>
          <button 
            onClick={fetchRequests} 
            className="text-sm text-blue-600 hover:underline"
          >
            再読み込み
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin text-gray-400" />
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-500 shadow-sm">
            申請履歴はありません
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => {
              const isPaid = req.status === 'paid' || req.status === 'completed'
              return (
              <div key={req.id} className={`bg-white rounded-xl p-6 shadow-sm border flex flex-col md:flex-row md:items-center justify-between gap-4 ${isPaid ? 'border-green-100 bg-green-50/30' : 'border-gray-100'}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {isPaid ? (
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">
                            <Check size={12} /> 振込完了
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-bold">
                            <Clock size={12} /> 未振込
                        </span>
                    )}
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">ID: {req.shop_id.slice(0, 8)}...</span>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-800 text-lg">{req.shop_name}</span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl font-black text-blue-600">{req.amount.toLocaleString()}</span>
                    <span className="text-sm font-bold text-gray-500">円</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    申請日時: {new Date(req.created_at).toLocaleString('ja-JP')}
                  </p>
                  {req.processed_at && (
                    <p className="text-xs text-green-600 mt-0.5">
                        完了日時: {new Date(req.processed_at).toLocaleString('ja-JP')}
                    </p>
                  )}

                  {/* 銀行口座情報表示エリア */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm border border-gray-100">
                    <p className="font-bold text-gray-600 mb-1 text-xs">振込先口座情報:</p>
                    {req.bank_details ? (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-700">
                        <div><span className="text-gray-400 text-xs">銀行:</span> {req.bank_details.bank_name}</div>
                        <div><span className="text-gray-400 text-xs">支店:</span> {req.bank_details.branch_name}</div>
                        <div><span className="text-gray-400 text-xs">種別:</span> {req.bank_details.account_type === 'ordinary' ? '普通' : req.bank_details.account_type === 'current' ? '当座' : req.bank_details.account_type}</div>
                        <div><span className="text-gray-400 text-xs">番号:</span> {req.bank_details.account_number}</div>
                        <div className="col-span-2 border-t border-gray-200 mt-1 pt-1">
                          <span className="text-gray-400 text-xs">名義:</span> <span className="font-bold">{req.bank_details.account_holder}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-red-500 text-xs font-bold">⚠️ 口座情報が見つかりません</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 md:flex-col md:items-end md:min-w-[140px]">
                  {req.status === 'pending' ? (
                      <button
                        onClick={() => handleApprove(req)}
                        disabled={!!processingId}
                        className="flex-1 md:w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md shadow-blue-100 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100"
                      >
                        {processingId === req.id ? (
                          <Loader2 className="animate-spin" size={18} />
                        ) : (
                          <>
                            <CheckCircle2 size={18} />
                            振込完了
                          </>
                        )}
                      </button>
                  ) : (
                      <div className="flex-1 md:w-full py-2 px-4 bg-gray-100 text-gray-400 rounded-lg font-bold flex items-center justify-center gap-2 cursor-not-allowed">
                          <CheckCircle2 size={18} />
                          完了済み
                      </div>
                  )}
                </div>
              </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
