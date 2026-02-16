'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSystemSettings } from '@/lib/hooks/useSystemSettings'
import { supabase } from '@/lib/supabase'
import { Settings, TrendingUp, Save, AlertCircle, CheckCircle, Gift, Package, XCircle, CheckCircle2, Clock, Target, ChevronRight, Home, Banknote, Store, Plus } from 'lucide-react'
import Link from 'next/link'
import { GIFT_EXCHANGE_TYPES, getGiftExchangeType } from '@/lib/constants/giftExchangeTypes'
import { useAuth } from '@/components/AuthProvider'
import { getPendingPayoutCount, getAdminShops, createShopByAdmin, assignShopOwner, revokeShopOwner } from '@/lib/actions/admin'

interface GiftExchangeRequest {
  id: string
  user_id: string
  gift_card_type: string
  points_amount: number
  status: 'pending' | 'approved' | 'rejected' | 'sent'
  gift_code?: string // ギフトコード
  created_at: string
  updated_at?: string
  user?: {
    full_name?: string
    email?: string
  }
}

// export const revalidate = 0; // Client Componentではexportできないため削除

export default function AdminDashboard() {
  const router = useRouter()
  const { user: authUser, profile: authProfile, loading: authLoading } = useAuth()
  const { settings, loading: settingsLoading, updateBasePointRate } = useSystemSettings()
  const [monthlyPoints, setMonthlyPoints] = useState<number>(0)
  const [loadingPoints, setLoadingPoints] = useState(true)
  const [newPointRate, setNewPointRate] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // ギフト交換申請関連
  const [giftRequests, setGiftRequests] = useState<GiftExchangeRequest[]>([])
  const [loadingGiftRequests, setLoadingGiftRequests] = useState(true)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'sent'>('pending') // デフォルトを 'pending' に設定
  const [approvingRequestId, setApprovingRequestId] = useState<string | null>(null)
  const [giftCodeInput, setGiftCodeInput] = useState<string>('')

  // 振込申請関連
  const [pendingPayoutsCount, setPendingPayoutsCount] = useState<number>(0)
  const [loadingPayouts, setLoadingPayouts] = useState(true)
  
  // 店舗リスト
  const [shops, setShops] = useState<any[]>([])
  const [loadingShops, setLoadingShops] = useState(true)
  
  // 管理者権限チェック
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [checkingAdmin, setCheckingAdmin] = useState(true)

  // 新規店舗作成用
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ shopId: '', email: '' })
  const [creating, setCreating] = useState(false)

  // 管理者権限チェック
  useEffect(() => {
    if (authLoading) return
    
    if (!authUser) {
      router.push('/')
      return
    }

    if (authProfile) {
      if (authProfile.is_admin !== true) {
        router.push('/')
        return
      }
      setIsAdmin(true)
      setCheckingAdmin(false)
    }
  }, [authUser, authProfile, authLoading, router])

  // 今月発行された合計ポイントを取得
  useEffect(() => {
    async function fetchMonthlyPoints() {
      try {
        setLoadingPoints(true)
        const now = new Date()
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

        const { data, error } = await supabase
          .from('point_history')
          .select('amount')
          .gte('created_at', firstDayOfMonth.toISOString())
          .lte('created_at', lastDayOfMonth.toISOString())

        if (error) throw error

        // 今月発行されたポイントの合計を計算
        const total = data?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0
        setMonthlyPoints(total)
      } catch (err) {
        console.error('❌ [Admin] 月間ポイント取得エラー:', err)
        setMonthlyPoints(0)
      } finally {
        setLoadingPoints(false)
      }
    }

    fetchMonthlyPoints()
  }, [])

  // 振込申請の未処理件数を取得
  useEffect(() => {
    async function fetchPayoutCount() {
      setLoadingPayouts(true)
      const res = await getPendingPayoutCount()
      if (res.success) {
        setPendingPayoutsCount(res.count)
      }
      setLoadingPayouts(false)
    }
    fetchPayoutCount()
  }, [])

  // 店舗リストを取得
  useEffect(() => {
    async function fetchShops() {
      setLoadingShops(true)
      try {
        const res = await getAdminShops()
        console.log("getAdminShops Response:", res)
        
        if (res.success && Array.isArray(res.shops)) {
          setShops(res.shops)
        } else {
          console.error("❌ 店舗データの取得に失敗しました:", res)
          setShops([])
        }
      } catch (error) {
        console.error("❌ fetchShops error:", error)
        setShops([])
      } finally {
        setLoadingShops(false)
      }
    }
    fetchShops()
  }, [])

  // 設定が読み込まれたら、フォームの初期値を設定
  useEffect(() => {
    if (settings && !newPointRate) {
      setNewPointRate(settings.base_point_rate.toString())
    }
  }, [settings, newPointRate])

  // ギフト交換申請を取得
  useEffect(() => {
    async function fetchGiftRequests() {
      try {
        setLoadingGiftRequests(true)
        let query = supabase
          .from('gift_exchange_requests')
          .select(`
            *,
            profiles:user_id (
              full_name,
              email
            )
          `)
          .order('created_at', { ascending: false })

        if (filterStatus !== 'all') {
          query = query.eq('status', filterStatus)
        }

        const { data, error } = await query

        if (error) throw error

        // ユーザー情報を結合
        const requestsWithUser = (data || []).map((req: any) => ({
          ...req,
          user: req.profiles || null
        }))

        setGiftRequests(requestsWithUser)
      } catch (err) {
        console.error('❌ [Admin] ギフト申請取得エラー:', err)
        setGiftRequests([])
      } finally {
        setLoadingGiftRequests(false)
      }
    }

    fetchGiftRequests()
  }, [filterStatus])

  // ステータスを更新
  const handleUpdateStatus = async (requestId: string, newStatus: 'pending' | 'approved' | 'rejected' | 'sent', giftCode?: string) => {
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      }

      // 承認時はギフトコードも保存
      if (newStatus === 'approved' && giftCode) {
        updateData.gift_code = giftCode.trim()
      }

      const { error } = await supabase
        .from('gift_exchange_requests')
        .update(updateData)
        .eq('id', requestId)

      if (error) throw error

      // リストを更新
      setGiftRequests(prev =>
        prev.map(req =>
          req.id === requestId
            ? { ...req, status: newStatus, gift_code: giftCode || req.gift_code, updated_at: new Date().toISOString() }
            : req
        )
      )

      // 承認処理のモーダルを閉じる
      setApprovingRequestId(null)
      setGiftCodeInput('')
    } catch (err) {
      console.error('❌ [Admin] ステータス更新エラー:', err)
      alert('ステータスの更新に失敗しました')
    }
  }

  // 承認処理（ギフトコード入力）
  const handleApprove = (requestId: string) => {
    setApprovingRequestId(requestId)
    setGiftCodeInput('')
  }

  // 承認を確定
  const handleConfirmApprove = async () => {
    if (!approvingRequestId || !giftCodeInput.trim()) {
      alert('ギフトコードを入力してください')
      return
    }

    await handleUpdateStatus(approvingRequestId, 'approved', giftCodeInput.trim())
  }

  // 店舗オーナー紐付け処理
  const handleAssignOwner = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.shopId) {
      alert('店舗を選択してください')
      return
    }
    setCreating(true)
    try {
      const res = await assignShopOwner(createForm.shopId, createForm.email)
      if (res.success) {
        alert('店舗にオーナーを紐付けました')
        setShowCreateModal(false)
        setCreateForm({ shopId: '', email: '' })
        
        // リロードして一覧更新
        setLoadingShops(true)
        const shopsRes = await getAdminShops()
        if (shopsRes.success && shopsRes.shops) {
          setShops(shopsRes.shops)
        }
        setLoadingShops(false)
      } else {
        alert(res.message)
      }
    } catch (error) {
      console.error('Owner assignment error:', error)
      alert('エラーが発生しました')
    } finally {
      setCreating(false)
    }
  }

  // 店舗オーナー解除処理
  const handleRevokeOwner = async (shopId: string, shopName: string, ownerName: string) => {
    if (!confirm(`店舗「${shopName}」のオーナー「${ownerName}」の権限を解除しますか？\n解除すると、このユーザーは店舗管理画面にアクセスできなくなります。`)) {
      return
    }
    
    try {
      setLoadingShops(true) // 操作中はローディング表示にするか、個別に処理中の状態を持つのが理想だが簡易的に
      const res = await revokeShopOwner(shopId)
      
      if (res.success) {
        alert('オーナー権限を解除しました')
        // リロードして一覧更新
        const shopsRes = await getAdminShops()
        if (shopsRes.success && shopsRes.shops) {
          setShops(shopsRes.shops)
        }
      } else {
        alert(res.message)
      }
    } catch (error) {
      console.error('Revoke owner error:', error)
      alert('エラーが発生しました')
    } finally {
      setLoadingShops(false)
    }
  }

  // 設定保存処理
  const handleSave = async () => {
    const rate = parseFloat(newPointRate)
    if (isNaN(rate) || rate < 0) {
      setSaveMessage({ type: 'error', text: '有効な数値を入力してください' })
      setTimeout(() => setSaveMessage(null), 3000)
      return
    }

    setSaving(true)
    setSaveMessage(null)

    const success = await updateBasePointRate(rate)
    if (success) {
      setSaveMessage({ type: 'success', text: '設定を保存しました' })
      setTimeout(() => setSaveMessage(null), 3000)
    } else {
      setSaveMessage({ type: 'error', text: '設定の保存に失敗しました' })
      setTimeout(() => setSaveMessage(null), 3000)
    }

    setSaving(false)
  }

  // 消化率を計算
  const monthlyLimit = settings?.monthly_point_limit || 100000
  const usageRate = monthlyLimit > 0 ? (monthlyPoints / monthlyLimit) * 100 : 0
  const remainingPoints = monthlyLimit - monthlyPoints

  // 管理者権限チェック中または権限がない場合は何も表示しない（リダイレクト中）
  if (checkingAdmin || authLoading || isAdmin === false || !authUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">アクセス権限を確認中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-gray-900 mb-2 flex items-center gap-3">
              <Settings size={40} className="text-blue-600" />
              管理者ダッシュボード
            </h1>
            <p className="text-gray-600">システム設定とポイント発行状況を管理します</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 bg-white text-gray-600 px-4 py-2 rounded-xl font-bold hover:bg-gray-50 transition-colors shadow-sm border border-gray-200 self-start md:self-auto"
          >
            <Home size={20} />
            アプリに戻る
          </button>
        </div>

        {/* ローディング状態 */}
        {(settingsLoading || loadingPoints) && (
          <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">データを読み込み中...</p>
          </div>
        )}

        {/* メインコンテンツ */}
        {!settingsLoading && !loadingPoints && (
          <>
            {/* 今月の発行済みポイントカード */}
            <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                  <TrendingUp size={28} className="text-blue-600" />
                  今月の発行済みポイント
                </h2>
                <span className="text-sm font-bold text-gray-500">
                  {new Date().getFullYear()}年{new Date().getMonth() + 1}月
                </span>
              </div>

              {/* プログレスバー */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl font-black text-gray-900">
                    {monthlyPoints.toLocaleString()}
                  </span>
                  <span className="text-lg font-bold text-gray-600">
                    / {monthlyLimit.toLocaleString()} pt
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      usageRate >= 90
                        ? 'bg-red-500'
                        : usageRate >= 70
                        ? 'bg-yellow-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(usageRate, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2 text-sm">
                  <span className={`font-bold ${
                    usageRate >= 90
                      ? 'text-red-600'
                      : usageRate >= 70
                      ? 'text-yellow-600'
                      : 'text-blue-600'
                  }`}>
                    消化率: {usageRate.toFixed(1)}%
                  </span>
                  <span className="text-gray-600">
                    残り: {remainingPoints.toLocaleString()} pt
                  </span>
                </div>
              </div>

              {/* 警告表示 */}
              {usageRate >= 90 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-600 mt-0.5" />
                  <div>
                    <p className="font-bold text-red-900">警告</p>
                    <p className="text-sm text-red-700">
                      月間発行上限に近づいています。設定の見直しを検討してください。
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ナビゲーションカードグリッド */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* 振込申請管理へのリンク */}
              <div className="bg-white rounded-2xl p-6 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-3 rounded-xl">
                      <Banknote size={28} className="text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-gray-900">振込申請管理</h2>
                      <p className="text-sm text-gray-500 font-bold">店舗からの振込申請を確認</p>
                    </div>
                  </div>
                  <Link 
                    href="/admin/payouts" 
                    className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
                  >
                    確認する
                    <ChevronRight size={18} />
                  </Link>
                </div>
                {/* 未処理件数バッジ */}
                {!loadingPayouts && pendingPayoutsCount > 0 && (
                  <div className="absolute top-4 right-4 bg-red-500 text-white text-xs font-black px-2 py-1 rounded-full animate-pulse shadow-md z-20">
                    未処理: {pendingPayoutsCount}件
                  </div>
                )}
              </div>

              {/* ミッション承認管理へのリンク */}
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-100 p-3 rounded-xl">
                      <CheckCircle2 size={28} className="text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-gray-900">承認待ち</h2>
                      <p className="text-sm text-gray-500 font-bold">写真投稿の審査</p>
                    </div>
                  </div>
                  <Link 
                    href="/admin/review" 
                    className="flex items-center gap-2 bg-purple-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-purple-700 transition-colors"
                  >
                    審査画面
                    <ChevronRight size={18} />
                  </Link>
                </div>
              </div>
            </div>

            {/* マンスリーミッション管理へのリンク */}
            <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 p-3 rounded-xl">
                    <Target size={28} className="text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900">マンスリーミッション管理</h2>
                    <p className="text-sm text-gray-500 font-bold">月ごとのミッションを設定・編集します</p>
                  </div>
                </div>
                <Link 
                  href="/admin/missions" 
                  className="flex items-center gap-2 bg-gray-900 text-white px-5 py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors"
                >
                  設定画面へ
                  <ChevronRight size={18} />
                </Link>
              </div>
            </div>

            {/* 店舗一覧 */}
            <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                  <Store size={28} className="text-blue-600" />
                  店舗一覧
                </h2>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-1"
                >
                  <Plus size={16} />
                  店舗オーナー紐付け
                </button>
              </div>
              
              {loadingShops ? (
                 <div className="text-center py-8 text-gray-500">読み込み中...</div>
              ) : shops.length === 0 ? (
                 <div className="text-center py-8 text-gray-500">店舗が登録されていません</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b-2 border-gray-100 text-gray-500 text-sm">
                        <th className="pb-3 pl-2">店舗名</th>
                        <th className="pb-3">オーナー</th>
                        <th className="pb-3">スタンプ設定</th>
                        <th className="pb-3 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shops.map((shop) => (
                        <tr key={shop.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-4 pl-2 font-bold text-gray-900">{shop.name}</td>
                          <td className="py-4 text-gray-600 text-sm">
                            <div className="font-bold">{shop.owner_name}</div>
                            <div className="text-xs text-gray-400">{shop.profiles?.email}</div>
                          </td>
                          <td className="py-4 text-gray-600 font-bold">
                            {shop.stamp_count ? `${shop.stamp_count}個` : '未設定'}
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {shop.owner_id ? (
                                <button
                                  onClick={() => handleRevokeOwner(shop.id, shop.name, shop.owner_name)}
                                  className="inline-flex items-center gap-1 bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-200 transition-colors"
                                >
                                  <XCircle size={14} />
                                  権限解除
                                </button>
                              ) : (
                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">未設定</span>
                              )}
                              <Link
                                href={`/shop/settings?impersonateShopId=${shop.id}`}
                                className="inline-flex items-center gap-1 bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-700 transition-colors"
                              >
                                <Settings size={14} />
                                管理
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 設定変更フォーム */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
                <Settings size={28} className="text-blue-600" />
                ポイント単価設定
              </h2>

              <div className="space-y-4">
                {/* 現在の設定表示 */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-bold text-gray-600 mb-1">現在の設定</p>
                  <p className="text-2xl font-black text-gray-900">
                    {settings?.base_point_rate || 15} pt/km
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    最終更新: {settings?.updated_at
                      ? new Date(settings.updated_at).toLocaleString('ja-JP')
                      : '未設定'}
                  </p>
                </div>

                {/* 入力フォーム */}
                <div>
                  <label htmlFor="pointRate" className="block text-sm font-bold text-gray-700 mb-2">
                    新しいポイント単価 (pt/km)
                  </label>
                  <input
                    id="pointRate"
                    type="number"
                    min="0"
                    step="0.1"
                    value={newPointRate}
                    onChange={(e) => setNewPointRate(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-lg font-bold"
                    placeholder="例: 15"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    1kmあたりのポイント数を設定します
                  </p>
                </div>

                {/* 保存ボタン */}
                <button
                  onClick={handleSave}
                  disabled={saving || !newPointRate}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save size={20} />
                      設定を保存
                    </>
                  )}
                </button>

                {/* 保存メッセージ */}
                {saveMessage && (
                  <div
                    className={`rounded-lg p-4 flex items-center gap-3 ${
                      saveMessage.type === 'success'
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    {saveMessage.type === 'success' ? (
                      <CheckCircle size={20} className="text-green-600" />
                    ) : (
                      <AlertCircle size={20} className="text-red-600" />
                    )}
                    <p
                      className={`font-bold ${
                        saveMessage.type === 'success' ? 'text-green-900' : 'text-red-900'
                      }`}
                    >
                      {saveMessage.text}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ギフト交換申請管理 */}
            <div className="bg-white rounded-2xl p-6 shadow-lg mt-6">
              <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
                <Gift size={28} className="text-orange-600" />
                ギフト交換申請管理
              </h2>

              {/* フィルター */}
              <div className="flex gap-2 mb-6 flex-wrap">
                {(['all', 'pending', 'approved', 'rejected', 'sent'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-4 py-2 rounded-lg font-black text-sm transition-all ${
                      filterStatus === status
                        ? status === 'pending'
                          ? 'bg-yellow-500 text-white'
                          : status === 'approved'
                          ? 'bg-blue-500 text-white'
                          : status === 'rejected'
                          ? 'bg-red-500 text-white'
                          : status === 'sent'
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-800 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {status === 'all' && 'すべて'}
                    {status === 'pending' && '審査中'}
                    {status === 'approved' && '承認済み'}
                    {status === 'rejected' && '却下'}
                    {status === 'sent' && '送付済み'}
                  </button>
                ))}
              </div>

              {/* 申請一覧 */}
              {loadingGiftRequests ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">読み込み中...</p>
                </div>
              ) : giftRequests.length === 0 ? (
                <div className="text-center py-8">
                  <Package size={48} className="text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-bold">申請はありません</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {giftRequests.map((request) => (
                    <div key={request.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow">
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              request.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-700'
                                : request.status === 'approved'
                                ? 'bg-blue-100 text-blue-700'
                                : request.status === 'rejected'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {request.status === 'pending' && '審査中'}
                              {request.status === 'approved' && '承認済み'}
                              {request.status === 'rejected' && '却下'}
                              {request.status === 'sent' && '送付済み'}
                            </span>
                            <span className="text-gray-400 text-xs">
                              {new Date(request.created_at).toLocaleString('ja-JP')}
                            </span>
                          </div>
                          
                          <div className="mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-black text-gray-900">
                                {getGiftExchangeType(request.gift_card_type)?.label || request.gift_card_type}
                              </span>
                              <span className="text-gray-500 font-bold">
                                {request.points_amount.toLocaleString()} pt
                              </span>
                            </div>
                            <div className="text-sm text-gray-600">
                              申請者: {request.user?.full_name || '不明'} ({request.user?.email || '不明'})
                            </div>
                          </div>

                          {request.gift_code && (
                            <div className="bg-gray-50 p-2 rounded text-sm font-mono text-gray-700 mt-2">
                              コード: {request.gift_code}
                            </div>
                          )}
                        </div>

                        {/* アクションボタン */}
                        <div className="flex items-center gap-2">
                          {request.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(request.id)}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors"
                              >
                                承認
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(request.id, 'rejected')}
                                className="bg-red-100 text-red-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-200 transition-colors"
                              >
                                却下
                              </button>
                            </>
                          )}
                          {request.status === 'approved' && (
                            <button
                              onClick={() => handleUpdateStatus(request.id, 'sent')}
                              className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-700 transition-colors"
                            >
                              送付済みにする
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* 承認モーダル */}
        {approvingRequestId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
              <h3 className="text-xl font-black text-gray-900 mb-4">ギフトコード入力</h3>
              <p className="text-gray-600 text-sm mb-4">
                ユーザーに送付するギフトコードを入力してください。<br/>
                承認すると、ユーザーの履歴にコードが表示されます。
              </p>
              
              <input
                type="text"
                value={giftCodeInput}
                onChange={(e) => setGiftCodeInput(e.target.value)}
                placeholder="XXXX-XXXX-XXXX"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg mb-6 focus:outline-none focus:border-blue-500 font-mono"
                autoFocus
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setApprovingRequestId(null)}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleConfirmApprove}
                  disabled={!giftCodeInput.trim()}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  承認して確定
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* 店舗オーナー紐付けモーダル */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-gray-900">店舗オーナー紐付け</h3>
            <p className="text-sm text-gray-600 mb-4">
              既存の店舗にオーナー（ユーザー）を割り当てます。<br/>
              ユーザーは事前に登録済みである必要があります。
            </p>
            <form onSubmit={handleAssignOwner}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">対象店舗（全店舗表示中 - デバッグモード）</label>
                  <select 
                    required
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={createForm.shopId}
                    onChange={e => setCreateForm({...createForm, shopId: e.target.value})}
                  >
                    <option value="">店舗を選択してください</option>
                    {shops.length === 0 && <option disabled>店舗が見つかりません</option>}
                    {shops.map(shop => (
                      <option key={shop.id} value={shop.id}>
                        {shop.name} {shop.owner_id ? '(オーナー設定済)' : '(未設定)'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">オーナーメールアドレス</label>
                  <input 
                    type="email" 
                    required 
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={createForm.email}
                    onChange={e => setCreateForm({...createForm, email: e.target.value})}
                    placeholder="owner@example.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">※すでにユーザー登録済みのメールアドレスを入力してください</p>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
                <button 
                  type="submit" 
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {creating && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                  このユーザーを店主に任命する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
