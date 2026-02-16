'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Gift, ArrowLeft, CheckCircle, AlertCircle, Loader2, Coins } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { usePoints } from '@/lib/hooks/usePoints'
import { supabase } from '@/lib/supabase'
import { GIFT_EXCHANGE_TYPES, getAvailableGiftExchangeTypes, type GiftExchangeType } from '@/lib/constants/giftExchangeTypes'
import BottomNavigation from '@/components/BottomNavigation'

export default function GiftExchangePage() {
  const router = useRouter()
  const { user: authUser } = useAuth()
  const { points, loading: pointsLoading, refetch: refetchPoints } = usePoints()
  const [selectedType, setSelectedType] = useState<GiftExchangeType | null>(null)
  const [exchangeAmount, setExchangeAmount] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null)

  const availableTypes = getAvailableGiftExchangeTypes()

  // 交換申請を送信
  const handleSubmit = async () => {
    if (!authUser || !selectedType) return

    const amount = parseInt(exchangeAmount)
    if (isNaN(amount) || amount < selectedType.minPoints) {
      setSubmitResult({
        success: false,
        message: `最低${selectedType.minPoints}ポイントから交換できます`
      })
      return
    }

    if (amount > points) {
      setSubmitResult({
        success: false,
        message: '保有ポイントを超えています'
      })
      return
    }

    setSubmitting(true)
    setSubmitResult(null)

    try {
      // ギフト交換申請をデータベースに保存
      const { data, error } = await supabase
        .from('gift_exchange_requests')
        .insert({
          user_id: authUser.id,
          gift_card_type: selectedType.id,
          points_amount: amount,
          status: 'pending', // 申請中
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('❌ [GiftExchange] 申請エラー:', error)
        setSubmitResult({
          success: false,
          message: `申請に失敗しました: ${error.message}`
        })
        return
      }

      console.log('✅ [GiftExchange] 申請成功:', data)
      
      // 音声を再生
      const audio = new Audio('/cat-meow.mp3')
      audio.play().catch(e => console.log('音声再生に失敗しました:', e))

      setSubmitResult({
        success: true,
        message: 'ギフト交換の申請を受け付けました。審査後、送付いたします。'
      })

      // フォームをリセット
      setTimeout(() => {
        setSelectedType(null)
        setExchangeAmount('')
        setSubmitResult(null)
      }, 3000)
    } catch (error) {
      console.error('❌ [GiftExchange] 予期しないエラー:', error)
      setSubmitResult({
        success: false,
        message: '予期しないエラーが発生しました'
      })
    } finally {
      setSubmitting(false)
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
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
              <Gift size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900">ギフト交換</h1>
              <p className="text-xs text-gray-500 font-bold">ポイントをギフトに交換</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 保有ポイント表示 */}
        <div className="bg-gradient-to-br from-amber-500 to-yellow-500 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Coins size={32} className="text-white" />
              <div>
                <p className="text-sm font-bold text-white/80 mb-1">保有ポイント</p>
                <p className="text-3xl font-black">
                  {pointsLoading ? '...' : points.toLocaleString()}
                  <span className="text-lg font-bold ml-1">pt</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 交換先選択 */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-black text-gray-900 mb-4">交換先を選択</h2>
          <div className="grid grid-cols-2 gap-4">
            {availableTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => {
                  setSelectedType(type)
                  setSubmitResult(null)
                }}
                className={`p-4 rounded-xl border-2 transition-all ${
                  selectedType?.id === type.id
                    ? `border-${type.color.split('-')[1]}-500 bg-gradient-to-br ${type.color} text-white shadow-lg`
                    : 'border-gray-200 bg-white hover:border-gray-300 text-gray-800'
                }`}
              >
                <div className="text-3xl mb-2">{type.icon}</div>
                <p className={`text-sm font-black mb-1 ${selectedType?.id === type.id ? 'text-white' : 'text-gray-900'}`}>
                  {type.name}
                </p>
                <p className={`text-xs font-bold ${selectedType?.id === type.id ? 'text-white/80' : 'text-gray-500'}`}>
                  {type.description}
                </p>
                <p className={`text-xs font-bold mt-2 ${selectedType?.id === type.id ? 'text-white/90' : 'text-gray-600'}`}>
                  最低 {type.minPoints.toLocaleString()}pt
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* 交換金額入力 */}
        {selectedType && (
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="text-lg font-black text-gray-900 mb-4">交換金額</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-gray-700 mb-2 block">
                  ポイント数
                </label>
                <input
                  type="number"
                  value={exchangeAmount}
                  onChange={(e) => setExchangeAmount(e.target.value)}
                  placeholder={`${selectedType.minPoints}以上を入力`}
                  min={selectedType.minPoints}
                  max={points}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl font-black text-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                />
                <p className="text-xs text-gray-500 mt-2 font-bold">
                  最低 {selectedType.minPoints.toLocaleString()}pt から交換できます
                </p>
              </div>

              {/* クイック選択ボタン */}
              <div>
                <p className="text-xs font-bold text-gray-500 mb-2">クイック選択</p>
                <div className="flex gap-2">
                  {[selectedType.minPoints, 1000, 2000, 5000].map((amt) => {
                    if (amt < selectedType.minPoints || amt > points) return null
                    return (
                      <button
                        key={amt}
                        onClick={() => setExchangeAmount(String(amt))}
                        className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-black text-sm transition-colors"
                      >
                        {amt.toLocaleString()}pt
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 結果メッセージ */}
              {submitResult && (
                <div
                  className={`p-4 rounded-xl flex items-center gap-3 ${
                    submitResult.success
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}
                >
                  {submitResult.success ? (
                    <CheckCircle size={20} className="text-green-600" />
                  ) : (
                    <AlertCircle size={20} className="text-red-600" />
                  )}
                  <p
                    className={`text-sm font-black ${
                      submitResult.success ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {submitResult.message}
                  </p>
                </div>
              )}

              {/* 送信ボタン */}
              <button
                onClick={handleSubmit}
                disabled={submitting || !exchangeAmount || parseInt(exchangeAmount) < selectedType.minPoints}
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-xl font-black text-lg transition-all active:scale-95 disabled:active:scale-100 flex items-center justify-center gap-2 shadow-lg"
              >
                {submitting ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    申請中...
                  </>
                ) : (
                  <>
                    <Gift size={20} />
                    交換を申請する
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* 注意事項 */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <h3 className="text-sm font-black text-blue-900 mb-2 flex items-center gap-2">
            <AlertCircle size={16} />
            ご注意事項
          </h3>
          <ul className="text-xs text-blue-700 space-y-1 font-bold">
            <li>• 申請後、審査に1〜3営業日かかります</li>
            <li>• 審査完了後、メールまたはアプリ内通知でお知らせします</li>
            <li>• 交換したポイントは返却できません</li>
            <li>• 地元飲食店のクーポンは対象店舗でのみ使用可能です</li>
          </ul>
        </div>
      </div>

      <BottomNavigation />
    </div>
  )
}
