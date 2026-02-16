'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { MapPin, Play, CheckCircle, AlertCircle, Loader2, RefreshCw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface ShopWithGeoStatus {
  id: string
  name: string
  address: string
  latitude: number | null
  longitude: number | null
  status: 'pending' | 'processing' | 'success' | 'error'
  errorMessage?: string
}

export default function GeocodeAdminPage() {
  const [shops, setShops] = useState<ShopWithGeoStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, success: 0, error: 0 })
  const [log, setLog] = useState<string[]>([])

  // 座標がnullの店舗を取得
  const fetchShopsWithoutCoords = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('shops')
        .select('id, name, address, latitude, longitude')
        .or('latitude.is.null,longitude.is.null')
        .order('name')

      if (error) throw error

      const shopsWithStatus: ShopWithGeoStatus[] = (data || []).map(shop => ({
        ...shop,
        status: 'pending' as const
      }))

      setShops(shopsWithStatus)
      addLog(`📋 座標未設定の店舗: ${shopsWithStatus.length}件`)
    } catch (error: any) {
      console.error('Error fetching shops:', error)
      addLog(`❌ エラー: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // ログを追加
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('ja-JP')
    setLog(prev => [...prev, `[${timestamp}] ${message}`])
  }

  // 単一の店舗のジオコーディングを実行
  const geocodeShop = async (shop: ShopWithGeoStatus): Promise<{ success: boolean; lat?: number; lng?: number; error?: string }> => {
    try {
      const response = await fetch('/api/shops/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: shop.name,
          address: shop.address
        })
      })

      const data = await response.json()

      if (data.success && data.latitude && data.longitude) {
        return { success: true, lat: data.latitude, lng: data.longitude }
      } else {
        return { success: false, error: data.error_message || data.error || '座標取得失敗' }
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'APIエラー' }
    }
  }

  // DBに座標を更新
  const updateShopCoords = async (shopId: string, lat: number, lng: number): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('shops')
        .update({
          latitude: lat,
          longitude: lng,
          updated_at: new Date().toISOString()
        })
        .eq('id', shopId)

      if (error) throw error
      return true
    } catch (error: any) {
      console.error('DB update error:', error)
      return false
    }
  }

  // 一括ジオコーディング実行
  const runBatchGeocode = async () => {
    if (processing) return

    const pendingShops = shops.filter(s => s.status === 'pending' || s.status === 'error')
    if (pendingShops.length === 0) {
      addLog('⚠️ 処理対象の店舗がありません')
      return
    }

    setProcessing(true)
    setProgress({ current: 0, total: pendingShops.length, success: 0, error: 0 })
    addLog(`🚀 一括ジオコーディング開始: ${pendingShops.length}件`)

    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < pendingShops.length; i++) {
      const shop = pendingShops[i]
      
      // ステータスを「処理中」に更新
      setShops(prev => prev.map(s => 
        s.id === shop.id ? { ...s, status: 'processing' as const } : s
      ))

      addLog(`🔍 [${i + 1}/${pendingShops.length}] ${shop.name}`)

      // ジオコーディング実行
      const result = await geocodeShop(shop)

      if (result.success && result.lat && result.lng) {
        // DBに更新
        const dbSuccess = await updateShopCoords(shop.id, result.lat, result.lng)
        
        if (dbSuccess) {
          successCount++
          setShops(prev => prev.map(s => 
            s.id === shop.id ? { 
              ...s, 
              status: 'success' as const, 
              latitude: result.lat!, 
              longitude: result.lng! 
            } : s
          ))
          addLog(`   ✅ 成功: [${result.lat.toFixed(6)}, ${result.lng.toFixed(6)}]`)
        } else {
          errorCount++
          setShops(prev => prev.map(s => 
            s.id === shop.id ? { ...s, status: 'error' as const, errorMessage: 'DB更新失敗' } : s
          ))
          addLog(`   ❌ DB更新失敗`)
        }
      } else {
        errorCount++
        setShops(prev => prev.map(s => 
          s.id === shop.id ? { ...s, status: 'error' as const, errorMessage: result.error } : s
        ))
        addLog(`   ❌ 失敗: ${result.error}`)
      }

      setProgress({ current: i + 1, total: pendingShops.length, success: successCount, error: errorCount })

      // API レート制限対策: 500ms 待機
      if (i < pendingShops.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    addLog(`🎉 一括処理完了: 成功 ${successCount}件 / 失敗 ${errorCount}件`)
    setProcessing(false)
  }

  // 初期ロード
  useEffect(() => {
    fetchShopsWithoutCoords()
  }, [])

  const pendingCount = shops.filter(s => s.status === 'pending').length
  const successCount = shops.filter(s => s.status === 'success').length
  const errorCount = shops.filter(s => s.status === 'error').length

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4">
            <ArrowLeft size={20} />
            <span className="text-sm font-bold">ホームに戻る</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <MapPin size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black">ジオコーディング管理</h1>
              <p className="text-sm text-white/80">店舗住所から緯度・経度を一括取得</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 統計カード */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border">
            <p className="text-xs font-bold text-gray-400 uppercase">未処理</p>
            <p className="text-3xl font-black text-gray-800">{pendingCount}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-green-200 bg-green-50">
            <p className="text-xs font-bold text-green-600 uppercase">成功</p>
            <p className="text-3xl font-black text-green-600">{successCount}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-red-200 bg-red-50">
            <p className="text-xs font-bold text-red-600 uppercase">失敗</p>
            <p className="text-3xl font-black text-red-600">{errorCount}</p>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex gap-3">
          <button
            onClick={runBatchGeocode}
            disabled={processing || pendingCount === 0}
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-white shadow-lg transition-all ${
              processing || pendingCount === 0
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
            }`}
          >
            {processing ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                処理中... ({progress.current}/{progress.total})
              </>
            ) : (
              <>
                <Play size={20} />
                一括実行 ({pendingCount}件)
              </>
            )}
          </button>
          <button
            onClick={fetchShopsWithoutCoords}
            disabled={processing}
            className="p-4 bg-white rounded-2xl border shadow-sm hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            <RefreshCw size={20} className={processing ? 'animate-spin text-gray-400' : 'text-gray-600'} />
          </button>
        </div>

        {/* プログレスバー */}
        {processing && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border">
            <div className="flex justify-between text-sm font-bold text-gray-600 mb-2">
              <span>進行状況</span>
              <span>{Math.round((progress.current / progress.total) * 100)}%</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span className="text-green-600">✅ {progress.success}件成功</span>
              <span className="text-red-600">❌ {progress.error}件失敗</span>
            </div>
          </div>
        )}

        {/* 店舗リスト */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <h2 className="font-black text-gray-800">座標未設定の店舗</h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 size={32} className="animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-gray-500 font-bold">読み込み中...</p>
            </div>
          ) : shops.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle size={48} className="text-green-500 mx-auto mb-2" />
              <p className="text-gray-600 font-bold">すべての店舗に座標が設定されています</p>
            </div>
          ) : (
            <div className="divide-y max-h-96 overflow-y-auto">
              {shops.map(shop => (
                <div key={shop.id} className="px-4 py-3 flex items-center gap-3">
                  {/* ステータスアイコン */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    shop.status === 'success' ? 'bg-green-100' :
                    shop.status === 'error' ? 'bg-red-100' :
                    shop.status === 'processing' ? 'bg-blue-100' :
                    'bg-gray-100'
                  }`}>
                    {shop.status === 'success' && <CheckCircle size={16} className="text-green-600" />}
                    {shop.status === 'error' && <AlertCircle size={16} className="text-red-600" />}
                    {shop.status === 'processing' && <Loader2 size={16} className="text-blue-600 animate-spin" />}
                    {shop.status === 'pending' && <MapPin size={16} className="text-gray-400" />}
                  </div>
                  
                  {/* 店舗情報 */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 truncate">{shop.name}</p>
                    <p className="text-xs text-gray-500 truncate">{shop.address || '住所なし'}</p>
                    {shop.status === 'success' && shop.latitude && shop.longitude && (
                      <p className="text-xs text-green-600 font-mono">
                        [{shop.latitude.toFixed(6)}, {shop.longitude.toFixed(6)}]
                      </p>
                    )}
                    {shop.status === 'error' && shop.errorMessage && (
                      <p className="text-xs text-red-600">{shop.errorMessage}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 実行ログ */}
        {log.length > 0 && (
          <div className="bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
              <h2 className="font-black text-white text-sm">実行ログ</h2>
              <button 
                onClick={() => setLog([])}
                className="text-xs text-gray-400 hover:text-white"
              >
                クリア
              </button>
            </div>
            <div className="p-4 max-h-64 overflow-y-auto font-mono text-xs text-green-400 space-y-1">
              {log.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
