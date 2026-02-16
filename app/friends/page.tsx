'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  Users, UserPlus, ChevronLeft, Send, Trash2, Search, 
  UserCircle, Loader2, Check, AlertCircle, X, Coins,
  QrCode, Camera
} from 'lucide-react'
import BottomNavigation from '@/components/BottomNavigation'
import { useFriends, addFriend, removeFriend, Friend } from '@/lib/hooks/useFriends'
import { usePoints } from '@/lib/hooks/usePoints'
import { sendHikopo } from '@/lib/actions/transfer'
import QRScanner from '@/components/QRScanner'
import { useAuth } from '@/components/AuthProvider'

export default function FriendsPage() {
  const router = useRouter()
  
  // AuthProvider から認証状態を取得
  const { session, user: authUser, loading: authLoading } = useAuth()
  
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  // フレンド追加
  const [addCode, setAddCode] = useState('')
  const [adding, setAdding] = useState(false)
  const [addResult, setAddResult] = useState<{ success: boolean; message: string } | null>(null)
  
  // フレンド削除
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Friend | null>(null)
  
  // 送金モーダル
  const [showSendModal, setShowSendModal] = useState(false)
  const [sendTarget, setSendTarget] = useState<Friend | null>(null)
  const [sendAmount, setSendAmount] = useState('')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null)
  
  // QRスキャナー
  const [showQRScanner, setShowQRScanner] = useState(false)
  
  // フレンドリスト
  const { friends, isLoading: friendsLoading, refetch: refetchFriends, addFriendToList, removeFriendFromList } = useFriends(currentUser?.id)
  
  // ポイント情報
  const { points, isLoading: pointsLoading, refetch: refetchPoints } = usePoints(currentUser?.id)
  
  // AuthProvider の状態が確定したら認証チェック
  useEffect(() => {
    console.log('👥 [Friends] 認証状態:', { authLoading, hasSession: !!session })
    
    // AuthProvider がまだローディング中なら何もしない
    if (authLoading) return
    
    // セッションがない場合はログインページへ
    if (!session || !authUser) {
      console.log('👥 [Friends] セッションなし → ログインページへ')
      router.push('/login')
      return
    }
    
    // セッションがある場合
    console.log('👥 [Friends] セッション確認OK')
    setCurrentUser(authUser)
    setLoading(false)
  }, [authLoading, session, authUser, router])
  
  // フレンド追加
  const handleAddFriend = async () => {
    if (!currentUser?.id || !addCode.trim()) return
    
    setAdding(true)
    setAddResult(null)
    
    try {
      console.log('🚀 フレンド追加開始:', addCode.trim())
      const result = await addFriend(currentUser.id, addCode.trim())
      console.log('🚀 フレンド追加結果:', result)
      setAddResult(result)
      
      if (result.success && result.friend) {
        setAddCode('')
        // 即座にローカルステートを更新（再取得を待たずに表示）
        addFriendToList(result.friend)
        console.log('🚀 フレンドリストに追加完了')
      }
    } catch (error: any) {
      console.error('フレンド追加エラー:', error)
      setAddResult({ success: false, message: `❌ エラーが発生しました: ${error.message || '不明なエラー'}` })
    } finally {
      setAdding(false)
    }
  }
  
  // QRスキャン成功時
  const handleQRScanSuccess = useCallback((referralCode: string) => {
    setAddCode(referralCode)
    setShowQRScanner(false)
  }, [])
  
  // フレンド削除
  const handleDeleteFriend = async (friend: Friend) => {
    if (!currentUser?.id) return
    
    setDeletingId(friend.friend_id)
    setShowDeleteConfirm(null)
    
    try {
      const result = await removeFriend(currentUser.id, friend.friend_id)
      
      if (result.success) {
        // 即座にローカルステートを更新
        removeFriendFromList(friend.friend_id)
      }
    } catch (error) {
      console.error('フレンド削除エラー:', error)
    } finally {
      setDeletingId(null)
    }
  }
  
  // 送金モーダルを開く
  const openSendModal = (friend: Friend) => {
    setSendTarget(friend)
    setSendAmount('')
    setSendResult(null)
    setShowSendModal(true)
  }
  
  // 送金実行
  const handleSend = async () => {
    if (!currentUser?.id || !sendTarget?.referral_code || !sendAmount) return
    
    const amount = parseInt(sendAmount)
    
    // バリデーション
    if (isNaN(amount) || amount <= 0) {
      setSendResult({ success: false, message: '💰 送金額を1ポイント以上で入力してください' })
      return
    }
    
    if (amount > points) {
      setSendResult({ success: false, message: `😢 ヒコポが足りません！現在の残高は ${points.toLocaleString()} ポイントです` })
      return
    }
    
    setSending(true)
    setSendResult(null)
    
    try {
      const result = await sendHikopo(currentUser.id, sendTarget.referral_code, amount)
      setSendResult(result)
      
      if (result.success) {
        refetchPoints()

        // 音声再生
        const audio = new Audio('/cat-meow.mp3')
        audio.play().catch(e => console.log('音声再生に失敗しました:', e))

        setTimeout(() => {
          setShowSendModal(false)
          setSendTarget(null)
          setSendAmount('')
        }, 1500)
      }
    } catch (error) {
      console.error('送金エラー:', error)
      setSendResult({ success: false, message: '予期しないエラーが発生しました' })
    } finally {
      setSending(false)
    }
  }
  
  // クイック金額
  const quickAmounts = [100, 500, 1000]
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🐱</div>
          <p className="font-black text-gray-400">読み込み中...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
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
            <h1 className="text-xl font-black text-gray-800">フレンド一覧</h1>
            <p className="text-xs text-gray-500 font-bold">友達を追加してヒコポを送ろう</p>
          </div>
          <div className="flex items-center gap-2 bg-amber-100 px-3 py-1.5 rounded-full">
            <Coins size={16} className="text-amber-600" />
            <span className="text-sm font-black text-amber-700">
              {pointsLoading ? '...' : points.toLocaleString()}
            </span>
          </div>
        </div>
        
        {/* フレンド追加カード */}
        <div className="bg-white rounded-[2rem] p-6 shadow-lg border border-gray-100 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <UserPlus size={24} className="text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-800">フレンドを追加</h2>
              <p className="text-xs text-gray-500 font-bold">招待コードを入力して追加</p>
            </div>
          </div>
          
          {/* 入力フォーム */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={addCode}
                onChange={(e) => setAddCode(e.target.value.toUpperCase())}
                placeholder="招待コードを入力..."
                maxLength={12}
                className="flex-1 bg-white border-2 border-gray-200 rounded-xl px-4 py-3 font-black text-center tracking-widest text-lg text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-all"
              />
              <button
                onClick={() => setShowQRScanner(true)}
                className="px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl font-black transition-all active:scale-95 flex items-center gap-2 shadow-lg"
                title="QRコードをスキャン"
              >
                <Camera size={20} />
              </button>
            </div>
            
            <button
              onClick={handleAddFriend}
              disabled={adding || !addCode.trim()}
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 disabled:from-gray-300 disabled:to-gray-400 text-white py-3 rounded-xl font-black shadow-lg active:scale-95 disabled:active:scale-100 transition-all flex items-center justify-center gap-2"
            >
              {adding ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  追加中...
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  フレンドに追加
                </>
              )}
            </button>
            
            {/* 結果メッセージ */}
            {addResult && (
              <div className={`p-3 rounded-xl text-center ${
                addResult.success 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <p className={`text-sm font-black ${
                  addResult.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {addResult.message}
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* フレンドリスト */}
        <div className="bg-white rounded-[2rem] p-6 shadow-lg border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users size={24} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-black text-gray-800">フレンドリスト</h2>
              <p className="text-xs text-gray-500 font-bold">
                {friendsLoading ? '読み込み中...' : `${friends.length}人のフレンド`}
              </p>
            </div>
            {/* リフレッシュボタン */}
            <button
              onClick={() => {
                console.log('🔄 手動リフレッシュ')
                refetchFriends()
              }}
              disabled={friendsLoading}
              className="p-2 bg-blue-100 hover:bg-blue-200 disabled:opacity-50 text-blue-600 rounded-lg transition-colors"
              title="リストを更新"
            >
              <Loader2 size={18} className={friendsLoading ? 'animate-spin' : ''} />
            </button>
          </div>
          
          {friendsLoading ? (
            <div className="py-8 text-center">
              <Loader2 size={32} className="animate-spin text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400 font-bold">読み込み中...</p>
            </div>
          ) : friends.length === 0 ? (
            <div className="py-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users size={32} className="text-gray-300" />
              </div>
              <p className="text-lg font-black text-gray-500 mb-2">
                😢 まだフレンドがいません
              </p>
              <p className="text-sm text-gray-400 font-bold">
                上の入力欄に招待コードを入力して<br/>
                フレンドを追加しよう！
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  {/* アバター */}
                  {friend.avatar_url ? (
                    <img
                      src={friend.avatar_url}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover border-2 border-white shadow"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center border-2 border-white shadow">
                      <UserCircle size={28} className="text-white" />
                    </div>
                  )}
                  
                  {/* 名前とコード */}
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-800 truncate">
                      {friend.full_name || 'ユーザー'}
                    </p>
                    <p className="text-xs text-gray-400 font-bold">
                      {friend.referral_code || '---'}
                    </p>
                  </div>
                  
                  {/* アクションボタン */}
                  <div className="flex items-center gap-2">
                    {/* 送金ボタン */}
                    <button
                      onClick={() => openSendModal(friend)}
                      disabled={!friend.referral_code}
                      className="px-3 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-lg font-black text-sm transition-all active:scale-95 flex items-center gap-1.5 shadow"
                    >
                      <Send size={14} />
                      送る
                    </button>
                    
                    {/* 削除ボタン */}
                    <button
                      onClick={() => setShowDeleteConfirm(friend)}
                      disabled={deletingId === friend.friend_id}
                      className="p-2 bg-gray-200 hover:bg-red-100 text-gray-500 hover:text-red-500 rounded-lg transition-all active:scale-95"
                    >
                      {deletingId === friend.friend_id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* 送金モーダル */}
      {showSendModal && sendTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !sending && setShowSendModal(false)}
          />
          
          <div className="relative bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            {/* ヘッダー */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-gray-800">ヒコポを送る</h3>
              <button
                onClick={() => !sending && setShowSendModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            
            {/* 送り先 */}
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl mb-4">
              {sendTarget.avatar_url ? (
                <img
                  src={sendTarget.avatar_url}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center">
                  <UserCircle size={28} className="text-purple-600" />
                </div>
              )}
              <div>
                <p className="font-black text-gray-800">{sendTarget.full_name || 'ユーザー'}</p>
                <p className="text-xs text-gray-500 font-bold">{sendTarget.referral_code}</p>
              </div>
            </div>
            
            {/* 金額入力 */}
            <div className="mb-4">
              <label className="text-sm font-black text-gray-700 mb-2 block">送金額</label>
              <div className="relative">
                <input
                  type="number"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  placeholder="0"
                  min="1"
                  max={points}
                  className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 pr-12 font-black text-2xl text-center text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-200 focus:outline-none transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">pt</span>
              </div>
              
              {/* クイック金額 */}
              <div className="flex gap-2 mt-2">
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setSendAmount(String(Math.min(amt, points)))}
                    disabled={points < amt}
                    className="flex-1 py-2 bg-amber-100 hover:bg-amber-200 disabled:bg-gray-100 disabled:text-gray-400 text-amber-700 rounded-lg font-black text-sm transition-colors"
                  >
                    {amt.toLocaleString()}
                  </button>
                ))}
                <button
                  onClick={() => setSendAmount(String(points))}
                  disabled={points <= 0}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white rounded-lg font-black text-sm transition-colors"
                >
                  全額
                </button>
              </div>
              
              {/* 残高表示 */}
              <p className="text-xs text-gray-400 text-center mt-2 font-bold">
                保有: {points.toLocaleString()} pt
              </p>
            </div>
            
            {/* 結果メッセージ */}
            {sendResult && (
              <div className={`p-3 rounded-xl text-center mb-4 ${
                sendResult.success 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <p className={`text-sm font-black ${
                  sendResult.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {sendResult.message}
                </p>
              </div>
            )}
            
            {/* ボタン */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowSendModal(false)}
                disabled={sending}
                className="py-3 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-600 rounded-xl font-black transition-colors flex items-center justify-center gap-2"
              >
                <X size={18} />
                キャンセル
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !sendAmount || parseInt(sendAmount) <= 0}
                className="py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-xl font-black transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    送金中...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    送金する
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 削除確認モーダル */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(null)}
          />
          
          <div className="relative bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} className="text-red-500" />
              </div>
              <h3 className="text-lg font-black text-gray-800 mb-2">フレンドを削除</h3>
              <p className="text-sm text-gray-500 font-bold">
                {showDeleteConfirm.full_name || 'このユーザー'}さんを<br/>
                フレンドから削除しますか？
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-black transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => handleDeleteFriend(showDeleteConfirm)}
                className="py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-black transition-colors active:scale-95"
              >
                削除する
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
      
      <BottomNavigation />
    </div>
  )
}
