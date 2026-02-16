'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Gift, ArrowLeft, CheckCircle, AlertCircle, Loader2, Coins } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { usePoints } from '@/lib/hooks/usePoints'
import { supabase } from '@/lib/supabase'
import { GIFT_EXCHANGE_TYPES, getAvailableGiftExchangeTypes, type GiftExchangeType, type GiftExchangeOption } from '@/lib/constants/giftExchangeTypes'
import BottomNavigation from '@/components/BottomNavigation'

export default function RedeemPage() {
  const router = useRouter()
  const { user: authUser } = useAuth()
  const { points, loading: pointsLoading, refetch: refetchPoints } = usePoints(authUser?.id ?? null)
  const [selectedType, setSelectedType] = useState<GiftExchangeType | null>(null)
  const [selectedOption, setSelectedOption] = useState<GiftExchangeOption | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null)

  const availableTypes = getAvailableGiftExchangeTypes()

  // 交換申請を送信
  const handleSubmit = async () => {
    if (!authUser || !selectedType || !selectedOption) {
      console.error('❌ [Redeem] 必須パラメータが不足:', { authUser: !!authUser, selectedType: !!selectedType, selectedOption: !!selectedOption })
      return
    }

    // 必要ポイントを数値として取得
    const requiredPoints = Number(selectedOption.points)
    console.log('🔄 [Redeem] 交換処理開始:', {
      userId: authUser.id,
      giftType: selectedType.name,
      option: selectedOption.name,
      requiredPoints,
      currentPoints: points,
      pointsType: typeof points
    })

    if (isNaN(requiredPoints) || requiredPoints <= 0) {
      const errorMsg = `無効なポイント数: ${selectedOption.points}`
      console.error('❌ [Redeem]', errorMsg)
      alert(`エラー: ${errorMsg}`)
      setSubmitResult({
        success: false,
        message: errorMsg
      })
      return
    }

    if (requiredPoints > points) {
      setSubmitResult({
        success: false,
        message: '保有ポイントが不足しています'
      })
      return
    }

    setSubmitting(true)
    setSubmitResult(null)

    try {
      // 1. 現在のポイントを取得
      console.log('📥 [Redeem] ポイント取得開始...')
      const { data: currentProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', authUser.id)
        .single()

      if (fetchError) {
        console.error('❌ [Redeem] ポイント取得エラー:', fetchError)
        const errorMsg = `ポイント取得エラー: ${fetchError.message} (コード: ${fetchError.code || 'N/A'})`
        alert(`エラー: ${errorMsg}`)
        setSubmitResult({
          success: false,
          message: errorMsg
        })
        return
      }

      // ポイントを数値として明示的に変換
      const currentPoints = Number(currentProfile?.points) || 0
      console.log('✅ [Redeem] ポイント取得成功:', {
        currentPoints,
        currentPointsType: typeof currentPoints,
        requiredPoints,
        requiredPointsType: typeof requiredPoints
      })

      if (isNaN(currentPoints)) {
        const errorMsg = `無効なポイント値: ${currentProfile?.points}`
        console.error('❌ [Redeem]', errorMsg)
        alert(`エラー: ${errorMsg}`)
        setSubmitResult({
          success: false,
          message: errorMsg
        })
        return
      }

      if (requiredPoints > currentPoints) {
        const errorMsg = `保有ポイントが不足しています (現在: ${currentPoints}pt, 必要: ${requiredPoints}pt)`
        console.error('❌ [Redeem]', errorMsg)
        alert(`エラー: ${errorMsg}`)
        setSubmitResult({
          success: false,
          message: errorMsg
        })
        return
      }

      // 新しいポイントを計算（数値として明示的に計算）
      const newPoints = Number(currentPoints) - Number(requiredPoints)
      console.log('🧮 [Redeem] ポイント計算:', {
        currentPoints,
        requiredPoints,
        newPoints,
        newPointsType: typeof newPoints
      })

      if (isNaN(newPoints) || newPoints < 0) {
        const errorMsg = `無効な計算結果: ${currentPoints} - ${requiredPoints} = ${newPoints}`
        console.error('❌ [Redeem]', errorMsg)
        alert(`エラー: ${errorMsg}`)
        setSubmitResult({
          success: false,
          message: errorMsg
        })
        return
      }

      // 2. ポイントを減算
      console.log('💾 [Redeem] ポイント更新開始...')
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ points: newPoints })
        .eq('id', authUser.id)

      if (updateError) {
        console.error('❌ [Redeem] ポイント更新エラー詳細:', updateError)
        const errorMsg = `ポイント更新エラー: ${updateError.message} (コード: ${updateError.code || 'N/A'})`
        alert(`エラー: ${errorMsg}`)
        setSubmitResult({
          success: false,
          message: errorMsg
        })
        return
      }

      console.log('✅ [Redeem] ポイント更新成功:', { newPoints })

      // 3. ポイント履歴にマイナス記録を保存
      console.log('📝 [Redeem] ポイント履歴保存開始...')
      const historyData = {
        user_id: authUser.id,
        amount: -Number(requiredPoints), // マイナス値を数値として明示的に変換
        activity_type: 'redemption', // ポイント交換（ランニングと区別）
        description: `${selectedType.name}交換`, // 例: "Amazonギフト券交換"
        reason: `${selectedType.name}交換`, // 例: "Amazonギフト券交換"
        created_at: new Date().toISOString()
      }
      console.log('📝 [Redeem] 履歴保存データ:', historyData)

      const { error: historyError } = await supabase
        .from('point_history')
        .insert(historyData)

      if (historyError) {
        console.error('❌ [Redeem] 履歴保存エラー詳細:', historyError)
        // 履歴保存が失敗しても申請は続行（警告のみ）
        alert(`警告: 履歴保存に失敗しましたが、申請は続行します。\nエラー: ${historyError.message} (コード: ${historyError.code || 'N/A'})`)
      } else {
        console.log('✅ [Redeem] ポイント履歴保存成功')
      }

      // 4. ギフト交換申請をデータベースに保存
      console.log('🎁 [Redeem] ギフト交換申請保存開始...')
      const requestData = {
        user_id: authUser.id,
        gift_card_type: selectedType.id,
        points_amount: Number(requiredPoints), // 数値として明示的に変換
        status: 'pending', // 申請中
        created_at: new Date().toISOString()
      }
      console.log('🎁 [Redeem] 申請データ:', requestData)

      const { data, error } = await supabase
        .from('gift_exchange_requests')
        .insert(requestData)
        .select()
        .single()

      if (error) {
        console.error('❌ [Redeem] 申請エラー詳細:', error)
        const errorMsg = `申請に失敗しました: ${error.message} (コード: ${error.code || 'N/A'})\n詳細: ${JSON.stringify(error, null, 2)}`
        alert(`エラー: ${errorMsg}`)
        // ポイントは既に減算されているので、ロールバックはしない（管理者が手動で対応）
        setSubmitResult({
          success: false,
          message: `申請に失敗しました: ${error.message}`
        })
        return
      }

      console.log('✅ [Redeem] 申請成功 - 申請データ:', data)
      setSubmitResult({
        success: true,
        message: 'ギフト交換の申請を受け付けました。審査後、送付いたします。'
      })

      // ポイント情報を再取得
      refetchPoints()

      // フォームをリセット
      setTimeout(() => {
        setSelectedType(null)
        setSelectedOption(null)
        setSubmitResult(null)
      }, 3000)
    } catch (error: any) {
      console.error('❌ [Redeem] 予期しないエラー:', error)
      const errorMsg = `予期しないエラーが発生しました: ${error?.message || String(error)}`
      alert(`エラー: ${errorMsg}`)
      setSubmitResult({
        success: false,
        message: errorMsg
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
              <h1 className="text-xl font-black text-gray-900">ポイント交換所</h1>
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
                  setSelectedOption(null)
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
              </button>
            ))}
          </div>
        </div>

        {/* 金額オプション選択 */}
        {selectedType && selectedType.options && (
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="text-lg font-black text-gray-900 mb-4">金額を選択</h2>
            <div className="grid grid-cols-2 gap-4">
              {selectedType.options.map((option) => {
                const canAfford = points >= option.points
                return (
                  <button
                    key={option.id}
                    onClick={() => {
                      if (canAfford) {
                        setSelectedOption(option)
                        setSubmitResult(null)
                      }
                    }}
                    disabled={!canAfford}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedOption?.id === option.id
                        ? 'border-orange-500 bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg'
                        : canAfford
                        ? 'border-gray-200 bg-white hover:border-gray-300 text-gray-800'
                        : 'border-gray-100 bg-gray-50 text-gray-400 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <p className={`text-lg font-black mb-1 ${selectedOption?.id === option.id ? 'text-white' : canAfford ? 'text-gray-900' : 'text-gray-400'}`}>
                      {option.name}
                    </p>
                    <p className={`text-sm font-bold ${selectedOption?.id === option.id ? 'text-white/80' : canAfford ? 'text-gray-600' : 'text-gray-400'}`}>
                      {option.points.toLocaleString()} pt
                    </p>
                    {!canAfford && (
                      <p className="text-xs text-red-500 font-bold mt-1">ポイント不足</p>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* 申請ボタン */}
        {selectedType && selectedOption && (
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="space-y-4">
              {/* 選択内容の確認 */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm font-bold text-gray-600 mb-2">交換内容</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-black text-gray-900">
                      {selectedType.icon} {selectedType.name}
                    </p>
                    <p className="text-sm text-gray-600 font-bold">{selectedOption.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-gray-900">
                      {selectedOption.points.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 font-bold">pt</p>
                  </div>
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
                disabled={submitting || selectedOption.points > points}
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
