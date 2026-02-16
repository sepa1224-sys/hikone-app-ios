'use client'

import { useState, useEffect } from 'react'
import { getPendingSubmissions, approveSubmission, rejectSubmission } from '@/lib/actions/mission-review'
import { Loader2, Check, X, User, ZoomIn, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AdminReviewPage() {
  const router = useRouter()
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  
  // モーダル用
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    fetchSubmissions()
  }, [])

  const fetchSubmissions = async () => {
    setLoading(true)
    const data = await getPendingSubmissions()
    setSubmissions(data)
    setLoading(false)
  }

  const handleApprove = async (sub: any) => {
    if (!confirm('承認してポイントを付与しますか？')) return
    
    setProcessingId(sub.id)
    const result = await approveSubmission(sub.id, sub.user_id, sub.mission.points, sub.mission.title)
    
    if (result.success) {
      setSubmissions(prev => prev.filter(s => s.id !== sub.id))
    } else {
      alert('エラーが発生しました: ' + result.error)
    }
    setProcessingId(null)
  }

  const openRejectModal = (id: string) => {
    setSelectedSubmissionId(id)
    setRejectReason('')
    setRejectModalOpen(true)
  }

  const handleReject = async () => {
    if (!selectedSubmissionId || !rejectReason.trim()) return

    setProcessingId(selectedSubmissionId)
    const result = await rejectSubmission(selectedSubmissionId, rejectReason)

    if (result.success) {
      setSubmissions(prev => prev.filter(s => s.id !== selectedSubmissionId))
      setRejectModalOpen(false)
    } else {
      alert('エラーが発生しました: ' + result.error)
    }
    setProcessingId(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* ヘッダー */}
      <div className="bg-white px-6 py-4 border-b sticky top-0 z-10 flex items-center gap-3">
        <button 
          onClick={() => router.push('/admin')} 
          className="p-2 -ml-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
          aria-label="管理画面に戻る"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-black text-gray-800">ミッション承認待ち一覧</h1>
        <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-full">
          {submissions.length}件
        </span>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-gray-400" size={32} />
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-20 text-gray-400 flex flex-col items-center">
            <p className="font-bold mb-6">承認待ちの投稿はありません</p>
            <button 
              onClick={() => router.push('/admin')}
              className="px-6 py-3 bg-white border-2 border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2"
            >
              <ArrowLeft size={20} />
              <span>管理画面ダッシュボードに戻る</span>
            </button>
          </div>
        ) : (
          submissions.map((sub) => (
            <div key={sub.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex flex-col sm:flex-row">
                {/* 画像エリア */}
                <div className="relative w-full sm:w-1/3 aspect-video sm:aspect-auto bg-gray-100 group cursor-pointer" onClick={() => setSelectedImage(sub.image_url)}>
                  {sub.image_url ? (
                    <img src={sub.image_url} alt="proof" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">No Image</div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <ZoomIn className="text-white drop-shadow-md" />
                  </div>
                </div>

                {/* 情報エリア */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden">
                        {sub.user?.avatar_url ? (
                          <img src={sub.user.avatar_url} className="w-full h-full object-cover" />
                        ) : (
                          <User size={16} className="m-1 text-gray-400" />
                        )}
                      </div>
                      <span className="text-sm text-gray-600 font-bold">{sub.user?.full_name || '不明なユーザー'}</span>
                      <span className="text-xs text-gray-400 ml-auto">{new Date(sub.created_at).toLocaleString('ja-JP')}</span>
                    </div>
                    
                    <h3 className="text-lg font-black text-gray-800 mb-1">{sub.mission?.title}</h3>
                    <p className="text-amber-500 font-bold text-sm mb-3">{sub.mission?.points} pt</p>
                    
                    {sub.reviewer_comment && (
                       <div className="bg-red-50 text-red-600 text-xs p-2 rounded mb-3 font-bold">
                         ⚠️ {sub.reviewer_comment}
                       </div>
                    )}
                  </div>

                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => handleApprove(sub)}
                      disabled={!!processingId}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-black flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {processingId === sub.id ? <Loader2 className="animate-spin" /> : <Check size={20} />}
                      承認
                    </button>
                    <button
                      onClick={() => openRejectModal(sub.id)}
                      disabled={!!processingId}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-3 rounded-xl font-black flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <X size={20} />
                      却下
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 画像拡大モーダル */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} className="max-w-full max-h-full rounded-lg shadow-2xl" />
          <button className="absolute top-4 right-4 text-white p-2 bg-white/20 rounded-full">
            <X size={24} />
          </button>
        </div>
      )}

      {/* 却下理由モーダル */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-black mb-4">却下の理由</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-red-500 outline-none h-32 resize-none font-bold"
              placeholder="理由を入力してください（例：写真が不鮮明です）"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="flex-1 bg-red-500 text-white py-3 rounded-xl font-black disabled:opacity-50"
              >
                確定
              </button>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-black"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
