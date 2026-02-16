'use client'

import { useEffect, useRef, useMemo, memo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Shop } from '@/lib/supabase'

// アイコンをモジュールレベルでキャッシュ（再生成を防止）
const icon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const startIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const destinationIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

// 座標を安全に数値に変換する関数（より寛容に）
const toSafeNumber = (value: any): number | null => {
  if (value === null || value === undefined || value === '') return null
  // 文字列の場合もパース
  const num = typeof value === 'string' ? parseFloat(value) : Number(value)
  if (isNaN(num) || !isFinite(num)) return null
  return num
}

// shop から座標を取得（shop.latitude, shop.longitude を使用 - DBカラム名）
const getShopCoords = (shop: Shop): { latitude: number | null; longitude: number | null } => {
  const latitude = toSafeNumber(shop.latitude)
  const longitude = toSafeNumber(shop.longitude)
  return { latitude, longitude }
}

// 座標が有効かどうかを判定（描画時のみのチェック用）
// データ自体は null でも受け取れるように、このチェックは描画時のみ使用
const isValidCoord = (latitude: number | null, longitude: number | null, shopName?: string): boolean => {
  // null / undefined チェック
  if (latitude == null || longitude == null) {
    if (shopName) {
      console.log(`   ❌ [${shopName}] 無効: latitude=${latitude}, longitude=${longitude} (null/undefined)`)
    }
    return false
  }
  
  // Number() で数値に変換
  const numLat = Number(latitude)
  const numLng = Number(longitude)
  
  // NaN チェック（変換失敗）
  if (isNaN(numLat) || isNaN(numLng)) {
    if (shopName) {
      console.log(`   ❌ [${shopName}] 無効: latitude=${latitude}, longitude=${longitude} (NaN)`)
    }
    return false
  }
  
  // 0 チェック（一時的に許容し、ログで警告のみ出す）
  if (numLat === 0 || numLng === 0) {
    if (shopName) {
      console.log(`   ⚠️ [${shopName}] 警告: latitude=${numLat}, longitude=${numLng} (0が含まれる - テストデータ?)`)
    }
    // 一時的に許容（テストデータ対応）
    // return false
  }
  
  return true
}

// 🆕 MapRecenter - 初回のみfitBounds実行、カテゴリ切り替え時は維持
const MapRecenter = memo(function MapRecenter({ 
  shops, 
  defaultCenter, 
  isInitialLoad,
  onRecenter 
}: { 
  shops: Shop[], 
  defaultCenter: [number, number],
  isInitialLoad: boolean,
  onRecenter?: () => void
}) {
  const map = useMap()
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (!map || !map.getContainer) return

    // ★★★ 初回読み込み時のみ fitBounds を実行 ★★★
    if (!isInitialLoad && hasInitialized.current) {
      console.log(`📍 MapRecenter: カテゴリ切り替え → ズームレベル維持（fitBounds スキップ）`)
      return
    }

    // ★★★ parseFloat を使って有効な座標を持つショップのみ取得 ★★★
    const validShops = shops.filter(shop => {
      const lat = parseFloat(String(shop.latitude))
      const lng = parseFloat(String(shop.longitude))
      return !isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng) && !(lat === 0 && lng === 0)
    })

    console.log(`📍 MapRecenter: 全${shops.length}件中、有効座標${validShops.length}件`)

    try {
      if (validShops.length > 0 && isInitialLoad) {
        const bounds = L.latLngBounds(
          validShops.map(shop => {
            const lat = parseFloat(String(shop.latitude))
            const lng = parseFloat(String(shop.longitude))
            return [lat, lng] as [number, number]
          })
        )
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
        console.log(`   ✅ 初回 fitBounds 完了: ${validShops.length}件の店舗を表示範囲に収めました`)
        hasInitialized.current = true
      } else if (validShops.length === 0 && !hasInitialized.current) {
        console.log(`   ⚠️ 有効な座標がないため、デフォルト位置を使用`)
        map.setView(defaultCenter, 13)
        hasInitialized.current = true
      }
    } catch (e) {
      console.error(`   ❌ fitBounds エラー:`, e)
      map.setView(defaultCenter, 13)
    }
  }, [isInitialLoad, shops, map, defaultCenter])

  return null
})

// 🆕 エリア選択時のジャンプコンポーネント
const MapJump = memo(function MapJump({ 
  jumpTo 
}: { 
  jumpTo: { center: [number, number], zoom: number } | null 
}) {
  const map = useMap()
  const lastJumpRef = useRef<string | null>(null)

  useEffect(() => {
    if (!jumpTo || !map) return
    
    // 同じ場所へのジャンプを防止
    const jumpKey = `${jumpTo.center[0]}-${jumpTo.center[1]}-${jumpTo.zoom}`
    if (lastJumpRef.current === jumpKey) return
    
    console.log(`🚀 エリアジャンプ: [${jumpTo.center[0]}, ${jumpTo.center[1]}] zoom: ${jumpTo.zoom}`)
    
    // アニメーション付きで移動
    map.flyTo(jumpTo.center, jumpTo.zoom, {
      duration: 0.8, // アニメーション時間（秒）
      easeLinearity: 0.5
    })
    
    lastJumpRef.current = jumpKey
  }, [jumpTo, map])

  return null
})

// 🆕 現在地取得時のマップ移動コンポーネント
const LocationMove = memo(function LocationMove({ 
  currentLocation,
  shouldMove,
  onComplete
}: { 
  currentLocation: { lat: number; lng: number } | null
  shouldMove: boolean
  onComplete?: () => void
}) {
  const map = useMap()
  const hasMovedRef = useRef(false)

  useEffect(() => {
    if (!shouldMove || !currentLocation || !map) return
    if (hasMovedRef.current) return // 既に移動済みならスキップ
    
    console.log(`📍 現在地にマップを移動: [${currentLocation.lat}, ${currentLocation.lng}]`)
    
    // アニメーション付きで現在地に移動
    map.flyTo([currentLocation.lat, currentLocation.lng], 16, {
      duration: 1.0,
      easeLinearity: 0.5
    })
    
    hasMovedRef.current = true
    
    // 移動完了を通知
    if (onComplete) {
      setTimeout(() => {
        onComplete()
      }, 1000) // アニメーション完了後にコールバック
    }
  }, [shouldMove, currentLocation, map, onComplete])

  // shouldMoveがfalseにリセットされたら、次回の移動を許可
  useEffect(() => {
    if (!shouldMove) {
      hasMovedRef.current = false
    }
  }, [shouldMove])

  return null
})

// 🆕 再調整ボタンコンポーネント
const RecenterButton = memo(function RecenterButton({ 
  shops, 
  defaultCenter 
}: { 
  shops: Shop[], 
  defaultCenter: [number, number] 
}) {
  const map = useMap()
  
  const handleRecenter = () => {
    const validShops = shops.filter(shop => {
      const lat = parseFloat(String(shop.latitude))
      const lng = parseFloat(String(shop.longitude))
      return !isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng) && !(lat === 0 && lng === 0)
    })
    
    if (validShops.length > 0) {
      const bounds = L.latLngBounds(
        validShops.map(shop => {
          const lat = parseFloat(String(shop.latitude))
          const lng = parseFloat(String(shop.longitude))
          return [lat, lng] as [number, number]
        })
      )
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
      console.log(`📍 手動で fitBounds 実行: ${validShops.length}件`)
    } else {
      map.setView(defaultCenter, 13)
    }
  }
  
  return (
    <div className="leaflet-bottom leaflet-right" style={{ marginBottom: '20px', marginRight: '10px' }}>
      <div className="leaflet-control">
        <button
          onClick={handleRecenter}
          className="bg-white hover:bg-gray-100 text-gray-700 px-3 py-2 rounded-lg shadow-lg border border-gray-200 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
          title="検索結果を全て表示"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7V5a2 2 0 0 1 2-2h2" />
            <path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
            <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          全体表示
        </button>
      </div>
    </div>
  )
})

interface RouteData {
  steps: Array<{ lat: number; lng: number }>
  start_location: { lat: number; lng: number }
  end_location: { lat: number; lng: number }
}

interface ShopMapProps {
  shops: Shop[]
  routeData?: RouteData | null
  currentLocation?: { lat: number; lng: number } | null
  destinationShop?: Shop | null
  defaultCenter?: [number, number]
  // 🆕 初回読み込みかどうか（fitBoundsの制御用）
  isInitialLoad?: boolean
  // 🆕 再調整ボタンのコールバック
  onRecenterRequest?: () => void
  // 🆕 エリア選択時のジャンプ先座標とズームレベル
  jumpTo?: { center: [number, number], zoom: number } | null
  // 🆕 現在地取得時のマップ移動フラグ
  shouldMoveToLocation?: boolean
  // 🆕 マップ移動完了時のコールバック
  onLocationMoveComplete?: () => void
}

// ★★★ 座標を parseFloat() で確実に浮動小数点数に変換する関数 ★★★
const parseCoordinate = (value: any): number | null => {
  // null / undefined / 空文字チェック
  if (value === null || value === undefined || value === '') return null
  
  // parseFloat() を使用して確実に浮動小数点数として扱う
  // 文字列として入っていても確実にパースできる
  const parsed = parseFloat(String(value))
  
  // isNaN チェック（パース失敗）
  if (isNaN(parsed)) return null
  
  // isFinite チェック（Infinityを除外）
  if (!isFinite(parsed)) return null
  
  return parsed
}

// メモ化されたマーカーコンポーネント（パフォーマンス向上）
const ShopMarker = memo(function ShopMarker({ 
  shop, 
  isDestination 
}: { 
  shop: Shop
  isDestination: boolean 
}) {
  // ★★★ parseFloat() で確実に浮動小数点数に変換 ★★★
  const lat = parseCoordinate(shop.latitude)
  const lng = parseCoordinate(shop.longitude)
  
  // 有効判定: parseCoordinate が null を返さず、かつ両方0でない場合のみ有効
  const isValid = 
    lat !== null && 
    lng !== null &&
    !isNaN(lat) && 
    !isNaN(lng) &&
    !(lat === 0 && lng === 0) // 両方0の場合のみ無効
  
  // 有効な座標がない場合はマーカーを描画しない
  if (!isValid) {
    // 最初の数件のみログ出力（大量のログを防ぐ）
    return null
  }

  return (
    <Marker 
      position={{ lat: lat, lng: lng }}
      icon={isDestination ? destinationIcon : icon}
    >
      <Popup maxWidth={200}>
        <div className="w-40 overflow-hidden bg-white">
          {shop.image_url ? (
            <img 
              src={shop.image_url} 
              alt={shop.name} 
              className="w-full h-24 object-cover rounded-lg mb-2 shadow-sm"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-20 bg-gray-50 flex items-center justify-center rounded-lg mb-2 border border-gray-100">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">No Photo</span>
            </div>
          )}
          <div className="px-1">
            <p className="font-black text-sm text-gray-900 leading-tight mb-0.5">{shop.name}</p>
            <div className="flex items-center gap-1">
              <span className="text-[9px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded font-bold">
                {shop.category_main}
              </span>
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  )
})

function ShopMap({ 
  shops, 
  routeData, 
  currentLocation, 
  destinationShop, 
  defaultCenter: propDefaultCenter,
  isInitialLoad = true,  // デフォルトは初回読み込み
  onRecenterRequest,
  jumpTo,  // 🆕 エリア選択時のジャンプ先
  shouldMoveToLocation = false,  // 🆕 現在地取得時のマップ移動フラグ
  onLocationMoveComplete  // 🆕 マップ移動完了時のコールバック
}: ShopMapProps) {
  const HIKONE_STATION = useMemo<[number, number]>(() => [35.272, 136.257], [])
  
  // 表示範囲の制限（日本全体をカバーしつつ、極端な世界地図表示を防ぐ）
  const JAPAN_BOUNDS: L.LatLngBoundsExpression = [
    [20.0, 122.0], // 南西（沖縄 与那国島付近）
    [46.0, 154.0]  // 北東（北海道 択捉島付近）
  ]

  // デフォルト座標を彦根駅に固定
  const defaultCenter: [number, number] = propDefaultCenter || HIKONE_STATION
  const mapRef = useRef<L.Map | null>(null)

  // 現在地が有効範囲内（滋賀県周辺）か判定するロジック
  const effectiveCurrentLocation = useMemo(() => {
    if (!currentLocation) return null

    // 滋賀県（彦根）からの距離チェック
    // 簡易的に緯度経度差で判定（約1度=111km）
    // 許容範囲: 緯度±1.5度, 経度±1.5度 (近畿 東海圏程度)
    const latDiff = Math.abs(currentLocation.lat - HIKONE_STATION[0])
    const lngDiff = Math.abs(currentLocation.lng - HIKONE_STATION[1])

    // 海外または遠方（滋賀から約150km以上）の場合は無効化
    if (latDiff > 1.5 || lngDiff > 1.5) {
      console.log('📍 現在地が対象エリア外のため、ピンを表示しません:', currentLocation)
      return null
    }

    return currentLocation
  }, [currentLocation, HIKONE_STATION])

  // デバッグ: 受け取ったデータを確認（データ自体は null でも受け取る）
  // shops の内容が変わった時に再実行されるよう、JSON.stringify で依存を追跡
  const shopsKey = JSON.stringify(shops.map(s => ({ id: s.id, lat: s.latitude, lng: s.longitude })))
  
  useEffect(() => {
    console.log(`\n🗺️ ========== ShopMap デバッグログ ==========`)
    console.log(`📦 Mapに渡された店舗数: ${shops.length}件`)
    
    if (shops.length > 0) {
      // ★★★ parseFloat を使った座標パースでデバッグ出力 ★★★
      const debugData = shops.slice(0, 10).map((shop, index) => {
        const lat = parseCoordinate(shop.latitude)
        const lng = parseCoordinate(shop.longitude)
        const isValid = lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng) && !(lat === 0 && lng === 0)
        
        return {
          '#': index + 1,
          '店舗名': shop.name,
          '元latitude': shop.latitude,
          '元longitude': shop.longitude,
          'parseFloat後lat': lat,
          'parseFloat後lng': lng,
          '有効': isValid ? '✅' : '❌'
        }
      })
      
      console.log(`\n📋 店舗座標一覧（最初の10件）:`)
      console.table(debugData)
      
      // 有効/無効のサマリー（parseCoordinateを使用）
      const validShopsList = shops.filter(s => {
        const lat = parseCoordinate(s.latitude)
        const lng = parseCoordinate(s.longitude)
        return lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng) && !(lat === 0 && lng === 0)
      })
      
      const invalidShopsList = shops.filter(s => {
        const lat = parseCoordinate(s.latitude)
        const lng = parseCoordinate(s.longitude)
        return !(lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng) && !(lat === 0 && lng === 0))
      })
      
      console.log(`\n✅ マーカー表示対象: ${validShopsList.length}件 / 全${shops.length}件`)
      
      if (validShopsList.length > 0 && validShopsList.length <= 20) {
        console.log(`📍 表示される店舗:`, validShopsList.map(s => s.name).join(', '))
      } else if (validShopsList.length > 20) {
        console.log(`📍 表示される店舗（最初の20件）:`, validShopsList.slice(0, 20).map(s => s.name).join(', '), '...')
      }
      
      if (invalidShopsList.length > 0 && invalidShopsList.length <= 10) {
        console.log(`⚠️ 座標が無効な店舗 (${invalidShopsList.length}件):`, invalidShopsList.map(s => s.name).join(', '))
      } else if (invalidShopsList.length > 10) {
        console.log(`⚠️ 座標が無効な店舗 (${invalidShopsList.length}件): 最初の10件 →`, invalidShopsList.slice(0, 10).map(s => s.name).join(', '))
      }
    } else {
      console.log(`⚠️ Mapに渡された店舗が0件です！`)
    }
    
    console.log(`🗺️ ============================================\n`)
  }, [shopsKey, shops]) // shops の内容が変わった時に再実行

  // 描画時のみフィルタリング：データ自体は全て受け取り、描画時に有効な座標のみ表示
  // ShopMarker 内で無効な座標は null を返すので、ここでは緩やかにフィルタリング
  const validShops = useMemo(() => {
    // ★★★ parseCoordinate を使用して座標をパース ★★★
    const filtered = shops.filter(shop => {
      const lat = parseCoordinate(shop.latitude)
      const lng = parseCoordinate(shop.longitude)
      return lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng) && !(lat === 0 && lng === 0)
    })
    console.log(`📊 ShopMap validShops: ${filtered.length}/${shops.length}件を fitBounds 対象に`)
    return filtered
  }, [shops]) // shops の内容が変わった時に再計算

  // ルート座標のメモ化
  const routeCoordinates = useMemo(() => {
    return routeData?.steps.map(step => [step.lat, step.lng] as [number, number]) || []
  }, [routeData])

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  return (
    <div style={{ height: '100%', width: '100%' }} id="shop-map-container">
      <MapContainer 
        center={defaultCenter} 
        zoom={15} // デフォルトズームを見やすい15に変更
        minZoom={8} // 引きすぎ防止
        maxBounds={JAPAN_BOUNDS} // 表示範囲を日本国内に制限
        maxBoundsViscosity={1.0} // バウンド外へのドラッグを完全に禁止
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
        dragging={true}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          noWrap={true} // 無限ループ（横方向の繰り返し）を禁止
        />
        
        <MapRecenter 
          shops={validShops} 
          defaultCenter={defaultCenter} 
          isInitialLoad={isInitialLoad}
        />
        
        {/* 🆕 エリア選択時のジャンプ */}
        <MapJump jumpTo={jumpTo || null} />
        
        {/* 🆕 現在地取得時のマップ移動 */}
        <LocationMove 
          currentLocation={effectiveCurrentLocation || null}
          shouldMove={shouldMoveToLocation}
          onComplete={onLocationMoveComplete}
        />
        
        {/* 🆕 再調整ボタン */}
        <RecenterButton shops={validShops} defaultCenter={defaultCenter} />

        {/* ルートポリライン */}
        {routeData && routeCoordinates.length > 0 && (
          <Polyline
            positions={routeCoordinates}
            color="#4285F4"
            weight={5}
            opacity={0.7}
          />
        )}

        {/* 現在地マーカー（有効な場合のみ表示） */}
        {effectiveCurrentLocation && (
          <Marker 
            position={[effectiveCurrentLocation.lat, effectiveCurrentLocation.lng]} 
            icon={startIcon}
          >
            <Popup>
              <div className="text-sm font-bold">現在地</div>
            </Popup>
          </Marker>
        )}

        {/* 店舗マーカー（全データを回し、ShopMarker内で座標を検証） */}
        {shops.map((shop) => (
          <ShopMarker 
            key={shop.id} 
            shop={shop} 
            isDestination={!!destinationShop && shop.id === destinationShop.id}
          />
        ))}
      </MapContainer>
    </div>
  )
}

export default memo(ShopMap)
