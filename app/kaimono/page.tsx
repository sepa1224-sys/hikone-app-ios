'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  ShoppingBag, MapPin, Store, ShoppingCart, Pill, Shirt, Gift, Package,
  ChevronRight, Search, Navigation, Loader2, X, Clock, Phone, Sparkles
} from 'lucide-react'
import BottomNavigation from '@/components/BottomNavigation'
import { supabase, Shop } from '@/lib/supabase'

// 買い物カテゴリーの定義
const SHOPPING_CATEGORIES = [
  { id: 'スーパー', name: 'スーパー', icon: <ShoppingCart size={18} />, color: 'bg-blue-500', bgLight: 'bg-blue-50', textColor: 'text-blue-600' },
  { id: 'コンビニ', name: 'コンビニ', icon: <Store size={18} />, color: 'bg-orange-500', bgLight: 'bg-orange-50', textColor: 'text-orange-600' },
  { id: 'ドラッグストア', name: 'ドラッグ', icon: <Pill size={18} />, color: 'bg-pink-500', bgLight: 'bg-pink-50', textColor: 'text-pink-600' },
  { id: '服', name: '服', icon: <Shirt size={18} />, color: 'bg-purple-500', bgLight: 'bg-purple-50', textColor: 'text-purple-600' },
  { id: '雑貨', name: '雑貨', icon: <Package size={18} />, color: 'bg-emerald-500', bgLight: 'bg-emerald-50', textColor: 'text-emerald-600' },
  { id: 'お土産', name: 'お土産', icon: <Gift size={18} />, color: 'bg-red-500', bgLight: 'bg-red-50', textColor: 'text-red-600' },
]

// 2点間の距離を計算（Haversine formula）
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // 地球の半径（km）
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// 距離を表示用にフォーマット
function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`
  }
  return `${km.toFixed(1)}km`
}

// カテゴリーに応じたテーマを取得
function getCategoryTheme(category: string) {
  const found = SHOPPING_CATEGORIES.find(c => c.id === category || category.includes(c.id))
  if (found) {
    return { icon: found.icon, color: found.color, bgLight: found.bgLight, textColor: found.textColor }
  }
  return { icon: <ShoppingBag size={18} />, color: 'bg-gray-500', bgLight: 'bg-gray-50', textColor: 'text-gray-600' }
}

// 拡張Shop型（距離情報付き）
interface ShopWithDistance extends Shop {
  distance?: number
  distanceText?: string
}

export default function Kaimono() {
  const [shops, setShops] = useState<ShopWithDistance[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [selectedShop, setSelectedShop] = useState<ShopWithDistance | null>(null)

  // 現在地を取得
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('お使いのブラウザは位置情報をサポートしていません')
      return
    }

    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
        setLocationLoading(false)
      },
      (error) => {
        console.error('位置情報取得エラー:', error)
        // エラー時はデフォルト座標（彦根駅）を使用
        setCurrentLocation({ lat: 35.2746, lng: 136.2522 })
        setLocationLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  // 初回ロード時に現在地を取得
  useEffect(() => {
    getCurrentLocation()
  }, [])

  // Supabaseからデータを取得
  useEffect(() => {
    async function fetchShops() {
      try {
        setLoading(true)
        
        // 買い物関連のカテゴリーを取得
        const shoppingCategoryIds = SHOPPING_CATEGORIES.map(c => c.id)
        
        const { data, error } = await supabase
          .from('shops')
          .select('*')
        
        if (error) {
          console.error('Supabase エラー:', error)
          return
        }

        if (data) {
          // 買い物カテゴリーに該当するお店をフィルタリング
          // カテゴリーが完全一致または部分一致する場合に含める
          const shoppingShops = data.filter((shop: any) => {
            return shoppingCategoryIds.some(catId => 
              shop.category_main === catId || 
              shop.category_main?.includes(catId) ||
              catId.includes(shop.category_main)
            )
          })

          // 座標の変換（taberu/page.tsx と同じロジック）
          const formattedData: ShopWithDistance[] = shoppingShops.map((s: any) => {
            const rawLat = s.latitude || s.lat || s.Lat || s.LAT || 0
            const rawLng = s.longitude || s.lng || s.Lng || s.LNG || 0
            const latitude = isNaN(Number(rawLat)) ? 0 : Number(rawLat)
            const longitude = isNaN(Number(rawLng)) ? 0 : Number(rawLng)

            return {
              ...s,
              latitude,
              longitude,
              place_id: s.place_id || undefined,
              image_urls: s.image_urls || undefined
            }
          })

          setShops(formattedData)
          console.log(`買い物ページ: ${formattedData.length}件のお店を取得`)
        }
      } catch (error) {
        console.error('店舗データ取得エラー:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchShops()
  }, [])

  // 現在地が取得できたら距離を計算してソート
  const sortedShops = useMemo(() => {
    if (!currentLocation) return shops

    return shops
      .map(shop => {
        if (shop.latitude && shop.longitude && shop.latitude !== 0 && shop.longitude !== 0) {
          const distance = calculateDistance(
            currentLocation.lat, currentLocation.lng,
            shop.latitude, shop.longitude
          )
          return {
            ...shop,
            distance,
            distanceText: formatDistance(distance)
          }
        }
        return { ...shop, distance: Infinity, distanceText: '不明' }
      })
      .sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity))
  }, [shops, currentLocation])

  // 検索とカテゴリーでフィルタリング
  const filteredShops = useMemo(() => {
    let result = sortedShops

    // カテゴリーフィルター
    if (selectedCategory) {
      result = result.filter(shop => 
        shop.category_main === selectedCategory || 
        shop.category_main?.includes(selectedCategory)
      )
    }

    // AI検索（簡易版：name, description, category_main に含まれるか）
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(shop => 
        shop.name?.toLowerCase().includes(query) ||
        shop.description?.toLowerCase().includes(query) ||
        shop.category_main?.toLowerCase().includes(query) ||
        shop.address?.toLowerCase().includes(query)
      )
    }

    return result
  }, [sortedShops, selectedCategory, searchQuery])

  // ローディング表示
  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen pb-32">
        <div className="bg-white px-6 pt-12 pb-6 rounded-b-[2.5rem] shadow-sm mb-6 border-b border-gray-100">
          <div className="h-8 w-32 bg-gray-200 rounded-xl animate-pulse mb-2" />
          <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="px-6 space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-2xl animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <BottomNavigation />
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-32">
      {/* ヘッダー */}
      <div className="bg-white px-6 pt-12 pb-6 rounded-b-[2.5rem] shadow-sm mb-4 border-b border-gray-100">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">買い物</h1>
        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">Shop List near you</p>
      </div>

      {/* AI検索バー */}
      <div className="px-6 mb-4">
        <div className="bg-white rounded-[2rem] p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 bg-gray-50 rounded-full px-4 py-3 border border-gray-200">
            <Sparkles size={18} className="text-orange-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="何をお探しですか？"
              className="flex-1 bg-transparent outline-none text-sm font-bold text-gray-700 placeholder:text-gray-400"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-gray-400">
                <X size={18} />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-[10px] text-orange-500 font-bold mt-2 ml-2">
              「{searchQuery}」で検索中...
            </p>
          )}
        </div>
      </div>

      {/* カテゴリーボタン */}
      <div className="px-6 mb-4">
        <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
          {SHOPPING_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full shrink-0 transition-all font-black text-xs border-2 ${
                selectedCategory === cat.id
                  ? `${cat.color} text-white border-transparent shadow-lg`
                  : `bg-white ${cat.textColor} border-gray-100 hover:border-gray-200`
              }`}
            >
              {cat.icon}
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 現在地ステータス */}
      <div className="px-6 mb-4">
        <div className="flex items-center justify-between bg-orange-50 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-2">
            <Navigation size={16} className="text-orange-500" />
            <span className="text-xs font-bold text-gray-700">
              {locationLoading ? '位置情報取得中...' : 
               currentLocation ? '現在地から近い順に表示' : '位置情報が取得できません'}
            </span>
          </div>
          <button
            onClick={getCurrentLocation}
            disabled={locationLoading}
            className="text-[10px] font-black text-orange-500 hover:underline disabled:opacity-50"
          >
            {locationLoading ? <Loader2 size={14} className="animate-spin" /> : '再取得'}
          </button>
        </div>
      </div>

      {/* 検索結果数 */}
      <div className="px-6 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-500 text-xs font-bold">
            {filteredShops.length}件のお店
          </span>
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-[10px] font-black text-orange-500 bg-orange-50 px-3 py-1 rounded-full"
            >
              フィルター解除
            </button>
          )}
        </div>
      </div>

      {/* お店リスト */}
      <div className="px-6 space-y-4">
        {filteredShops.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag size={48} className="text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 font-bold">お店が見つかりません</p>
            <p className="text-gray-300 text-sm mt-1">検索条件を変更してください</p>
          </div>
        ) : (
          filteredShops.map((shop) => {
            const theme = getCategoryTheme(shop.category_main)
            return (
              <div 
                key={shop.id} 
                onClick={() => setSelectedShop(shop)}
                className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm transition-all active:scale-[0.98] cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`${theme.color} p-2.5 rounded-2xl text-white shadow-lg shadow-gray-200`}>
                      {theme.icon}
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-gray-800 leading-tight">{shop.name}</h2>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full mt-1 inline-block ${theme.bgLight} ${theme.textColor}`}>
                        {shop.category_main}
                      </span>
                    </div>
                  </div>
                  {shop.distanceText && (
                    <div className="flex items-center text-orange-500 bg-orange-50 px-3 py-1.5 rounded-full">
                      <MapPin size={12} />
                      <span className="ml-1 text-[10px] font-black tabular-nums">{shop.distanceText}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between pl-1">
                  <p className="text-[11px] text-gray-500 font-bold leading-relaxed max-w-[80%] line-clamp-2">
                    {shop.description || shop.address || '詳細情報は店舗詳細でご確認ください'}
                  </p>
                  <div className="bg-gray-50 p-2 rounded-full text-gray-300 group-hover:text-orange-400 transition-colors">
                    <ChevronRight size={16} />
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 特集バナー */}
      <div className="px-6 mt-8">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2.5rem] p-6 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-lg font-black leading-tight">彦根の地場産品特集</h3>
            <p className="text-[10px] font-bold opacity-80 mt-1">銀座商店街でお買い物</p>
          </div>
          <ShoppingBag className="absolute -bottom-2 -right-2 text-white/10" size={100} />
        </div>
      </div>

      {/* 詳細パネル（selectedShopがある時だけ表示） */}
      {selectedShop && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[1000]" onClick={() => setSelectedShop(null)} />
          <div className="fixed bottom-0 inset-x-0 z-[1001] bg-white rounded-t-[3rem] max-h-[70vh] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom duration-300">
            <div className="sticky top-0 bg-white/90 backdrop-blur-md z-10 pt-4 pb-2">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4" onClick={() => setSelectedShop(null)} />
              <button onClick={() => setSelectedShop(null)} className="absolute right-6 top-4 bg-gray-100 p-2 rounded-full text-gray-500">
                <X size={20} />
              </button>
            </div>
            <div className="px-6 pb-10">
              {/* 店舗名 */}
              <div className="flex items-start gap-4 mb-6">
                <div className={`${getCategoryTheme(selectedShop.category_main).color} p-4 rounded-2xl text-white shadow-lg`}>
                  {getCategoryTheme(selectedShop.category_main).icon}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-black text-gray-900 mb-1">{selectedShop.name}</h2>
                  <span className={`text-xs font-black px-3 py-1 rounded-full ${getCategoryTheme(selectedShop.category_main).bgLight} ${getCategoryTheme(selectedShop.category_main).textColor}`}>
                    {selectedShop.category_main}
                  </span>
                </div>
              </div>

              {/* 距離表示 */}
              {selectedShop.distanceText && (
                <div className="flex items-center gap-2 bg-orange-50 p-4 rounded-2xl mb-4">
                  <Navigation size={20} className="text-orange-500" />
                  <span className="text-sm font-black text-gray-800">現在地から {selectedShop.distanceText}</span>
                </div>
              )}

              {/* 店舗情報 */}
              <div className="grid gap-4 bg-gray-50 p-5 rounded-[2rem] mb-6 border border-gray-100">
                <div className="flex items-start gap-3 text-sm font-bold text-gray-600">
                  <MapPin size={18} className="text-orange-500 shrink-0 mt-0.5" />
                  <span>{selectedShop.address || '住所情報なし'}</span>
                </div>
                {selectedShop.opening_hours && (
                  <div className="flex items-center gap-3 text-sm font-bold text-gray-600">
                    <Clock size={18} className="text-orange-500 shrink-0" />
                    <span>{selectedShop.opening_hours}</span>
                  </div>
                )}
                {selectedShop.phone && (
                  <a href={`tel:${selectedShop.phone}`} className="flex items-center gap-3 text-sm font-black text-blue-600">
                    <Phone size={18} className="shrink-0" />
                    <span>{selectedShop.phone}</span>
                  </a>
                )}
              </div>

              {/* 説明文 */}
              {selectedShop.description && (
                <div className="mb-6">
                  <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-2">About</h3>
                  <p className="text-sm font-bold text-gray-600 leading-relaxed">{selectedShop.description}</p>
                </div>
              )}

              {/* Googleマップで開くボタン */}
              {selectedShop.latitude && selectedShop.longitude && selectedShop.latitude !== 0 && (
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${selectedShop.latitude},${selectedShop.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-orange-500 text-white py-4 rounded-[1.5rem] font-black shadow-xl shadow-orange-200 active:scale-95 transition-all"
                >
                  <MapPin size={20} />
                  ここに行く
                </a>
              )}
            </div>
          </div>
        </>
      )}

      {/* スタイル */}
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-in.slide-in-from-bottom { animation: slide-up 0.3s ease-out; }
      `}</style>
      
      {/* 下部ナビゲーション */}
      <BottomNavigation />
    </div>
  )
}
