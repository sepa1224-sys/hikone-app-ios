'use client'

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Send, ChevronLeft, UserCircle, Coins, AlertCircle,
  Check, X, Loader2, Sparkles, ArrowRight, Camera,
  Users, Search, Plus, FileText
} from 'lucide-react'
import BottomNavigation from '@/components/BottomNavigation'
import { usePoints, usePointHistory } from '@/lib/hooks/usePoints'
import { sendHikopo, getReceiverInfo } from '@/lib/actions/transfer'
import QRScanner from '@/components/QRScanner'
import { useAuth } from '@/components/AuthProvider'
import { useFriends } from '@/lib/hooks/useFriends'

type TabType = '履歴' | '連絡先'

function TransferPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { session, user: authUser, loading: authLoading } = useAuth()

  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('履歴')

  // 送金モーダル
  const [showSendModal, setShowSendModal] = useState(false)

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

  // 確認ダイアログ
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // QRスキャナー
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // データフック
  const { friends, isLoading: friendsLoading } = useFriends(currentUser?.id)
  const { history, isLoading: historyLoading, refetch: refetchHistory } = usePointHistory(currentUser?.id)
  const { points, isLoading: pointsLoading, refetch: refetchPoints } = usePoints(currentUser?.id)

  const [searchQuery, setSearchQuery] = useState('')

  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends
    const query = searchQuery.toLowerCase()
    return friends.filter(f =>
      (f.full_name?.toLowerCase().includes(query)) ||
      (f.referral_code?.toLowerCase().includes(query))
    )
  }, [friends, searchQuery])

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

  useEffect(() => {
    if (authLoading) return
    setLoading(false)
    if (!session || !authUser) {
      router.push('/login')
      return
    }
    setCurrentUser(authUser)
    const code = searchParams.get('code')
    if (code) {
      const cleanedCode = code.trim().toUpperCase()
      setReceiverCode(cleanedCode)
      checkReceiver(cleanedCode)
      setShowSendModal(true)
    }
  }, [authLoading, session, authUser, router, searchParams, checkReceiver])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (receiverCode.length >= 8) checkReceiver(receiverCode)
    }, 500)
    return () => clearTimeout(timer)
  }, [receiverCode, checkReceiver])

  const handleQRScanSuccess = useCallback((referralCode: string) => {
    const cleanedCode = referralCode.trim().toUpperCase()
    setReceiverCode(cleanedCode)
    setShowQRScanner(false)
    setToast(`コード「${cleanedCode}」を読み取りました`)
    setTimeout(() => setToast(null), 3000)
    checkReceiver(cleanedCode)
    setShowSendModal(true)
  }, [checkReceiver])

  const handleOpenConfirm = () => {
    setResult(null)
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
      setResult({ success: false, message: `😢 ヒコポが足りません！残高: ${points.toLocaleString()} pt` })
      return
    }
    if (!receiverPreview?.found) {
      setResult({ success: false, message: '🔍 送り先のコードが見つかりません' })
      return
    }
    setShowConfirmDialog(true)
  }

  const handleSend = async () => {
    if (!currentUser?.id) return
    setShowConfirmDialog(false)
    setSending(true)
    setResult(null)
    try {
      const transferResult = await sendHikopo(currentUser.id, receiverCode.trim(), parseInt(amount))
      setResult(transferResult)
      if (transferResult.success) {
        refetchPoints()
        refetchHistory()
        const audio = new Audio('/cat-meow.mp3')
        audio.play().catch(() => {})
        setReceiverCode('')
        setAmount('')
        setReceiverPreview(null)
        setTimeout(() => {
          setShowSendModal(false)
          setResult(null)
        }, 2000)
      }
    } catch {
      setResult({ success: false, message: '予期しないエラーが発生しました' })
    } finally {
      setSending(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const dayNames = ['日', '月', '火', '水', '木', '金', '土']
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    const day = dayNames[date.getDay()]
    if (date.getFullYear() !== now.getFullYear()) {
      return `${date.getFullYear()}/${mm}/${dd}`
    }
    return `${mm}/${dd} (${day})`
  }

  const getHistoryStyle = (type: string, description: string) => {
    const isSent = type === 'use' || description?.includes('送金') || description?.includes('送り')
    const isReceived = description?.includes('受け取') || description?.includes('受信')
    if (isSent) return { bg: 'bg-orange-100', icon: <Send size={18} className="text-orange-500" /> }
    if (isReceived) return { bg: 'bg-green-100', icon: <Coins size={18} className="text-green-500" /> }
    if (type === 'referral') return { bg: 'bg-purple-100', icon: <Users size={18} className="text-purple-500" /> }
    if (type === 'earn') return { bg: 'bg-blue-100', icon: <Sparkles size={18} className="text-blue-500" /> }
    return { bg: 'bg-gray-100', icon: <Coins size={18} className="text-gray-400" /> }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🐱</div>
          <p className="font-black text-gray-400">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">

      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-10">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ChevronLeft size={22} className="text-gray-700" />
        </button>
        <h1 className="text-base font-black text-gray-800">送る・受け取る</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={() => router.push('/profile')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <UserCircle size={22} className="text-gray-600" />
          </button>
          <button
            onClick={() => setShowQRScanner(true)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Camera size={22} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* 検索バー */}
      <div className="px-4 py-3 bg-white">
        <div className="bg-gray-100 rounded-full flex items-center px-4 py-2.5 gap-2">
          <Search size={15} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="招待コードや名前で検索..."
            className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none font-bold"
          />
        </div>
      </div>

      {/* タブ */}
      <div className="flex border-b border-gray-200 bg-white sticky top-[57px] z-10">
        {(['履歴', '連絡先'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-black transition-colors ${
              activeTab === tab
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-400'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* コンテンツ */}
      <div className="pb-40">
        {activeTab === '履歴' ? (
          historyLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-gray-300 mb-2" />
              <p className="text-sm text-gray-400 font-bold">履歴を読み込み中...</p>
            </div>
          ) : history.length > 0 ? (
            history.map((item) => {
              const style = getHistoryStyle(item.type, item.description)
              const isPositive = item.amount > 0
              return (
                <div key={item.id} className="flex items-center px-4 py-3.5 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className={`w-11 h-11 rounded-full ${style.bg} flex items-center justify-center flex-shrink-0 mr-3`}>
                    {style.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-gray-800 truncate">{item.description || '取引'}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className={`text-sm font-black ${isPositive ? 'text-green-600' : 'text-gray-800'}`}>
                      {isPositive ? '+' : ''}{item.amount.toLocaleString()}pt
                    </p>
                    <p className="text-xs text-gray-400 font-bold">{formatDate(item.created_at)}</p>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Coins size={28} className="text-gray-300" />
              </div>
              <p className="text-sm font-black text-gray-400">まだ取引履歴がありません</p>
              <p className="text-xs text-gray-300 mt-1">ひこポを送って履歴を作りましょう</p>
            </div>
          )
        ) : (
          friendsLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-gray-300 mb-2" />
              <p className="text-sm text-gray-400 font-bold">連絡先を読み込み中...</p>
            </div>
          ) : filteredFriends.length > 0 ? (
            filteredFriends.map((friend) => (
              <button
                key={friend.friend_id}
                onClick={() => {
                  if (friend.referral_code) {
                    setReceiverCode(friend.referral_code)
                    checkReceiver(friend.referral_code)
                    setShowSendModal(true)
                  }
                }}
                className="w-full flex items-center px-4 py-3.5 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left"
              >
                {friend.avatar_url ? (
                  <img src={friend.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover mr-3 flex-shrink-0" />
                ) : (
                  <div className="w-11 h-11 bg-gray-200 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                    <UserCircle size={24} className="text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-gray-800">{friend.full_name || 'ユーザー'}</p>
                  <p className="text-xs text-gray-400 font-bold">コード: {friend.referral_code}</p>
                </div>
                <Send size={17} className="text-orange-400 flex-shrink-0" />
              </button>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Users size={28} className="text-gray-300" />
              </div>
              <p className="text-sm font-black text-gray-400">
                {searchQuery ? '見つかりませんでした' : '友達がまだいません'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => router.push('/friends')}
                  className="mt-3 text-xs text-orange-500 font-black hover:underline"
                >
                  友達を追加する
                </button>
              )}
            </div>
          )
        )}
      </div>

      {/* 下部アクションバー（BottomNavigation の上） */}
      <div className="fixed bottom-16 left-0 right-0 z-20 flex gap-3 px-4 py-3 bg-white border-t border-gray-100">
        <button
          onClick={() => {
            setReceiverCode('')
            setAmount('')
            setReceiverPreview(null)
            setResult(null)
            setShowSendModal(true)
          }}
          className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-orange-200 active:scale-95 transition-all"
        >
          <Send size={17} />
          送る
        </button>
        <button
          onClick={() => {
            setToast('この機能は準備中です')
            setTimeout(() => setToast(null), 2500)
          }}
          className="flex-1 border-2 border-teal-400 text-teal-500 py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <FileText size={17} />
          請求
        </button>
        <button
          onClick={() => router.push('/friends')}
          className="w-12 h-12 bg-blue-500 text-white rounded-2xl font-black flex items-center justify-center shadow-md shadow-blue-200 active:scale-95 transition-all"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* 送金モーダル（下からスライド） */}
      {showSendModal && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => { setShowSendModal(false); setResult(null) }}
          />
          <div className="relative bg-white rounded-t-[2rem] w-full max-w-xl shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* ドラッグハンドル */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            <div className="px-6 pt-2 pb-8">
              {/* モーダルヘッダー */}
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-black text-gray-800">ひこポを送る</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400">残高</span>
                  <span className="text-sm font-black text-orange-500">
                    {pointsLoading ? '...' : points.toLocaleString()}pt
                  </span>
                  <button
                    onClick={() => { setShowSendModal(false); setResult(null) }}
                    className="p-1 hover:bg-gray-100 rounded-full ml-1 transition-colors"
                  >
                    <X size={20} className="text-gray-400" />
                  </button>
                </div>
              </div>

              {/* 送り先コード入力 */}
              <div className="mb-4">
                <label className="text-xs font-black text-gray-500 mb-1.5 block">送り先の招待コード</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={receiverCode}
                    onChange={(e) => setReceiverCode(e.target.value.toUpperCase())}
                    placeholder="招待コードを入力..."
                    maxLength={12}
                    className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 font-black text-center tracking-widest text-base text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
                  />
                  <button
                    onClick={() => setShowQRScanner(true)}
                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-2xl transition-all active:scale-95"
                  >
                    <Camera size={20} />
                  </button>
                </div>

                {/* 相手プレビュー */}
                {checkingReceiver && (
                  <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-gray-50 rounded-xl">
                    <Loader2 size={13} className="animate-spin text-gray-400" />
                    <span className="text-xs text-gray-400 font-bold">確認中...</span>
                  </div>
                )}
                {!checkingReceiver && receiverPreview && (
                  <div className={`flex items-center gap-2 mt-2 px-3 py-2 rounded-xl ${
                    receiverPreview.found ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    {receiverPreview.found ? (
                      <>
                        {receiverPreview.avatarUrl ? (
                          <img src={receiverPreview.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <div className="w-7 h-7 bg-green-200 rounded-full flex items-center justify-center">
                            <UserCircle size={16} className="text-green-600" />
                          </div>
                        )}
                        <p className="text-xs font-black text-green-700 flex-1">{receiverPreview.name}</p>
                        <Check size={15} className="text-green-500" />
                      </>
                    ) : (
                      <>
                        <AlertCircle size={15} className="text-red-400" />
                        <p className="text-xs font-black text-red-500">コードが見つかりません</p>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* 送金額 */}
              <div className="mb-4">
                <label className="text-xs font-black text-gray-500 mb-1.5 block">送金額</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    min="1"
                    max={points}
                    className="w-full bg-gray-100 rounded-2xl px-4 py-3 pr-12 font-black text-2xl text-center text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">pt</span>
                </div>
                <div className="flex gap-2 mt-2">
                  {[100, 500, 1000].map((qa) => (
                    <button
                      key={qa}
                      onClick={() => setAmount(String(Math.min(qa, points)))}
                      disabled={points < qa}
                      className="flex-1 py-2 bg-orange-50 hover:bg-orange-100 disabled:bg-gray-100 disabled:text-gray-400 text-orange-500 rounded-xl font-black text-xs transition-colors"
                    >
                      {qa.toLocaleString()}
                    </button>
                  ))}
                  <button
                    onClick={() => setAmount(String(points))}
                    disabled={points <= 0}
                    className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white rounded-xl font-black text-xs transition-colors"
                  >
                    全額
                  </button>
                </div>
              </div>

              {/* 結果メッセージ */}
              {result && (
                <div className={`p-3 rounded-xl text-center mb-4 ${
                  result.success ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <p className={`text-xs font-black ${result.success ? 'text-green-700' : 'text-red-600'}`}>
                    {result.message}
                  </p>
                </div>
              )}

              {/* 送金ボタン */}
              <button
                onClick={handleOpenConfirm}
                disabled={sending || !receiverCode.trim() || !amount || parseInt(amount) <= 0}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:from-gray-300 disabled:to-gray-400 text-white py-4 rounded-2xl font-black text-base shadow-md shadow-orange-200 active:scale-95 disabled:active:scale-100 transition-all flex items-center justify-center gap-2"
              >
                {sending ? (
                  <><Loader2 size={20} className="animate-spin" />送金中...</>
                ) : (
                  <><Send size={20} />送金する</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 確認ダイアログ */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowConfirmDialog(false)}
          />
          <div className="relative bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Sparkles size={28} className="text-orange-500" />
              </div>
              <h3 className="text-lg font-black text-gray-800 mb-1">送金の確認</h3>
              <p className="text-xs text-gray-500 font-bold">以下の内容で送金しますか？</p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 mb-5 space-y-3">
              <div className="flex items-center gap-3">
                {receiverPreview?.avatarUrl ? (
                  <img src={receiverPreview.avatarUrl} alt="" className="w-11 h-11 rounded-full object-cover" />
                ) : (
                  <div className="w-11 h-11 bg-orange-100 rounded-full flex items-center justify-center">
                    <UserCircle size={26} className="text-orange-500" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-xs text-gray-400 font-bold">送り先</p>
                  <p className="text-sm font-black text-gray-800">{receiverPreview?.name || 'ユーザー'}</p>
                </div>
              </div>
              <div className="flex justify-center">
                <ArrowRight size={18} className="text-gray-300" />
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400 font-bold mb-1">送金額</p>
                <p className="text-3xl font-black text-orange-500">
                  {parseInt(amount).toLocaleString()}<span className="text-base ml-1">pt</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl font-black text-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <X size={16} />キャンセル
              </button>
              <button
                onClick={handleSend}
                className="py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Send size={16} />送金する
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

      {/* トースト通知 */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9998] animate-in slide-in-from-top duration-300">
          <div className="bg-gray-800 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2">
            <Check size={15} />
            <span className="font-black text-sm">{toast}</span>
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
      <div className="min-h-screen bg-white flex items-center justify-center">
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
