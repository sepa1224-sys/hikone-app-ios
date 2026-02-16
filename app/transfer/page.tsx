'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  Send, ChevronLeft, UserCircle, Coins, AlertCircle, 
  Check, X, Loader2, Sparkles, ArrowRight, QrCode, Camera,
  Users, Search, UserPlus
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Suspense, useMemo } from 'react'
import BottomNavigation from '@/components/BottomNavigation'
import { usePoints } from '@/lib/hooks/usePoints'
import { sendHikopo, getReceiverInfo } from '@/lib/actions/transfer'
import QRScanner from '@/components/QRScanner'
import { useAuth } from '@/components/AuthProvider'
import { useFriends } from '@/lib/hooks/useFriends'

function TransferPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // AuthProvider から認証状態を取得
  const { session, user: authUser, loading: authLoading } = useAuth()
  
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  // 送金フォーム
  const [receiverCode, setReceiverCode] = useState('')
  const [amount, setAmount] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  
  // 送金相手のプレビュー
  const [receiverPreview, setReceiverPreview] = useState<{
    found: boolean
    name?: string
    avatarUrl?: string
  } | null>(null)
  const [checkingReceiver, setCheckingReceiver] = useState(false)
  
  // 友達リスト
  const { friends, isLoading: friendsLoading } = useFriends(currentUser?.id)
  const [friendSearchQuery, setFriendSearchQuery] = useState('')

  // 検索フィルタリングされた友達リスト
  const filteredFriends = useMemo(() => {
    if (!friendSearchQuery.trim()) return friends
    const query = friendSearchQuery.toLowerCase()
    return friends.filter(f => 
      (f.full_name?.toLowerCase().includes(query)) || 
      (f.referral_code?.toLowerCase().includes(query))
    )
  }, [friends, friendSearchQuery])
  
  // 確認ダイアログ
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  
  // QRスキャナー
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [scanToast, setScanToast] = useState<string | null>(null)
  
  // ポイント情報
  const { points, isLoading: pointsLoading, refetch: refetchPoints } = usePoints(currentUser?.id)
  
  // 送金相手の確認（デバウンス付き）
  const checkReceiver = useCallback(async (code: string) => {
    if (code.length < 8) {
      setReceiverPreview(null)
      return
    }
    
    setCheckingReceiver(true)
    try {
      const info = await getReceiverInfo(code)
      setReceiverPreview(info)
    } catch {
      setReceiverPreview({ found: false })
    } finally {
      setCheckingReceiver(false)
    }
  }, [])

  // AuthProvider の状態が確定したら認証チェック
  useEffect(() => {
    console.log('💸 [Transfer] 認証状態:', { authLoading, hasSession: !!session })
    
    // AuthProvider がまだローディング中なら何もしない
    if (authLoading) return
    
    // ロード状態を先に解除（カメラ権限待ちなどで止まらないように）
    setLoading(false)
    
    // セッションがない場合はログインページへ
    if (!session || !authUser) {
      console.log('💸 [Transfer] セッションなし → ログインページへ')
      router.push('/login')
      return
    }
    
    // セッションがある場合
    console.log('💸 [Transfer] セッション確認OK')
    setCurrentUser(authUser)

    // URLパラメータから招待コードを取得
    const code = searchParams.get('code')
    if (code) {
      const cleanedCode = code.trim().toUpperCase()
      setReceiverCode(cleanedCode)
      checkReceiver(cleanedCode)
    }
  }, [authLoading, session, authUser, router, searchParams, checkReceiver])
  
  // コード入力時のハンドラ
  useEffect(() => {
    const timer = setTimeout(() => {
      if (receiverCode.length >= 8) {
        checkReceiver(receiverCode)
      }
    }, 500)
    
    return () => clearTimeout(timer)
  }, [receiverCode, checkReceiver])
  
  // QRスキャン成功時
  const handleQRScanSuccess = useCallback((referralCode: string) => {
    const cleanedCode = referralCode.trim().toUpperCase()
    setReceiverCode(cleanedCode)
    setShowQRScanner(false)
    
    // トースト表示
    setScanToast(`コード「${cleanedCode}」を読み取りました`)
    setTimeout(() => setScanToast(null), 3000)
    
    // 相手の情報を取得
    checkReceiver(cleanedCode)
  }, [checkReceiver])
  
  // 確認ダイアログを開く
  const handleOpenConfirm = () => {
    setResult(null)
    
    // バリデーション（分かりやすい日本語エラーメッセージ）
    if (!receiverCode.trim()) {
      setResult({ success: false, message: '📝 送り先の招待コードを入力してください' })
      return
    }
    
    if (receiverCode.trim().length < 8 || receiverCode.trim().length > 12) {
      setResult({ success: false, message: '🔢 招待コードは8〜12桁で入力してください' })
      return
    }
    
    if (!amount || parseInt(amount) <= 0) {
      setResult({ success: false, message: '💰 送金額を1ポイント以上で入力してください' })
      return
    }
    
    if (parseInt(amount) > points) {
      setResult({ success: false, message: `😢 ヒコポが足りません！現在の残高は ${points.toLocaleString()} ポイントです` })
      return
    }
    
    if (!receiverPreview?.found) {
      setResult({ success: false, message: '🔍 送り先のコードが見つかりません。コードを確認してください' })
      return
    }
    
    setShowConfirmDialog(true)
  }
  
  // 送金実行
  const handleSend = async () => {
    if (!currentUser?.id) return
    
    setShowConfirmDialog(false)
    setSending(true)
    setResult(null)
    
    try {
      const transferResult = await sendHikopo(
        currentUser.id,
        receiverCode.trim(),
        parseInt(amount)
      )
      
      setResult(transferResult)
      
      if (transferResult.success) {
        // 成功時：ポイントを再取得、フォームをリセット
        refetchPoints()

        // 音声再生
        const audio = new Audio('/cat-meow.mp3')
        audio.play().catch(e => console.log('音声再生に失敗しました:', e))

        setReceiverCode('')
        setAmount('')
        setReceiverPreview(null)
      }
    } catch (error) {
      console.error('送金エラー:', error)
      setResult({ success: false, message: '予期しないエラーが発生しました' })
    } finally {
      setSending(false)
    }
  }
  
  // クイック金額ボタン
  const quickAmounts = [100, 500, 1000]
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🐱</div>
          <p className="font-black text-gray-400">読み込み中...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="max-w-xl mx-auto p-6 pb-24">
        {/* ヘッダー */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-black text-gray-800">ひこポを送る</h1>
            <p className="text-xs text-gray-500 font-bold">友達にポイントをプレゼント</p>
          </div>
        </div>
        
        {/* 残高表示 */}
        <div className="bg-gradient-to-r from-amber-400 to-yellow-500 rounded-[2rem] p-6 text-white shadow-xl mb-6 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/10 rounded-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Coins size={20} />
              <span className="text-sm font-bold text-white/80">保有ひこポ</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black">
                {pointsLoading ? '...' : points.toLocaleString()}
              </span>
              <span className="text-lg font-bold">pt</span>
            </div>
          </div>
        </div>
        
        {/* 送金フォーム */}
        <div className="bg-white rounded-[2rem] p-6 shadow-lg border border-gray-100 space-y-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Send size={24} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-800">送金する</h2>
              <p className="text-xs text-gray-500 font-bold">相手の招待コードを入力</p>
            </div>
          </div>
          
          {/* 送り先コード入力 */}
          <div className="space-y-2">
            <label className="text-sm font-black text-gray-700 flex items-center gap-2">
              <UserCircle size={16} className="text-amber-500" />
              送り先の招待コード
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={receiverCode}
                onChange={(e) => setReceiverCode(e.target.value.toUpperCase())}
                placeholder="招待コードを入力..."
                maxLength={12}
                className="flex-1 bg-white border-2 border-gray-200 rounded-xl px-4 py-3 font-black text-center tracking-widest text-lg text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:outline-none transition-all"
              />
              <button
                onClick={() => setShowQRScanner(true)}
                className="px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-black transition-all active:scale-95 flex items-center gap-2 shadow-lg"
                title="QRコードをスキャン"
              >
                <Camera size={20} />
                <span className="hidden sm:inline text-sm">QR</span>
              </button>
            </div>
            
            {/* 相手のプレビュー */}
            {checkingReceiver && (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                <Loader2 size={16} className="animate-spin text-gray-400" />
                <span className="text-sm text-gray-400 font-bold">確認中...</span>
              </div>
            )}
            {!checkingReceiver && receiverPreview && (
              <div className={`flex items-center gap-3 p-3 rounded-xl ${
                receiverPreview.found 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                {receiverPreview.found ? (
                  <>
                    {receiverPreview.avatarUrl ? (
                      <img 
                        src={receiverPreview.avatarUrl} 
                        alt="" 
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center">
                        <UserCircle size={24} className="text-green-600" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-black text-green-700">{receiverPreview.name}</p>
                      <p className="text-xs text-green-500 font-bold">送金先が見つかりました</p>
                    </div>
                    <Check size={20} className="text-green-500" />
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 bg-red-200 rounded-full flex items-center justify-center">
                      <AlertCircle size={24} className="text-red-500" />
                    </div>
                    <p className="text-sm font-black text-red-600">コードが見つかりません</p>
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* 送金額入力 */}
          <div className="space-y-2">
            <label className="text-sm font-black text-gray-700 flex items-center gap-2">
              <Coins size={16} className="text-amber-500" />
              送金額
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                min="1"
                max={points}
                className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 pr-12 font-black text-2xl text-center text-gray-900 placeholder:text-gray-400 focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-200 focus:outline-none transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">pt</span>
            </div>
            
            {/* クイック金額ボタン */}
            <div className="flex gap-2">
              {quickAmounts.map((qa) => (
                <button
                  key={qa}
                  onClick={() => setAmount(String(Math.min(qa, points)))}
                  disabled={points < qa}
                  className="flex-1 py-2 bg-amber-100 hover:bg-amber-200 disabled:bg-gray-100 disabled:text-gray-400 text-amber-700 rounded-lg font-black text-sm transition-colors"
                >
                  {qa.toLocaleString()}
                </button>
              ))}
              <button
                onClick={() => setAmount(String(points))}
                disabled={points <= 0}
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white rounded-lg font-black text-sm transition-colors"
              >
                全額
              </button>
            </div>
          </div>
          
          {/* 結果メッセージ */}
          {result && (
            <div className={`p-4 rounded-xl text-center ${
              result.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <p className={`text-sm font-black ${
                result.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {result.message}
              </p>
            </div>
          )}
          
          {/* 送金ボタン */}
          <button
            onClick={handleOpenConfirm}
            disabled={sending || !receiverCode.trim() || !amount || parseInt(amount) <= 0}
            className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 disabled:from-gray-300 disabled:to-gray-400 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-amber-200 active:scale-95 disabled:active:scale-100 transition-all flex items-center justify-center gap-3"
          >
            {sending ? (
              <>
                <Loader2 size={24} className="animate-spin" />
                送金中...
              </>
            ) : (
              <>
                <Send size={24} />
                送金する
              </>
            )}
          </button>
        </div>

        {/* 🆕 友達リストセクション */}
        <div className="bg-white rounded-[2rem] p-6 shadow-lg border border-gray-100 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users size={24} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-800">友達に送る</h2>
                <p className="text-xs text-gray-500 font-bold">友達リストから選択</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/friends')}
              className="p-2 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"
              title="友達管理"
            >
              <UserPlus size={20} />
            </button>
          </div>

          {/* 友達検索バー */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={friendSearchQuery}
              onChange={(e) => setFriendSearchQuery(e.target.value)}
              placeholder="友達を検索（名前やコード）"
              className="w-full bg-gray-50 border-none rounded-xl py-3 pl-12 pr-4 font-bold text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            />
          </div>

          {/* リストエリア */}
          <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
            {friendsLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-gray-300 mb-2" />
                <p className="text-xs text-gray-400 font-bold">友達を読み込み中...</p>
              </div>
            ) : filteredFriends.length > 0 ? (
              filteredFriends.map((friend) => (
                <button
                  key={friend.friend_id}
                  onClick={() => {
                    if (friend.referral_code) {
                      setReceiverCode(friend.referral_code)
                      checkReceiver(friend.referral_code)
                      // 入力欄にフォーカスを当てる（スクロール）
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all active:scale-[0.98] ${
                    receiverCode === friend.referral_code
                      ? 'bg-blue-50 border-2 border-blue-200'
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  {friend.avatar_url ? (
                    <img src={friend.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center text-blue-600">
                      <UserCircle size={24} />
                    </div>
                  )}
                  <div className="flex-1 text-left">
                    <p className="text-sm font-black text-gray-800">{friend.full_name || 'ユーザー'}</p>
                    <p className="text-[10px] text-gray-400 font-bold">コード: {friend.referral_code}</p>
                  </div>
                  {receiverCode === friend.referral_code && (
                    <Check size={18} className="text-blue-500" />
                  )}
                </button>
              ))
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                <p className="text-xs text-gray-400 font-bold">
                  {friendSearchQuery ? '見つかりませんでした' : '友達がまだいません'}
                </p>
                {!friendSearchQuery && (
                  <button
                    onClick={() => router.push('/friends')}
                    className="mt-3 text-xs text-blue-500 font-black hover:underline"
                  >
                    友達を追加する
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 注意書き */}
        <div className="mt-6">
          <p className="text-[10px] text-gray-400 text-center leading-relaxed">
            ※ 送金したポイントは取り消しできません<br/>
            ※ 送金相手の招待コードをご確認ください
          </p>
        </div>
      </div>
      
      {/* 確認ダイアログ */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
          {/* オーバーレイ */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowConfirmDialog(false)}
          />
          
          {/* ダイアログ */}
          <div className="relative bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles size={32} className="text-amber-500" />
              </div>
              <h3 className="text-xl font-black text-gray-800 mb-2">送金の確認</h3>
              <p className="text-sm text-gray-500 font-bold">以下の内容で送金しますか？</p>
            </div>
            
            {/* 送金内容 */}
            <div className="bg-gray-50 rounded-2xl p-4 mb-6 space-y-3">
              {/* 送り先 */}
              <div className="flex items-center gap-3">
                {receiverPreview?.avatarUrl ? (
                  <img 
                    src={receiverPreview.avatarUrl} 
                    alt="" 
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-amber-200 rounded-full flex items-center justify-center">
                    <UserCircle size={28} className="text-amber-600" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-xs text-gray-500 font-bold">送り先</p>
                  <p className="text-sm font-black text-gray-800">{receiverPreview?.name || 'ユーザー'}</p>
                </div>
              </div>
              
              {/* 矢印 */}
              <div className="flex justify-center">
                <ArrowRight size={20} className="text-gray-300" />
              </div>
              
              {/* 金額 */}
              <div className="text-center">
                <p className="text-xs text-gray-500 font-bold mb-1">送金額</p>
                <p className="text-3xl font-black text-amber-600">
                  {parseInt(amount).toLocaleString()}<span className="text-lg ml-1">pt</span>
                </p>
              </div>
            </div>
            
            {/* ボタン */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-black transition-colors flex items-center justify-center gap-2"
              >
                <X size={18} />
                キャンセル
              </button>
              <button
                onClick={handleSend}
                className="py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white rounded-xl font-black transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Send size={18} />
                送金する
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* QRスキャナー */}
      {showQRScanner && (
        <QRScanner
          onScanSuccess={handleQRScanSuccess}
          onClose={() => setShowQRScanner(false)}
        />
      )}
      
      {/* スキャン成功トースト */}
      {scanToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9998] animate-in slide-in-from-top duration-300">
          <div className="bg-green-500 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <Check size={18} />
            </div>
            <span className="font-black text-sm">{scanToast}</span>
          </div>
        </div>
      )}
      
      <BottomNavigation />
    </div>
  )
}

export default function TransferPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🐱</div>
          <p className="font-black text-gray-400">読み込み中...</p>
        </div>
      </div>
    }>
      <TransferPageContent />
    </Suspense>
  )
}
