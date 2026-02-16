'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { supabase, Shop, isShopOpen, calculateDistance, formatDistance } from '@/lib/supabase'
import { MapPin, Heart, Search, Coffee, Beer, Pizza, Utensils, IceCream, Store, CheckCircle2, X, Clock, Phone, UtensilsCrossed, Navigation, Map, ChevronLeft, ChevronRight, Image as ImageIcon, Locate, ArrowUpDown, ExternalLink, Globe, TrendingUp, Flame, Wine, Soup, Beef, Sandwich, Fish, CircleDot, Salad, Cookie, Drumstick, ChevronDown, ChevronUp } from 'lucide-react'
import BottomNavigation from '@/components/BottomNavigation'

// ShopMap を動的インポート（SSR無効化 + エラーハンドリング）
const ShopMap = dynamic(
  () => import('@/components/ShopMap').catch(err => {
    console.error('ShopMap ロードエラー:', err)
    // フォールバックコンポーネントを返す
    return { default: () => <div className="w-full h-full bg-red-50 flex items-center justify-center font-bold text-red-400">地図の読み込みに失敗しました</div> }
  }),
  {
    ssr: false,
    loading: () => <div className="w-full h-full bg-gray-100 flex items-center justify-center font-bold text-gray-400">地図を読み込み中...</div>,
  }
)

const CATEGORIES = [
  // 既存カテゴリ
  { id: 'カフェ', name: 'カフェ', icon: <Coffee size={14} />, color: 'bg-orange-100 text-orange-600' },
  { id: '居酒屋', name: '居酒屋', icon: <Beer size={14} />, color: 'bg-yellow-100 text-yellow-600' },
  { id: '和食', name: '和食', icon: <Store size={14} />, color: 'bg-emerald-100 text-emerald-600' },
  { id: 'イタリアン', name: 'イタリアン', icon: <Pizza size={14} />, color: 'bg-red-100 text-red-600' },
  { id: '焼肉', name: '焼肉', icon: <Beef size={14} />, color: 'bg-rose-100 text-rose-600' },
  { id: 'スイーツ', name: 'スイーツ', icon: <IceCream size={14} />, color: 'bg-pink-100 text-pink-600' },
  // 🆕 追加カテゴリ
  { id: 'バー', name: 'バー', icon: <Wine size={14} />, color: 'bg-purple-100 text-purple-600' },
  { id: 'スナック', name: 'スナック', icon: <Wine size={14} />, color: 'bg-violet-100 text-violet-600' },
  { id: 'ラーメン', name: 'ラーメン', icon: <Soup size={14} />, color: 'bg-amber-100 text-amber-600' },
  { id: '洋食', name: '洋食', icon: <Utensils size={14} />, color: 'bg-blue-100 text-blue-600' },
  { id: '日本料理', name: '日本料理', icon: <Fish size={14} />, color: 'bg-teal-100 text-teal-600' },
  { id: '弁当', name: '弁当', icon: <Sandwich size={14} />, color: 'bg-lime-100 text-lime-600' },
  { id: '軽食', name: '軽食', icon: <Cookie size={14} />, color: 'bg-cyan-100 text-cyan-600' },
  { id: '牛丼', name: '牛丼', icon: <Beef size={14} />, color: 'bg-orange-100 text-orange-700' },
  { id: '中華', name: '中華', icon: <Soup size={14} />, color: 'bg-red-100 text-red-700' },
  { id: 'パン', name: 'パン', icon: <Cookie size={14} />, color: 'bg-yellow-100 text-yellow-700' },
  { id: '寿司', name: '寿司', icon: <Fish size={14} />, color: 'bg-sky-100 text-sky-600' },
  { id: 'お好み焼き', name: 'お好み焼き', icon: <CircleDot size={14} />, color: 'bg-amber-100 text-amber-700' },
  { id: 'ファストフード', name: 'ファストフード', icon: <Drumstick size={14} />, color: 'bg-red-100 text-red-500' },
  { id: 'カレー', name: 'カレー', icon: <Soup size={14} />, color: 'bg-yellow-100 text-yellow-800' },
  { id: 'ハンバーガー', name: 'ハンバーガー', icon: <Sandwich size={14} />, color: 'bg-green-100 text-green-600' },
  { id: 'うどん', name: 'うどん', icon: <Soup size={14} />, color: 'bg-stone-100 text-stone-600' },
  { id: 'そば', name: 'そば', icon: <Soup size={14} />, color: 'bg-neutral-100 text-neutral-600' },
  { id: 'フレンチ', name: 'フレンチ', icon: <Utensils size={14} />, color: 'bg-blue-100 text-blue-600' },
  { id: '韓国料理', name: '韓国料理', icon: <Beef size={14} />, color: 'bg-rose-100 text-rose-600' },
  { id: 'エスニック', name: 'エスニック', icon: <Soup size={14} />, color: 'bg-orange-100 text-orange-600' },
]

// ===== カテゴリグループ化マッピング =====
// 選択されたカテゴリに対して、関連するキーワードをまとめて検索
// ※ 部分一致で検索するため、「レストラン」「飲食」などの汎用キーワードも含める
const CATEGORY_GROUPS: Record<string, string[]> = {
  // 既存カテゴリ
  'カフェ': ['カフェ', 'cafe', 'coffee', 'コーヒー', '喫茶', '喫茶店', 'スターバックス', 'ドトール', 'タリーズ', 'コメダ', '珈琲', 'カフェテリア', 'ティー', '紅茶'],
  '居酒屋': ['居酒屋', '酒場', '飲み屋', 'ダイニングバー', '焼き鳥', '串カツ', '串揚げ', '飲食店', 'ダイニング', '酒処', '炉端'],
  '和食': ['和食', '定食', '割烹', '懐石', '料亭', '食堂', '惣菜'],
  'イタリアン': ['イタリアン', 'イタリア料理', 'パスタ', 'ピザ', 'pizza', 'pasta', 'italian', 'ピッツァ', 'トラットリア', 'リストランテ'],
  '焼肉': ['焼肉', '焼き肉', 'やきにく', '肉', 'ステーキ', 'steak', 'ホルモン', 'BBQ', 'バーベキュー', 'しゃぶしゃぶ', 'すき焼き', '鉄板焼き', '牛タン', 'カルビ'],
  'スイーツ': ['スイーツ', 'sweets', 'ケーキ', 'デザート', 'パフェ', 'アイス', 'アイスクリーム', 'クレープ', 'ドーナツ', 'チョコレート', '和菓子', '洋菓子', 'タピオカ', 'プリン', 'シュークリーム', 'マカロン', 'フルーツ', '甘味'],
  // 🆕 追加カテゴリ
  'バー': ['バー', 'bar', 'パブ', 'pub', 'ワインバー', 'ダイニングバー', 'ショットバー', 'カクテル', '酒'],
  'スナック': ['スナック', 'snack', 'クラブ', 'ラウンジ', 'キャバクラ'],
  'ラーメン': ['ラーメン', 'らーめん', 'ramen', '拉麺', 'つけ麺', 'つけめん', '担々麺', '味噌ラーメン', '塩ラーメン', '豚骨'],
  '洋食': ['洋食', 'レストラン', 'restaurant', 'フランス料理', '欧風', 'ビストロ', 'オムライス', 'ハヤシライス', 'グラタン'],
  '日本料理': ['日本料理', '懐石', '会席', '割烹', '料亭', '天ぷら', '刺身', '魚', '海鮮', 'japanese'],
  '弁当': ['弁当', '惣菜', 'テイクアウト', '持ち帰り', 'お持ち帰り', '仕出し'],
  '軽食': ['軽食', 'サンドイッチ', 'サンドウィッチ', 'ホットドッグ', 'スナック', '軽食堂'],
  '牛丼': ['牛丼', '吉野家', 'すき家', '松屋', '丼', '丼もの'],
  '中華': ['中華', '中華料理', 'chinese', '餃子', 'チャーハン', '炒飯', '麻婆豆腐', '青椒肉絲', '酢豚', '春巻'],
  'パン': ['パン', 'ベーカリー', 'bakery', 'パン屋', 'ブーランジェリー', 'サンドイッチ', 'クロワッサン', 'バゲット'],
  '寿司': ['寿司', 'すし', '鮨', 'sushi', '回転寿司', '握り', '海鮮丼'],
  'お好み焼き': ['お好み焼き', 'おこのみやき', 'たこ焼き', 'たこやき', '鉄板焼き', 'もんじゃ', '粉もの'],
  'ファストフード': ['ファストフード', 'ファーストフード', 'fast food', 'マクドナルド', 'モスバーガー', 'ケンタッキー', 'KFC', 'ロッテリア', 'バーガーキング'],
  'カレー': ['カレー', 'curry', 'カレーライス', 'インドカレー', 'ナン', 'インド料理', 'スープカレー', 'CoCo壱'],
  'ハンバーガー': ['ハンバーガー', 'バーガー', 'burger', 'hamburger', 'ハンバーグ'],
  'うどん': ['うどん', '讃岐うどん', '稲庭うどん', 'きつねうどん', 'カレーうどん', '釜揚げ'],
  'そば': ['そば', '蕎麦', 'soba', '十割そば', '二八そば', '天ぷらそば', 'ざるそば'],
  'フレンチ': ['フレンチ', 'フランス料理', 'ビストロ', 'french'],
  '韓国料理': ['韓国料理', 'korean', 'キムチ', 'ビビンバ', 'チゲ', 'サムギョプサル'],
  'エスニック': ['エスニック', 'ethnic', 'タイ料理', 'ベトナム料理', 'フォー', 'ガパオ', 'トムヤムクン', 'ケバブ'],
}

// カテゴリマッチング関数（あいまい検索）
const matchesCategory = (shopCategory: string | null | undefined, selectedCategoryId: string): boolean => {
  // カテゴリがnullまたは空の場合はマッチしない
  if (!shopCategory) return false
  
  // トリミングして正規化
  const normalizedShopCategory = shopCategory.trim().toLowerCase()
  
  // カテゴリグループを取得
  const keywords = CATEGORY_GROUPS[selectedCategoryId] || [selectedCategoryId]
  
  // いずれかのキーワードに部分一致すればマッチ
  return keywords.some(keyword => {
    const normalizedKeyword = keyword.toLowerCase()
    return normalizedShopCategory.includes(normalizedKeyword) || normalizedKeyword.includes(normalizedShopCategory)
  })
}


// 都市ごとの座標マッピング（滋賀県 福井県の主要都市）
const CITY_COORDINATES: Record<string, [number, number]> = {
  // 滋賀県
  '彦根市': [35.272, 136.257],
  '長浜市': [35.3776, 136.2646],
  '大津市': [35.0045, 135.8686],
  '草津市': [35.0173, 135.9608],
  '守山市': [35.0580, 135.9941],
  '栗東市': [35.0202, 136.0022],
  '野洲市': [35.0680, 136.0330],
  '湖南市': [35.0058, 136.0867],
  '甲賀市': [34.9660, 136.1656],
  '近江八幡市': [35.1283, 136.0985],
  '東近江市': [35.1126, 136.2026],
  '米原市': [35.3147, 136.2908],
  '高島市': [35.3498, 136.0378],
  // 福井県
  '敦賀市': [35.6452, 136.0555],
  '小浜市': [35.4958, 135.7466],
  '福井市': [36.0652, 136.2219],
  // デフォルト
  'default': [35.272, 136.257] // 彦根駅
}

// ===== エリアマスターの型定義 =====
type AreaMaster = {
  id: string
  name: string
  keywords: string[]
  center_lat: number
  center_lng: number
  default_zoom: number
}

// ===== エリア定義（デフォルト値、area_mastersテーブルから取得する場合は上書き） =====
const DEFAULT_AREAS: AreaMaster[] = [
  { id: 'castle-road', name: 'キャッスルロード', keywords: ['キャッスルロード', 'キャッスル', '夢京橋', '本町'], center_lat: 35.2760, center_lng: 136.2515, default_zoom: 16 },
  { id: 'bell-road', name: 'ベルロード', keywords: ['ベルロード', 'ベル', '竹ヶ鼻'], center_lat: 35.2670, center_lng: 136.2330, default_zoom: 16 },
  { id: 'yonbancho', name: '四番町スクエア', keywords: ['四番町', '4番町', 'よんばんちょう'], center_lat: 35.2755, center_lng: 136.2545, default_zoom: 17 },
  { id: 'minami-hikone', name: '南彦根', keywords: ['南彦根', '小泉町', '西今', '竹ヶ鼻'], center_lat: 35.2520, center_lng: 136.2450, default_zoom: 15 },
  { id: 'hikone-ekimae', name: '彦根駅前', keywords: ['彦根駅', '駅前', '旭町', '佐和町'], center_lat: 35.2670, center_lng: 136.2680, default_zoom: 16 },
  { id: 'inae', name: '稲枝', keywords: ['稲枝', 'いなえ'], center_lat: 35.2100, center_lng: 136.2200, default_zoom: 15 },
  { id: 'kawase', name: '河瀬', keywords: ['河瀬', 'かわせ'], center_lat: 35.2350, center_lng: 136.2550, default_zoom: 15 },
  { id: 'torimoto', name: '鳥居本', keywords: ['鳥居本', 'とりいもと'], center_lat: 35.3000, center_lng: 136.2700, default_zoom: 15 },
  { id: 'takamiya', name: '高宮', keywords: ['高宮', 'たかみや'], center_lat: 35.2400, center_lng: 136.2700, default_zoom: 15 },
  { id: 'amago', name: '尼子', keywords: ['尼子', 'あまこ'], center_lat: 35.2850, center_lng: 136.2300, default_zoom: 15 },
  { id: 'amagasaki', name: '甘呂', keywords: ['甘呂', 'あまろ'], center_lat: 35.2700, center_lng: 136.2200, default_zoom: 15 },
  { id: 'sakata', name: '坂田', keywords: ['坂田', 'さかた'], center_lat: 35.3100, center_lng: 136.2600, default_zoom: 15 },
]

// 営業時間表示用コンポーネント
const OpeningHoursDisplay = ({ openingHours }: { openingHours: any }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  
  if (!openingHours) {
    return <span className="text-sm font-bold text-gray-400">営業時間情報なし</span>
  }

  let hoursData: any = openingHours

  // 文字列の場合はJSONパースを試みる
  if (typeof openingHours === 'string') {
    if (openingHours.trim().startsWith('{')) {
      try {
        hoursData = JSON.parse(openingHours)
      } catch (e) {
        // パース失敗時はそのまま文字列として表示
        return <span className="text-sm font-bold text-gray-700">{openingHours}</span>
      }
    } else {
      // JSON形式でない文字列の場合はそのまま表示
      return <span className="text-sm font-bold text-gray-700">{openingHours}</span>
    }
  }

  // オブジェクトでない、または空の場合はフォールバック
  if (typeof hoursData !== 'object' || Object.keys(hoursData).length === 0) {
    return <span className="text-sm font-bold text-gray-400">営業時間情報なし</span>
  }

  const daysMap: { [key: string]: string } = {
    mon: '月', tue: '火', wed: '水', thu: '木', fri: '金', sat: '土', sun: '日'
  }
  
  // 今日の曜日を取得 (0: Sun, 1: Mon, ..., 6: Sat) -> mon..sunキーに変換
  const today = new Date()
  const dayIndex = today.getDay() // 0=Sun, 1=Mon...
  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  const currentDayKey = dayKeys[dayIndex]
  
  // 月曜始まりの順序
  const daysOrder = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  
  const todayData = hoursData[currentDayKey]

  const formatTime = (data: any) => {
    if (!data) return '不明'
    if (data.is_closed) return '定休日'
    if (!data.open || !data.close) return '不明'
    return `${data.open} 〜 ${data.close}`
  }

  return (
    <div className="w-full">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-700">
            {todayData ? (
              <>
                <span className={`inline-block text-[10px] font-black px-1.5 py-0.5 rounded mr-2 ${todayData.is_closed ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  今日 ({daysMap[currentDayKey]})
                </span>
                {formatTime(todayData)}
              </>
            ) : (
              '営業時間情報なし'
            )}
          </span>
        </div>
        {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </div>
      
      {isExpanded && (
        <div className="mt-3 pl-2 border-l-2 border-orange-100 space-y-2">
          {daysOrder.map(day => {
            const data = hoursData[day]
            const isToday = day === currentDayKey
            return (
              <div key={day} className={`flex justify-between text-xs items-center ${isToday ? 'bg-orange-50 -mx-2 px-2 py-1 rounded' : ''}`}>
                <div className="flex items-center gap-2">
                  <span className={`font-bold w-6 ${isToday ? 'text-orange-600' : 'text-gray-500'}`}>{daysMap[day]}</span>
                  {isToday && <span className="text-[10px] bg-orange-500 text-white px-1 rounded font-bold">Today</span>}
                </div>
                <span className={`font-medium ${isToday ? 'text-gray-900' : 'text-gray-600'}`}>{formatTime(data)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Taberu() {
  const [allShops, setAllShops] = useState<Shop[]>([])
  const [filteredShops, setFilteredShops] = useState<Shop[]>([])
  // 🆕 カテゴリーの複数選択（マルチセレクト）対応
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  // 🆕 エリア選択（単一選択）
  const [selectedArea, setSelectedArea] = useState<string | null>(null)
  // 🆕 エリア選択時のマップジャンプ先
  const [mapJumpTo, setMapJumpTo] = useState<{ center: [number, number], zoom: number } | null>(null)
  // 🆕 エリアマスターデータ（area_mastersテーブルから取得）
  const [areas, setAreas] = useState<AreaMaster[]>(DEFAULT_AREAS)
  const [onlyOpen, setOnlyOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null)
  
  
  // ユーザーの登録都市と地図の初期位置
  const [userCity, setUserCity] = useState<string | null>(null)
  // デフォルト座標を彦根駅に固定（ログインしていない状態でも世界地図にならないように）
  const [mapCenter, setMapCenter] = useState<[number, number]>([35.272, 136.257])
  const [isProfileLoaded, setIsProfileLoaded] = useState(false) // ③ プロフィール取得完了フラグ
  // 🆕 初回読み込みフラグ（fitBounds制御用）
  const [isInitialMapLoad, setIsInitialMapLoad] = useState(true)
  
  // 🆕 食べログ風機能用のステート
  const [favorites, setFavorites] = useState<Set<string>>(new Set()) // お気に入りID一覧
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [popularShops, setPopularShops] = useState<Shop[]>([])       // 人気店舗トップ3
  const [locationPermission, setLocationPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt')
  
  
  // ルート検索関連のステート
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [routeMode, setRouteMode] = useState<'walking' | 'driving' | 'transit'>('walking')
  const [routeData, setRouteData] = useState<{
    distance: { text: string; value: number }
    duration: { text: string; value: number }
    steps: Array<{ lat: number; lng: number }>
  } | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [showRoute, setShowRoute] = useState(false)
  
  // 写真ギャラリー関連のステート
  const [shopPhotos, setShopPhotos] = useState<string[]>([])
  const [photosLoading, setPhotosLoading] = useState(false)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)

  // 🆕 現在地取得時のマップ移動フラグ
  const [shouldMoveMapToLocation, setShouldMoveMapToLocation] = useState(false)

  // 現在地を取得する関数（自動取得対応）
  const getCurrentLocation = (silent: boolean = false) => {
    if (!navigator.geolocation) {
      if (!silent) {
        alert('お使いのブラウザは位置情報をサポートしていません')
      }
      return
    }

    if (!silent) {
      setRouteLoading(true)
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
        setCurrentLocation(newLocation)
        setShouldMoveMapToLocation(true) // 🆕 マップ移動フラグを立てる
        console.log(`📍 現在地を取得しました: [${newLocation.lat}, ${newLocation.lng}]`)
        if (!silent) {
          setRouteLoading(false)
        }
      },
      (error) => {
        console.error('位置情報取得エラー:', error)
        if (!silent) {
          // 自動取得時はアラートを出さない
          if (error.code === error.PERMISSION_DENIED) {
            console.log('📍 位置情報の利用が拒否されました')
          } else {
            alert('位置情報の取得に失敗しました。位置情報の利用を許可してください。')
          }
          setRouteLoading(false)
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 } // maximumAgeを60秒に設定（キャッシュ活用）
    )
  }

  // ルート検索を実行する関数
  const searchRoute = async () => {
    if (!currentLocation || !selectedShop) {
      alert('現在地が取得できていません')
      return
    }

    setRouteLoading(true)
    try {
      const response = await fetch(
        `/api/directions/route?originLat=${currentLocation.lat}&originLng=${currentLocation.lng}&destLat=${selectedShop.latitude}&destLng=${selectedShop.longitude}&mode=${routeMode}`
      )
      const data = await response.json()

      if (data.success) {
        setRouteData(data)
        setShowRoute(true)
      } else {
        alert(`ルート検索に失敗しました: ${data.error || '不明なエラー'}`)
        setRouteData(null)
      }
    } catch (error) {
      console.error('ルート検索エラー:', error)
      alert('ルート検索中にエラーが発生しました')
    } finally {
      setRouteLoading(false)
    }
  }

  // ③ ユーザーのプロフィールから登録都市を取得 & お気に入り取得
  // ※ プロフィール取得完了を待ってから他の処理を動かす
  useEffect(() => {
    async function fetchUserDataAndFavorites() {
      console.log('👤 ユーザープロフィール取得開始...')
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          setCurrentUserId(session.user.id)
          
          // プロフィール取得
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('city, location')
            .eq('id', session.user.id)
            .single()
          
          if (profile && !error) {
            const city = profile.city || profile.location
            console.log('🏙️ ユーザーの登録都市:', city)
            
            if (city) {
              setUserCity(city)
              const coordinates = CITY_COORDINATES[city] || CITY_COORDINATES['default']
              setMapCenter(coordinates)
              console.log(`📍 地図の中心を ${city} に設定:`, coordinates)
            } else {
              console.log('🏙️ プロフィールに都市が未設定: デフォルト座標を使用')
            }
          } else {
            console.log('🏙️ プロフィール取得失敗またはデータなし: デフォルト座標を使用')
          }
          
          // お気に入り一覧を取得
          const { data: favData, error: favError } = await supabase
            .from('favorites')
            .select('shop_id')
            .eq('user_id', session.user.id)
          
          if (favData && !favError) {
            const favIds = new Set(favData.map(f => f.shop_id))
            setFavorites(favIds)
            console.log(`❤️ お気に入り: ${favIds.size}件`)
          }
        } else {
          console.log('🏙️ 未ログイン: デフォルト座標（彦根市）を使用')
          setCurrentUserId(null)
        }
      } catch (error) {
        console.error('ユーザーデータ取得エラー:', error)
      } finally {
        // ★★★ プロフィール取得完了フラグを立てる ★★★
        setIsProfileLoaded(true)
        console.log('✅ プロフィール取得完了')
      }
    }
    
    fetchUserDataAndFavorites()
  }, [])
  
  // 🆕 お気に入り登録/解除
  const toggleFavorite = async (shopId: string, e: React.MouseEvent) => {
    e.stopPropagation() // カードクリックイベントを防止
    
    if (!currentUserId) {
      alert('お気に入り機能を使用するにはログインが必要です')
      return
    }
    
    const isFav = favorites.has(shopId)
    
    try {
      if (isFav) {
        // 削除
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', currentUserId)
          .eq('shop_id', shopId)
        
        setFavorites(prev => {
          const newSet = new Set(prev)
          newSet.delete(shopId)
          return newSet
        })
        console.log(`💔 お気に入り解除: ${shopId}`)
      } else {
        // 追加
        await supabase
          .from('favorites')
          .insert({ user_id: currentUserId, shop_id: shopId })
        
        setFavorites(prev => new Set(prev).add(shopId))
        console.log(`❤️ お気に入り登録: ${shopId}`)
      }
    } catch (error) {
      console.error('お気に入り操作エラー:', error)
    }
  }
  
  // 🆕 閲覧数をカウントアップ（詳細表示時）
  const incrementViewCount = async (shopId: string) => {
    try {
      await supabase.rpc('increment_view_count', { shop_id_param: shopId })
      console.log(`👁️ 閲覧数カウントアップ: ${shopId}`)
    } catch (error) {
      // RPC関数がない場合は通常のupdateで代替
      try {
        const { data: shop } = await supabase
          .from('shops')
          .select('view_count')
          .eq('id', shopId)
          .single()
        
        await supabase
          .from('shops')
          .update({ view_count: (shop?.view_count || 0) + 1 })
          .eq('id', shopId)
      } catch (updateError) {
        console.log('閲覧数更新スキップ（カラム未作成の可能性）')
      }
    }
  }
  
  // 🆕 人気店舗トップ3を取得
  useEffect(() => {
    async function fetchPopularShops() {
      try {
        const { data, error } = await supabase
          .from('shops')
          .select('*')
          .order('view_count', { ascending: false, nullsFirst: false })
          .limit(3)
        
        if (data && !error) {
          setPopularShops(data)
          console.log('🔥 人気店舗トップ3:', data.map(s => s.name))
        }
      } catch (error) {
        console.log('人気店舗取得スキップ（view_countカラム未作成の可能性）')
      }
    }
    
    fetchPopularShops()
  }, [])

  // 🆕 営業中かどうかを判定する関数（opening_hoursを解析）
  const isCurrentlyOpen = (openingHours: string | null | undefined): boolean => {
    if (!openingHours || openingHours.trim() === '' || openingHours === 'NULL') {
      return true // 営業時間が不明な場合は表示
    }
    
    try {
      const now = new Date()
      const currentDay = now.getDay() // 0=日曜, 1=月曜, ..., 6=土曜
      const currentTime = now.getHours() * 100 + now.getMinutes() // HHMM形式（例: 1430 = 14:30）
      
      // opening_hoursがJSON形式の場合
      if (openingHours.startsWith('{') || openingHours.startsWith('[')) {
        const hours = JSON.parse(openingHours)
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        const todayKey = dayNames[currentDay]
        
        if (hours[todayKey]) {
          const todayHours = hours[todayKey]
          if (todayHours === 'closed' || todayHours === '休業') return false
          
          // "09:00-22:00" 形式を解析
          const match = todayHours.match(/(\d{2}):(\d{2})-(\d{2}):(\d{2})/)
          if (match) {
            const openTime = parseInt(match[1]) * 100 + parseInt(match[2])
            const closeTime = parseInt(match[3]) * 100 + parseInt(match[4])
            return currentTime >= openTime && currentTime < closeTime
          }
        }
      } else {
        // 文字列形式の場合（例: "月-金: 09:00-22:00" または "09:00-22:00"）
        const timeMatch = openingHours.match(/(\d{2}):(\d{2})-(\d{2}):(\d{2})/)
        if (timeMatch) {
          const openTime = parseInt(timeMatch[1]) * 100 + parseInt(timeMatch[2])
          const closeTime = parseInt(timeMatch[3]) * 100 + parseInt(timeMatch[4])
          return currentTime >= openTime && currentTime < closeTime
        }
      }
    } catch (error) {
      console.log('営業時間解析エラー:', error)
      return true // エラー時は表示
    }
    
    return true // デフォルトは表示
  }
  
  // ===== 座標を安全にnumber型に変換するヘルパー関数 =====
  // Supabaseから取得した latitude/longitude を確実に number 型として処理
  const toValidNumber = (value: any): number | null => {
    // null, undefined, 空文字は無効
    if (value === null || value === undefined || value === '') return null
    
    // parseFloat(String()) で強制的に number 型に変換
    const num = parseFloat(String(value).trim())
    
    // NaN, Infinity は無効
    if (isNaN(num) || !isFinite(num)) return null
    
    return num
  }
  
  // ===== 座標が有効かどうかをチェック（緩和版）=====
  // latitude が null でなく、0 でなければ有効とみなす
  const isValidCoordinate = (lat: number | null, lng: number | null): boolean => {
    // null または undefined チェック
    if (lat === null || lat === undefined || lng === null || lng === undefined) return false
    
    // 数値型チェック
    if (typeof lat !== 'number' || typeof lng !== 'number') return false
    
    // NaN チェック
    if (isNaN(lat) || isNaN(lng)) return false
    
    // 0 チェック（両方0は無効）
    if (lat === 0 || lng === 0) return false
    
    // 日本の座標範囲チェックは緩和（コメントアウト）
    // これにより、より多くのデータがマップに表示される
    // if (lat < 20 || lat > 50) return false
    // if (lng < 120 || lng > 150) return false
    
    return true
  }
  
  // ===== 住所 座標がない店舗を自動取得してDBに書き戻す =====
  // ※ 全件処理（APIレート制限は各リクエスト間の待機で対応）
  
  // 店舗データが完全かどうかをチェック（住所と座標の両方がある）
  const isShopDataComplete = (shop: Shop): boolean => {
    const hasAddress = !!(shop.address && shop.address.trim() !== '')
    const hasCoords = shop.latitude !== null && shop.longitude !== null && 
                      shop.latitude !== 0 && shop.longitude !== 0 &&
                      !isNaN(Number(shop.latitude)) && !isNaN(Number(shop.longitude))
    return hasAddress && hasCoords
  }
  
  const geocodeAndUpdateShop = async (shop: Shop): Promise<Shop> => {
    // 既に住所と座標の両方がある場合はスキップ
    if (isShopDataComplete(shop)) {
      console.log(`   ⏭️ [${shop.name}] 既に住所 座標あり → スキップ`)
      return shop
    }
    
    // 店名がない場合はスキップ
    if (!shop.name || shop.name.trim() === '') {
      console.log(`   ⏭️ [${shop.name || '名称なし'}] 店名がないためスキップ`)
      return shop
    }
    
    try {
      // 検索クエリを構築：住所があれば住所を使用、なければ「彦根市 + 店名」で検索
      const searchQuery = shop.address && shop.address.trim() !== '' 
        ? shop.address 
        : `彦根市 ${shop.name}`
      
      console.log(`   🔍 [${shop.name}] Google Places API 実行中... (検索: "${searchQuery}")`)
      
      const response = await fetch('/api/shops/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: shop.name, address: searchQuery })
      })
      
      const data = await response.json()
      
      if (data.success && data.latitude && data.longitude) {
        console.log(`   ✅ [${shop.name}] 検索成功!`)
        console.log(`      - 住所: ${data.formatted_address || '取得できず'}`)
        console.log(`      - 座標: [${data.latitude}, ${data.longitude}]`)
        
        // 更新データを構築
        const updateData: any = {
          latitude: data.latitude,
          longitude: data.longitude,
        }
        
        // 住所が空だった場合は、取得した住所で更新
        if (!shop.address || shop.address.trim() === '') {
          if (data.formatted_address) {
            updateData.address = data.formatted_address
            console.log(`      - 住所をDBに保存: ${data.formatted_address}`)
          }
        }
        
        // place_id があれば保存
        if (data.place_id) {
          updateData.place_id = data.place_id
        }
        
        // Supabase の shops テーブルを UPDATE（住所 座標を同時に保存）
        const { error: updateError } = await supabase
          .from('shops')
          .update(updateData)
          .eq('id', shop.id)
        
        if (updateError) {
          console.error(`   ❌ [${shop.name}] DB更新エラー:`, updateError)
          return shop
        }
        
        // 完了ログ
        console.log(`✅ [${shop.name}] の住所と座標を更新しました`)
        
        // 更新された店舗データを返す
        return {
          ...shop,
          address: updateData.address || shop.address,
          latitude: data.latitude,
          longitude: data.longitude,
          place_id: data.place_id || shop.place_id
        }
      } else {
        console.log(`   ⚠️ [${shop.name}] 検索失敗: ${data.error || data.error_message || 'Unknown error'}`)
        return shop
      }
    } catch (error) {
      console.error(`   ❌ [${shop.name}] APIエラー:`, error)
      return shop
    }
  }

  // ===== データ取得関数 =====
  // 初回のみ全データを取得（カテゴリフィルタはフロントエンドで実行）
  const fetchShopsFromDB = async () => {
    console.log('')
    console.log('========================================')
    console.log('🔄 DBからデータ取得中... [全件]')
    console.log('========================================')
    
    setLoading(true)
    
    try {
      // Supabase から全データを取得 (menu_itemsテーブルも結合)
      const { data, error } = await supabase
        .from('shops')
        .select('*, menu_items_data:menu_items(*)')
        
        // ===== 1. エラーチェック =====
        if (error) {
          console.error('❌ DBエラー:', error)
          setLoading(false)
          return
        }
        
        // ===== 2. 生データをログ出力（デバッグ用）=====
        console.log('')
        console.log('📦 Raw Data 件数:', data?.length ?? 0)
        console.log(`✅ DBから ${data?.length ?? 0} 件取得しました`)
        
        // データがない場合
        if (!data || data.length === 0) {
          console.log('⚠️ データが0件です。テーブル名を確認してください。')
          setLoading(false)
          return
        }
        
        // ===== 3. 最初の1件のカラム名と生データを詳細確認（デバッグ用）=====
        console.log('')
        console.log('🔍 最初の1件のカラム名:', Object.keys(data[0]))
        console.log('🔍 DBから届いた生データ(1件目):', data[0])
        
        // カテゴリの生データを詳細確認（隠れた文字がないか）
        const rawCategory = data[0].category_main
        console.log('🔍 [カテゴリ詳細確認]')
        console.log('   - 生の値:', JSON.stringify(rawCategory))
        console.log('   - 文字数:', rawCategory?.length)
        console.log('   - 各文字コード:', rawCategory ? [...rawCategory].map(c => c.charCodeAt(0)) : 'null')
        
        // ★★★ DBの生のカテゴリ値を最初の10件出力 ★★★
        console.log('🔍 DBの生のカテゴリ値 (最初の10件):', data.map((s: any) => s.category_main).slice(0, 10))
        
        // 全カテゴリのユニーク一覧（trimして正規化）
        const uniqueCategories = [...new Set(data.map((s: any) => s.category_main?.trim()).filter(Boolean))]
        console.log('🔍 取得データ内のユニークカテゴリ:', uniqueCategories)
        console.log('🔍 ユニークカテゴリ数:', uniqueCategories.length)
        
        // ===== 4. データ整形: 座標を数値に変換しつつセット =====
        // 座標が null のデータもそのまま含める
        const formattedData: Shop[] = data.map((s: any) => {
          // 座標エイリアス対応（lat/lng または latitude/longitude）
          const rawLat = s.latitude ?? s.lat ?? null
          const rawLng = s.longitude ?? s.lng ?? null
          
          // 数値に変換（null はそのまま null）
          const lat = rawLat !== null ? Number(rawLat) : null
          const lng = rawLng !== null ? Number(rawLng) : null
          
          // カテゴリをtrimしてクレンジング
          const cleanCategory = s.category_main ? String(s.category_main).trim() : 'その他'
          
          return {
            id: s.id,
            name: s.name ? String(s.name).trim() : '名称未設定',
            category_main: cleanCategory,
            category_sub: s.category_sub ? String(s.category_sub).trim() : undefined,
            meal_type: s.meal_type ? String(s.meal_type).trim() : undefined,
            address: s.address ? String(s.address).trim() : '',
            phone: s.phone || s.tel || '',
            opening_hours: s.opening_hours || s.hours || '',
            price_range: s.price_range || s.budget || '',
            image_url: s.image_url || s.photo || s.thumbnail || '',
            image_urls: s.image_urls || [],
            latitude: lat,
            longitude: lng,
            place_id: s.place_id || undefined,
            menu_items: s.menu_items_data && Array.isArray(s.menu_items_data) && s.menu_items_data.length > 0
              ? s.menu_items_data.map((m: any) => `${m.name}:${m.price}:${m.image_url || ''}`)
              : (s.menu_items || [])
          }
        })
        
        // ===== 5. データの完全性をカウント（住所と座標の両方があるか）=====
        const completeShops = formattedData.filter(s => isShopDataComplete(s))
        
        // 住所または座標が欠けている店舗（自動補完対象）
        const incompleteShops = formattedData.filter(s => !isShopDataComplete(s))
        
        // 内訳を表示
        const noAddressCount = formattedData.filter(s => !s.address || s.address.trim() === '').length
        const noCoordsCount = formattedData.filter(s => 
          s.latitude === null || s.longitude === null ||
          s.latitude === 0 || s.longitude === 0 ||
          isNaN(Number(s.latitude)) || isNaN(Number(s.longitude))
        ).length
        
        console.log('')
        console.log(`📊 データ完全性:`)
        console.log(`   - 完全なデータ（住所 座標あり）: ${completeShops.length}件`)
        console.log(`   - 不完全なデータ: ${incompleteShops.length}件`)
        console.log(`      - 住所なし: ${noAddressCount}件`)
        console.log(`      - 座標なし: ${noCoordsCount}件`)
        
        // ===== 6. まずは現在のデータをステートにセット（表示を先に行う） =====
        // ★★★ カテゴリ別の件数を詳細ログ出力 ★★★
        const categoryCount: Record<string, number> = {}
        formattedData.forEach(s => {
          const cat = s.category_main?.trim() || 'なし'
          categoryCount[cat] = (categoryCount[cat] || 0) + 1
        })
        console.log('')
        console.log('📊 カテゴリ別件数:')
        Object.entries(categoryCount)
          .sort((a, b) => b[1] - a[1])
          .forEach(([cat, count]) => {
            console.log(`   - ${cat}: ${count}件`)
          })
        
        setAllShops(formattedData)
        setFilteredShops(formattedData)
        
        console.log(`✅ 初期表示: 全${formattedData.length}件をセット（カテゴリ未選択）`)
        
        console.log(`🗺️ ShopMap に ${formattedData.length} 件渡します`)
        
        // ===== カテゴリ一覧をデバッグ出力 =====
        const allCategories = [...new Set(formattedData.map(s => s.category_main?.trim()).filter(Boolean))]
        console.log('🏷️ [初期化] DB内の全カテゴリ一覧:', allCategories)
        console.log(`🏷️ [初期化] ユニークカテゴリ数: ${allCategories.length}件`)
        
        // 地図の中心を有効な店舗に調整
        if (completeShops.length > 0) {
          const firstShop = completeShops[0]
          const centerLat = Number(firstShop.latitude)
          const centerLng = Number(firstShop.longitude)
          if (!isNaN(centerLat) && !isNaN(centerLng)) {
            setMapCenter([centerLat, centerLng])
            console.log(`📍 マップ中心: [${centerLat}, ${centerLng}]`)
          }
        }
        
        // ===== 7. 不完全なデータを自動でGoogle Places APIで補完（バックグラウンド処理） =====
        // ※ 全件処理（APIレート制限は各リクエスト間の待機で対応）
        if (incompleteShops.length > 0) {
          console.log('')
          console.log('========================================')
          console.log(`🌐 データ補完が必要な店舗: ${incompleteShops.length}件`)
          console.log('   ※ 店名から「彦根市 + 店名」で検索し、住所と座標を取得します')
          console.log('   ※ 全件処理します（各リクエスト間に200ms待機）')
          console.log('========================================')
          
          const updatedShops = [...formattedData]
          let successCount = 0
          let failCount = 0
          
          for (let i = 0; i < incompleteShops.length; i++) {
            const shop = incompleteShops[i]
            console.log(`\n--- [${i + 1}/${incompleteShops.length}] ${shop.name} ---`)
            
            const updatedShop = await geocodeAndUpdateShop(shop)
            
            // 更新があった場合、配列内のデータも更新
            if (updatedShop.latitude !== null && updatedShop.longitude !== null &&
                updatedShop.latitude !== 0 && updatedShop.longitude !== 0) {
              const index = updatedShops.findIndex(s => s.id === shop.id)
              if (index !== -1) {
                updatedShops[index] = updatedShop
                successCount++
              }
            } else {
              failCount++
            }
            
            // 10件ごとに進捗を表示
            if ((i + 1) % 10 === 0) {
              console.log(`\n📊 進捗: ${i + 1}/${incompleteShops.length}件処理完了 (成功: ${successCount}, 失敗: ${failCount})`)
              // 10件ごとにステートを更新（マップに反映）
              setAllShops([...updatedShops])
              setFilteredShops([...updatedShops])
            }
            
            // APIレート制限対策: 各リクエスト間に200ms待機
            if (i < incompleteShops.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 200))
            }
          }
          
          // ===== 8. 更新されたデータでステートを再セット =====
          setAllShops(updatedShops)
          setFilteredShops(updatedShops)
          
          const newCompleteCount = updatedShops.filter(s => isShopDataComplete(s)).length
          
          console.log('')
          console.log('========================================')
          console.log(`🎉 全件処理完了!`)
          console.log(`   - 成功: ${successCount}件`)
          console.log(`   - 失敗: ${failCount}件`)
          console.log(`📊 全体の完全データ: ${newCompleteCount}/${updatedShops.length}件`)
          console.log('========================================')
        } else {
          console.log('')
          console.log('🎉 データ取得完了 - 全店舗の住所 座標がDBに存在します（API節約）')
        }
        
      } catch (error) {
        console.error('❌ 店舗データ取得エラー:', error)
      } finally {
        setLoading(false)
      }
    }
  
  // 🆕 エリアマスターデータ取得（area_mastersテーブルから）
  useEffect(() => {
    async function fetchAreas() {
      try {
        const { data, error } = await supabase
          .from('area_masters')
          .select('*')
          .order('display_order', { ascending: true })
        
        if (error) {
          console.log('📍 area_mastersテーブルが見つかりません（デフォルト値を使用）:', error.message)
          return
        }
        
        if (data && data.length > 0) {
          const formattedAreas: AreaMaster[] = data.map((item: any) => ({
            id: item.id || item.area_id,
            name: item.name || item.area_name,
            keywords: item.keywords || (item.search_keywords ? item.search_keywords.split(',') : []),
            center_lat: item.center_lat || item.latitude || 0,
            center_lng: item.center_lng || item.longitude || 0,
            default_zoom: item.default_zoom || item.zoom || 15
          }))
          setAreas(formattedAreas)
          console.log(`📍 エリアマスターデータ取得完了: ${formattedAreas.length}件`)
        }
      } catch (error) {
        console.log('📍 area_mastersテーブル取得エラー（デフォルト値を使用）:', error)
      }
    }
    
    fetchAreas()
  }, [])
  
  // ===== 初回データ取得 useEffect =====
  // ③ プロフィール取得完了を待ってから店舗データを取得
  useEffect(() => {
    if (isProfileLoaded) {
      console.log('📦 プロフィール取得完了 → 店舗データ取得開始')
      fetchShopsFromDB()
    }
  }, [isProfileLoaded]) // プロフィール取得完了後に実行
  
  // 🆕 起動時の自動位置情報取得
  useEffect(() => {
    // ブラウザが位置情報をサポートしているかチェック
    if (!navigator.geolocation) {
      console.log('📍 位置情報APIが利用できません')
      return
    }

    // 位置情報の許可状態をチェック
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        console.log(`📍 位置情報の許可状態: ${result.state}`)
        setLocationPermission(result.state as 'prompt' | 'granted' | 'denied')
        
        // 既に許可されている場合は自動取得
        if (result.state === 'granted') {
          console.log('📍 位置情報が許可済み → 自動取得を開始')
          getCurrentLocation(true) // silent=trueでサイレント取得
        } else if (result.state === 'prompt') {
          // 初回訪問時は自動で取得を試みる（ブラウザがダイアログを表示）
          console.log('📍 位置情報の許可を確認中 → 自動取得を試みます')
          getCurrentLocation(true) // silent=trueでサイレント取得
        }
        
        // 許可状態が変更されたときのリスナー
        result.addEventListener('change', () => {
          console.log(`📍 位置情報の許可状態が変更: ${result.state}`)
          setLocationPermission(result.state as 'prompt' | 'granted' | 'denied')
          if (result.state === 'granted' && !currentLocation) {
            console.log('📍 位置情報が許可されました → 自動取得を開始')
            getCurrentLocation(true)
          }
        })
      }).catch(() => {
        // permissions APIが使えない場合は、直接取得を試みる
        console.log('📍 permissions APIが利用できないため、直接取得を試みます')
        getCurrentLocation(true)
      })
    } else {
      // permissions APIが使えない場合は、直接取得を試みる
      console.log('📍 permissions APIが利用できないため、直接取得を試みます')
      getCurrentLocation(true)
    }
  }, []) // 初回マウント時のみ実行
  
  // フィルタリング（カテゴリ、検索、営業中）とソート（距離順、人気順、おすすめ順）を適用
  useEffect(() => {
    if (allShops.length === 0) {
      setFilteredShops([])
      return
    }
    
    let result = allShops.map(s => {
      // 現在地がある場合は距離を計算（nullをundefinedに変換）
      const dist = currentLocation && s.latitude && s.longitude
        ? calculateDistance(currentLocation.lat, currentLocation.lng, s.latitude, s.longitude)
        : null
      return { 
        ...s,
        isFavorite: favorites.has(s.id),
        distance: dist ?? undefined  // null を undefined に変換
      }
    })
    
    // ★★★ 3. デバッグ用にDBの中身を10件分だけ強制出力 ★★★
    console.log('')
    console.log('========================================')
    console.log('🔍 フィルタリング開始')
    console.log('選択されたカテゴリ（複数選択対応）:', selectedCategories)
    console.log('選択されたエリア:', selectedArea)
    console.log('DBカテゴリの生データサンプル:', allShops.slice(0, 10).map(s => ({ name: s.name, cat: s.category_main })))
    console.log('========================================')
    
    // ===== 🆕 エリアフィルター（shop.areaでフィルタリング）=====
    if (selectedArea) {
      const areaData = areas.find(a => a.id === selectedArea)
      if (areaData) {
        const beforeAreaCount = result.length
        result = result.filter(shop => {
          // shop.areaカラムを優先的に使用
          const shopArea = (shop as any).area || ''
          
          // shop.areaが空の場合は住所で検索（フォールバック）
          if (!shopArea || shopArea.trim() === '') {
            const shopAddress = shop.address || ''
            const combinedText = `${shopArea} ${shopAddress}`.toLowerCase()
            return areaData.keywords.some(keyword => 
              combinedText.includes(keyword.toLowerCase())
            )
          }
          
          // shop.areaで検索（部分一致）
          const normalizedShopArea = shopArea.toLowerCase().trim()
          return areaData.keywords.some(keyword => 
            normalizedShopArea.includes(keyword.toLowerCase())
          )
        })
        console.log(`📍 [エリア検索] ${areaData.name}: ${beforeAreaCount}件 → ${result.length}件`)
      }
    }
    
    // ===== 4. カテゴリ未選択時は全件表示 =====
    if (selectedCategories.length === 0) {
      console.log(`🏷️ [全件表示] カテゴリ未選択 → 全${result.length}件をそのまま表示（フィルターなし）`)
      console.log('ヒット件数:', result.length)
      // ★★★ フィルタリングを一切せず、全件をそのまま使用 ★★★
    } else {
      // ===== 1. カテゴリフィルタ（複数選択 OR検索）=====
      const beforeCount = result.length
      
      // 選択された全カテゴリのキーワードを収集
      const allKeywords: string[] = []
      selectedCategories.forEach(cat => {
        const keywords = CATEGORY_GROUPS[cat] || [cat]
        allKeywords.push(...keywords)
      })
      
      console.log('🏷️ [カテゴリ検索] 選択:', selectedCategories)
      console.log('🏷️ [カテゴリ検索] キーワード:', allKeywords)
      
      // ★★★ DB内の実際のカテゴリ名を出力（デバッグ用）★★★
      const allCategoriesInDB = [...new Set(allShops.map(s => s.category_main?.trim()).filter(Boolean))]
      console.log('🏷️ [カテゴリ検索] DB内の全カテゴリ一覧:', allCategoriesInDB)
      
      // ★★★ 2. 正規化関数: 大文字小文字 全角半角を統一 ★★★
      const normalize = (str: string | null | undefined): string => {
        if (!str) return ''
        return str
          .toLowerCase()
          .trim()
          // 全角英数字を半角に変換
          .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
          // 全角スペースを半角に
          .replace(/　/g, ' ')
          // 全角カタカナをひらがなに（簡易版）
          .replace(/[ァ-ン]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0x60))
      }
      
      result = result.filter(shop => {
        // ★★★ 1. DBのカテゴリデータの「ゆらぎ」を吸収 ★★★
        // category_main, category_sub, meal_type, 店名 のいずれかにキーワードが含まれればOK
        const normalizedCategory = normalize(shop.category_main)
        const normalizedCategorySub = normalize(shop.category_sub)
        const normalizedMealType = normalize(shop.meal_type)
        const normalizedName = normalize(shop.name)
        
        // OR検索: いずれかのキーワードにマッチすればOK
        const isMatch = allKeywords.some(kw => {
          const normalizedKw = normalize(kw)
          // いずれかのフィールドにキーワードが含まれていればマッチ
          return normalizedCategory.includes(normalizedKw) || 
                 normalizedCategorySub.includes(normalizedKw) ||
                 normalizedMealType.includes(normalizedKw) ||
                 normalizedName.includes(normalizedKw)
        })
        
        return isMatch
      })
      
      console.log(`🏷️ [カテゴリ検索] 結果: ${beforeCount}件 → ${result.length}件`)
      console.log('ヒット件数:', result.length)
      
      // マッチしたカテゴリを出力
      if (result.length > 0) {
        const matchedCategories = [...new Set(result.map(s => s.category_main))]
        console.log('🏷️ [カテゴリ検索] マッチしたカテゴリ:', matchedCategories)
        console.log('🏷️ [カテゴリ検索] マッチした店舗サンプル:', result.slice(0, 5).map(s => ({ name: s.name, cat: s.category_main })))
      } else {
        // 0件の場合、詳細デバッグ
        console.log('🏷️ [カテゴリ検索] ⚠️ 0件 - 原因調査')
        console.log('🏷️ [カテゴリ検索] DB内の全カテゴリ:', allCategoriesInDB)
        console.log('🏷️ [カテゴリ検索] キーワードと正規化結果:')
        allKeywords.forEach(kw => {
          const normalizedKw = normalize(kw)
          const found = allCategoriesInDB.filter(cat => normalize(cat).includes(normalizedKw))
          console.log(`   - "${kw}" (正規化: "${normalizedKw}") → マッチ: ${found.length > 0 ? found.join(', ') : 'なし'}`)
        })
      }
    }
    
    // 検索フィルタ（店名 + カテゴリ + 住所）
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(s => 
        s.name?.toLowerCase().includes(query) ||
        s.category_main?.toLowerCase().includes(query) ||
        s.category_sub?.toLowerCase().includes(query) ||
        s.meal_type?.toLowerCase().includes(query) ||
        s.address?.toLowerCase().includes(query)
      )
      console.log(`🔍 [テキスト検索] "${searchQuery}" → ${result.length}件`)
    }
    
    // 🆕 営業中フィルタ（opening_hoursを解析して現在時刻と比較）
    if (onlyOpen) {
      const beforeOpenCount = result.length
      result = result.filter(s => isCurrentlyOpen(s.opening_hours))
      console.log(`🕐 [営業中フィルタ] ${beforeOpenCount}件 → ${result.length}件`)
    }
    
    // デフォルトで閲覧数順（人気順）にソート
    result = result.sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
    console.log(`📊 ソート適用: ${result.length}件（閲覧数順）`)
    
    setFilteredShops(result)
    
    // 🆕 カテゴリ切り替え時は初回フラグをfalseに（fitBounds抑制）
    if (isInitialMapLoad && allShops.length > 0) {
      // 初回データ読み込み完了後、少し遅延してフラグを更新
      setTimeout(() => setIsInitialMapLoad(false), 1000)
    }
  }, [selectedCategories, selectedArea, onlyOpen, searchQuery, allShops, currentLocation, favorites])

  // 🆕 エリア選択時のマップジャンプ処理（area_mastersテーブルのcenter_lat, center_lng, default_zoomを使用）
  const handleAreaSelect = (areaId: string | null) => {
    if (areaId === selectedArea) {
      // 同じエリアを再度タップしたら解除
      setSelectedArea(null)
      setMapJumpTo(null)
      console.log('📍 エリア選択解除')
    } else if (areaId) {
      // 新しいエリアを選択
      const areaData = areas.find(a => a.id === areaId)
      if (areaData) {
        setSelectedArea(areaId)
        
        // area_mastersテーブルのcenter_lat, center_lngを使用（ズームレベルは14に固定して広域表示）
        const fixedZoom = 14 // 広域表示のため14に固定
        console.log(`📍 エリア選択: ${areaData.name} → [${areaData.center_lat}, ${areaData.center_lng}] zoom: ${fixedZoom}`)
        setMapJumpTo({ 
          center: [areaData.center_lat, areaData.center_lng], 
          zoom: fixedZoom 
        })
      }
    } else {
      // 解除
      setSelectedArea(null)
      setMapJumpTo(null)
    }
  }

  // 選択されたショップが変更された時にルート情報をリセット & 閲覧数カウント
  useEffect(() => {
    if (selectedShop) {
      setRouteData(null)
      setShowRoute(false)
      setCurrentPhotoIndex(0)
      
      // 写真は既存のimage_urlsを使用（API呼び出しなし）
      if (selectedShop.image_urls && selectedShop.image_urls.length > 0) {
        setShopPhotos(selectedShop.image_urls)
      } else {
        setShopPhotos([])
      }
      setPhotosLoading(false)
      
      // 🆕 閲覧数をカウントアップ
      incrementViewCount(selectedShop.id)
    }
  }, [selectedShop])
  
  // 写真ギャラリーの前後に移動する関数
  const goToPreviousPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev === 0 ? shopPhotos.length - 1 : prev - 1))
  }

  const goToNextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev === shopPhotos.length - 1 ? 0 : prev + 1))
  }

  // スケルトンスクリーンコンポーネント
  const SkeletonShopCard = () => (
    <div className="cursor-pointer overflow-hidden bg-white rounded-[2rem] border border-gray-100 shadow-sm">
      <div className="w-full h-44 bg-gray-200 animate-pulse"></div>
      <div className="p-5 space-y-3">
        <div className="h-5 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse"></div>
        <div className="flex gap-3">
          <div className="h-4 bg-gray-100 rounded w-24 animate-pulse"></div>
          <div className="h-4 bg-gray-100 rounded w-16 animate-pulse"></div>
        </div>
      </div>
    </div>
  )

  // 読み込み中はスケルトンスクリーンを表示
  if (loading) {
    return (
      <div className="flex flex-col h-screen w-full bg-white overflow-hidden relative">
        {/* 固定ヘッダー */}
        <div className="z-[100] bg-white border-b border-gray-100 px-4 py-3 shadow-sm">
          <div className="max-w-md mx-auto space-y-3">
            <div className="bg-gray-50 rounded-full h-10 animate-pulse"></div>
            <div className="flex gap-2">
              <div className="flex-1 h-10 bg-gray-100 rounded-xl animate-pulse"></div>
              <div className="flex-1 h-10 bg-gray-100 rounded-xl animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* スクロールエリア */}
        <div className="flex-1 overflow-y-auto no-scrollbar relative bg-white pb-24">
          {/* 地図エリアスケルトン */}
          <div className="w-full h-[50vh] bg-gray-100 flex items-center justify-center">
            <div className="text-gray-400 font-bold">地図を読み込み中...</div>
          </div>

          {/* レストランリストスケルトン */}
          <div className="relative z-[60] bg-white rounded-t-[2.5rem] -mt-6 shadow-[0_-15px_50px_rgba(0,0,0,0.15)] border-t border-gray-100 min-h-[50vh]">
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto my-4"></div>
            <div className="px-6">
              <div className="flex justify-between items-center mb-6">
                <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
                <div className="h-6 bg-gray-100 rounded-full w-12 animate-pulse"></div>
              </div>
              <div className="grid gap-6">
                {[1, 2, 3].map((i) => (
                  <SkeletonShopCard key={i} />
                ))}
              </div>
            </div>
          </div>
        </div>
        <BottomNavigation />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen w-full bg-white overflow-hidden relative">
      
      {/* 🆕 1. ヘッダーエリア（固定、最上部） */}
      <div className="z-[100] bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-md mx-auto">
          {/* 1段目：検索窓 & 「今すぐ入れる」ボタン */}
          <div className="px-4 py-3 flex gap-2">
            <div className="flex-1 bg-gray-50 rounded-full flex items-center p-2.5 px-4 gap-3 border border-gray-200">
              <Search size={16} className="text-gray-400" />
              <input 
                type="text" 
                placeholder="お店を検索" 
                className="text-xs font-bold outline-none w-full bg-transparent text-gray-800"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setOnlyOpen(!onlyOpen)}
              className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-[10px] font-black border transition-all shrink-0 ${
                onlyOpen 
                  ? 'bg-emerald-500 text-white border-emerald-600 shadow-md' 
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-emerald-50'
              }`}
            >
              <CheckCircle2 size={14} /> 今すぐ入れる
            </button>
          </div>
          
          {/* 2段目：エリア選択バー */}
          <div className="px-4 pb-3">
            <div className="flex overflow-x-auto no-scrollbar gap-1.5">
              {/* エリア解除ボタン */}
              {selectedArea && (
                <button
                  onClick={() => handleAreaSelect(null)}
                  className="flex items-center gap-1 px-2.5 py-2 rounded-full transition-all shrink-0 border shadow-lg bg-gray-700 text-white border-gray-600 text-[10px] font-bold hover:scale-105"
                >
                  <span>✕</span>
                  <span>解除</span>
                </button>
              )}
              
              {/* エリアボタン */}
              {areas.map((area) => {
                const isSelected = selectedArea === area.id
                return (
                  <button
                    key={area.id}
                    onClick={() => handleAreaSelect(area.id)}
                    className={`flex items-center gap-1 px-2.5 py-2 rounded-full transition-all shrink-0 border shadow-lg text-[10px] font-bold ${
                      isSelected 
                        ? 'bg-blue-600 text-white border-blue-500 scale-105 ring-2 ring-blue-300' 
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-200 hover:bg-blue-50'
                    }`}
                  >
                    <MapPin size={11} className={isSelected ? 'text-white' : 'text-blue-500'} />
                    <span>{area.name}</span>
                    {isSelected && <span className="text-[8px]">✓</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      
      {/* 🆕 2. マップエリア（ヘッダーの下） */}
      <div className="w-full h-[50vh] relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <ShopMap 
            shops={filteredShops} 
            routeData={routeData && showRoute && selectedShop?.latitude && selectedShop?.longitude ? {
              steps: routeData.steps,
              start_location: currentLocation || { lat: 0, lng: 0 },
              end_location: { 
                lat: Number(selectedShop.latitude) || 0, 
                lng: Number(selectedShop.longitude) || 0 
              }
            } : null}
            currentLocation={currentLocation}
            destinationShop={selectedShop}
            defaultCenter={mapCenter}
            isInitialLoad={isInitialMapLoad}
            jumpTo={mapJumpTo}
            shouldMoveToLocation={shouldMoveMapToLocation}
            onLocationMoveComplete={() => {
              console.log('📍 マップ移動完了 → フラグをリセット')
              setShouldMoveMapToLocation(false)
            }}
          />
        </div>
        
        {/* 🆕 カテゴリー選択バー（マップの上にオーバーレイ、ガラス風） */}
        <div className="absolute top-3 inset-x-0 z-50 pointer-events-none">
          <div className="max-w-md mx-auto px-4">
            <div className="bg-white/85 backdrop-blur-md rounded-2xl p-2 shadow-xl border border-white/60 pointer-events-auto">
              <div className="flex overflow-x-auto no-scrollbar gap-2">
                {/* 全解除ボタン */}
                {selectedCategories.length > 0 && (
                  <button
                    onClick={() => setSelectedCategories([])}
                    className="flex items-center gap-1.5 p-1.5 pr-3 rounded-full transition-all shrink-0 border-2 shadow-lg bg-gray-800 text-white border-gray-700 scale-100 hover:scale-105"
                  >
                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white/20">
                      <span className="text-[10px]">✕</span>
                    </div>
                    <span className="text-[10px] font-black">解除</span>
                  </button>
                )}
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategories.includes(cat.id)
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategories(prev => 
                          prev.includes(cat.id)
                            ? prev.filter(c => c !== cat.id)
                            : [...prev, cat.id]
                        )
                      }}
                      className={`flex items-center gap-1.5 p-1.5 pr-3 rounded-full transition-all shrink-0 border-2 shadow-lg ${
                        isSelected 
                          ? 'bg-orange-600 text-white border-orange-500 scale-105 ring-2 ring-orange-300' 
                          : 'bg-white/90 text-gray-700 border-gray-200 hover:border-orange-200'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isSelected ? 'bg-white/20' : cat.color}`}>
                        {cat.icon}
                      </div>
                      <span className="text-[10px] font-black">{cat.name}</span>
                      {isSelected && (
                        <div className="w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center -mr-1">
                          <span className="text-orange-500 text-[7px] font-black">✓</span>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 🆕 3. 店舗リスト（マップの下） */}
      <div className="flex-1 overflow-y-auto no-scrollbar relative bg-white pb-24">
        {/* レストランリスト */}
        <div className="relative z-[60] bg-white rounded-t-[2.5rem] -mt-6 shadow-[0_-15px_50px_rgba(0,0,0,0.15)] border-t border-gray-100 min-h-[50vh]">
          <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto my-4" />
          <div className="px-6">
            {/* 🆕 人気店舗トップ3 */}
            {popularShops.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Flame size={16} className="text-rose-500" />
                  <h3 className="text-sm font-black text-gray-900">彦根で今人気のお店</h3>
                </div>
                <div className="flex overflow-x-auto no-scrollbar gap-3 pb-2">
                  {popularShops.map((shop, idx) => (
                    <div
                      key={shop.id}
                      onClick={() => setSelectedShop(shop)}
                      className="shrink-0 w-36 bg-gradient-to-br from-rose-50 to-orange-50 rounded-2xl p-3 border border-rose-100 cursor-pointer active:scale-95 transition-all"
                    >
                      <div className="flex items-center gap-1 mb-2">
                        <span className="text-lg">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                        <span className="text-[9px] font-black text-rose-600">#{idx + 1}</span>
                      </div>
                      <p className="text-xs font-black text-gray-800 line-clamp-2 mb-1">{shop.name}</p>
                      <p className="text-[9px] text-gray-500">{shop.category_main}</p>
                      {shop.view_count && (
                        <p className="text-[8px] text-rose-400 mt-1">{shop.view_count}回表示</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-gray-900 italic tracking-tighter">
                お店一覧
              </h2>
              <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-[9px] font-black">{filteredShops.length}件</span>
            </div>
            <div className="grid gap-6">
              {filteredShops.map((shop, index) => {
                const isFav = favorites.has(shop.id)
                
                return (
                  <div 
                    key={shop.id} 
                    onClick={() => setSelectedShop(shop)}
                    className={`cursor-pointer overflow-hidden bg-white rounded-[2rem] border shadow-sm active:scale-[0.98] transition-all ${
                      isFav ? 'border-rose-200 ring-2 ring-rose-100' : 'border-gray-100'
                    }`}
                  >
                    <div className="w-full h-44 bg-gray-100 relative">
                      {shop.image_url ? (
                        <img src={shop.image_url} alt={shop.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold">NO IMAGE</div>
                      )}
                      {/* カテゴリバッジ */}
                      <div className="absolute top-4 right-4 bg-black/20 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-bold text-white uppercase tracking-widest">
                        {shop.category_main}
                      </div>
                      {/* 人気ランキングバッジ（上位3件） */}
                      {index < 3 && (
                        <div className="absolute top-4 left-4 bg-gradient-to-r from-rose-500 to-orange-500 px-3 py-1 rounded-full text-[9px] font-black text-white flex items-center gap-1 shadow-lg">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                          #{index + 1}
                        </div>
                      )}
                      {/* 距離バッジ（現在地がある場合、上位3件以外） */}
                      {index >= 3 && shop.distance !== null && shop.distance !== undefined && (
                        <div className="absolute top-4 left-4 bg-blue-500 px-2.5 py-1 rounded-full text-[9px] font-black text-white flex items-center gap-1">
                          <Locate size={10} />
                          {formatDistance(shop.distance)}
                        </div>
                      )}
                      {/* 24時間営業バッジ */}
                      {(shop.opening_hours?.toLowerCase().includes('24時間') || 
                        shop.opening_hours?.toLowerCase().includes('24h') ||
                        shop.opening_hours?.toLowerCase().includes('終日')) && (
                        <div className="absolute bottom-4 left-4 bg-emerald-500 px-2.5 py-1 rounded-full text-[9px] font-black text-white flex items-center gap-1">
                          <Clock size={10} />
                          24H
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-md font-extrabold text-gray-900 leading-tight flex-1 pr-2">{shop.name}</h3>
                        {/* お気に入りボタン */}
                        <button 
                          onClick={(e) => toggleFavorite(shop.id, e)}
                          className="p-1.5 rounded-full transition-all hover:bg-rose-50 active:scale-90"
                        >
                          <Heart 
                            size={20} 
                            className={isFav ? 'text-rose-500 fill-rose-500' : 'text-gray-300'} 
                          />
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-500 flex items-center gap-1 mb-3">
                        <MapPin size={10} className="text-orange-500" /> {shop.address || '住所情報なし'}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 flex-wrap">
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded ${
                          isShopOpen(shop.opening_hours) 
                            ? 'text-emerald-600 bg-emerald-50' 
                            : 'text-gray-500 bg-gray-100'
                        }`}>
                          {isShopOpen(shop.opening_hours) ? '営業中' : '営業時間外'}
                        </span>
                        <span className="text-gray-900 flex items-center gap-1">
                          <span className="text-sm">💰</span>
                          {shop.price_range || '---'}
                        </span>
                        {/* 距離表示（現在地がある場合） */}
                        {shop.distance !== null && shop.distance !== undefined && (
                          <span className="text-blue-500 bg-blue-50 px-2 py-0.5 rounded flex items-center gap-1">
                            <Locate size={8} /> {formatDistance(shop.distance)}
                          </span>
                        )}
                        {/* 閲覧数 */}
                        {shop.view_count && (
                          <span className="text-rose-500 bg-rose-50 px-2 py-0.5 rounded flex items-center gap-1">
                            <TrendingUp size={8} /> {shop.view_count}回
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 詳細パネル（selectedShopがある時だけ表示） */}
      {selectedShop && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[1000]" onClick={() => setSelectedShop(null)} />
          <div className="fixed bottom-0 inset-x-0 z-[1001] bg-white rounded-t-[3rem] h-[85vh] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom duration-300">
            <div className="sticky top-0 bg-white/90 backdrop-blur-md z-10 pt-4 pb-2">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4" onClick={() => setSelectedShop(null)} />
              <button onClick={() => setSelectedShop(null)} className="absolute right-6 top-4 bg-gray-100 p-2 rounded-full text-gray-500"><X size={20} /></button>
            </div>
            <div className="px-6 pb-40">
              {/* フォトギャラリー */}
              <div className="w-full h-64 rounded-[2.5rem] overflow-hidden mb-6 shadow-lg relative bg-gray-100">
                {photosLoading ? (
                  // スケルトンローディング
                  <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
                    <div className="text-gray-400 font-bold">写真を読み込み中...</div>
                  </div>
                ) : shopPhotos.length > 0 ? (
                  // 写真カルーセル
                  <div className="relative w-full h-full">
                    <img 
                      src={shopPhotos[currentPhotoIndex]} 
                      className="w-full h-full object-cover" 
                      alt={`${selectedShop.name} - 写真 ${currentPhotoIndex + 1}`}
                    />
                    {/* ナビゲーションボタン */}
                    {shopPhotos.length > 1 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            goToPreviousPhoto()
                          }}
                          className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all"
                          aria-label="前の写真"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            goToNextPhoto()
                          }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all"
                          aria-label="次の写真"
                        >
                          <ChevronRight size={20} />
                        </button>
                        {/* インジケーター */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                          {shopPhotos.map((_, index) => (
                            <button
                              key={index}
                              onClick={(e) => {
                                e.stopPropagation()
                                setCurrentPhotoIndex(index)
                              }}
                              className={`w-2 h-2 rounded-full transition-all ${
                                index === currentPhotoIndex ? 'bg-white w-6' : 'bg-white/50'
                              }`}
                              aria-label={`写真 ${index + 1} に移動`}
                            />
                          ))}
                        </div>
                        {/* 写真カウンター */}
                        <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs font-black">
                          {currentPhotoIndex + 1} / {shopPhotos.length}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  // プレースホルダー画像
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
                    <ImageIcon size={48} className="text-gray-300 mb-3" />
                    <p className="text-gray-400 font-bold text-sm">写真準備中</p>
                  </div>
                )}
              </div>
              {/* 店名とお気に入りボタン */}
              <div className="flex items-start justify-between mb-2">
                <h2 className="text-3xl font-black text-gray-900 leading-tight flex-1 pr-3">{selectedShop.name}</h2>
                <button 
                  onClick={(e) => toggleFavorite(selectedShop.id, e)}
                  className={`p-3 rounded-full transition-all ${
                    favorites.has(selectedShop.id) 
                      ? 'bg-rose-100 text-rose-500' 
                      : 'bg-gray-100 text-gray-400 hover:bg-rose-50 hover:text-rose-400'
                  }`}
                >
                  <Heart 
                    size={24} 
                    className={favorites.has(selectedShop.id) ? 'fill-rose-500' : ''} 
                  />
                </button>
              </div>
              
              {/* カテゴリ 価格帯 距離 */}
              <div className="flex items-center gap-2 mb-6 flex-wrap">
                <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs font-black">{selectedShop.category_main}</span>
                {selectedShop.price_range && (
                  <span className="text-gray-900 font-black text-sm flex items-center gap-1">
                    <span className="text-lg">💰</span>
                    {selectedShop.price_range}
                  </span>
                )}
                {selectedShop.distance !== null && selectedShop.distance !== undefined && (
                  <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1">
                    <Locate size={10} /> {formatDistance(selectedShop.distance)}
                  </span>
                )}
                {isShopOpen(selectedShop.opening_hours) && (
                  <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-xs font-black">営業中</span>
                )}
              </div>
              
              {/* 🆕 クイックアクションボタン（食べログ風） */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {/* 電話をかける */}
                <a
                  href={`tel:${selectedShop.phone}`}
                  className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl shadow-lg active:scale-95 transition-all"
                >
                  <Phone size={24} className="mb-2" />
                  <span className="text-[10px] font-black">電話する</span>
                </a>
                
                {/* Googleマップでナビ開始 */}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedShop.latitude},${selectedShop.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl shadow-lg active:scale-95 transition-all"
                >
                  <Navigation size={24} className="mb-2" />
                  <span className="text-[10px] font-black">ナビ開始</span>
                </a>
                
                {/* 公式サイトへ / 検索 */}
                <a
                  href={selectedShop.website_url || `https://www.google.com/search?q=${encodeURIComponent(selectedShop.name + ' ' + (selectedShop.address || '彦根市'))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl shadow-lg active:scale-95 transition-all"
                >
                  {selectedShop.website_url ? (
                    <>
                      <Globe size={24} className="mb-2" />
                      <span className="text-[10px] font-black">公式サイト</span>
                    </>
                  ) : (
                    <>
                      <ExternalLink size={24} className="mb-2" />
                      <span className="text-[10px] font-black">Web検索</span>
                    </>
                  )}
                </a>
              </div>
              
              {/* 🆕 基本情報テーブル（食べログ風） */}
              <div className="bg-gray-50 rounded-[2rem] mb-8 border border-gray-100 overflow-hidden">
                <h3 className="text-sm font-black text-gray-700 px-5 py-3 bg-gray-100 border-b border-gray-200">店舗情報</h3>
                <div className="divide-y divide-gray-100">
                  {/* 住所 */}
                  <div className="flex items-start px-5 py-4">
                    <div className="w-20 shrink-0">
                      <span className="text-xs font-bold text-gray-400">住所</span>
                    </div>
                    <div className="flex-1 flex items-start gap-2">
                      <MapPin size={16} className="text-orange-500 shrink-0 mt-0.5" />
                      <span className="text-sm font-bold text-gray-700">{selectedShop.address || '住所情報なし'}</span>
                    </div>
                  </div>
                  
                  {/* 営業時間 */}
                  <div className="flex items-start px-5 py-4">
                    <div className="w-20 shrink-0">
                      <span className="text-xs font-bold text-gray-400">営業時間</span>
                    </div>
                    <div className="flex-1 flex items-start gap-2">
                      <Clock size={16} className="text-orange-500 shrink-0 mt-0.5" />
                      <OpeningHoursDisplay openingHours={selectedShop.opening_hours} />
                    </div>
                  </div>
                  
                  {/* 電話番号 */}
                  <div className="flex items-start px-5 py-4">
                    <div className="w-20 shrink-0">
                      <span className="text-xs font-bold text-gray-400">電話番号</span>
                    </div>
                    <div className="flex-1">
                      {selectedShop.phone ? (
                        <a href={`tel:${selectedShop.phone}`} className="text-sm font-black text-blue-600 flex items-center gap-2">
                          <Phone size={16} />
                          {selectedShop.phone}
                        </a>
                      ) : (
                        <span className="text-sm font-bold text-gray-400">電話番号不明</span>
                      )}
                    </div>
                  </div>
                  
                  {/* 予算 */}
                  <div className="flex items-start px-5 py-4">
                    <div className="w-20 shrink-0">
                      <span className="text-xs font-bold text-gray-400">予算</span>
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-black text-gray-700">{selectedShop.price_range || '予算情報なし'}</span>
                    </div>
                  </div>
                  
                  {/* カテゴリ */}
                  <div className="flex items-start px-5 py-4">
                    <div className="w-20 shrink-0">
                      <span className="text-xs font-bold text-gray-400">ジャンル</span>
                    </div>
                    <div className="flex-1">
                      <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded text-xs font-black">{selectedShop.category_main}</span>
                    </div>
                  </div>
                  
                  {/* 閲覧数（あれば） */}
                  {selectedShop.view_count && selectedShop.view_count > 0 && (
                    <div className="flex items-start px-5 py-4">
                      <div className="w-20 shrink-0">
                        <span className="text-xs font-bold text-gray-400">閲覧数</span>
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <TrendingUp size={16} className="text-rose-500" />
                        <span className="text-sm font-black text-gray-700">{selectedShop.view_count}回</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <h3 className="text-xl font-black mb-5 italic flex items-center gap-2"><UtensilsCrossed size={22} className="text-orange-500" /> Recommendation</h3>
              <div className="grid gap-4">
                {selectedShop.menu_items?.map((item, i) => {
                  const [name, price, ...imgParts] = item.split(':');
                  const img = imgParts.join(':');
                  return (
                    <div key={i} className="flex gap-4 p-3 bg-white border border-gray-100 rounded-[1.8rem] shadow-sm items-center">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 shrink-0 relative">
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-300 font-bold">No Image</div>
                        {img && <img src={img} className="absolute inset-0 w-full h-full object-cover z-10" alt={name} onError={(e) => e.currentTarget.style.display = 'none'} />}
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-sm text-gray-800 mb-1">{name}</p>
                        <p className="text-lg font-black text-orange-600"><span className="text-[10px]">¥</span>{Number(price).toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* ルート検索セクション */}
              <div className="mt-8 mb-8 p-6 bg-gradient-to-r from-orange-50 to-red-50 rounded-[2rem] border border-orange-100">
                <h3 className="text-lg font-black mb-4 flex items-center gap-2 text-gray-900">
                  <Navigation size={20} className="text-orange-500" /> ルート検索
                </h3>
                
                {!currentLocation ? (
                  <button
                    onClick={() => getCurrentLocation()}
                    disabled={routeLoading}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white py-4 rounded-[1.5rem] font-black text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {routeLoading ? (
                      <>
                        <div className="animate-spin">📍</div>
                        <span>位置情報取得中...</span>
                      </>
                    ) : (
                      <>
                        <MapPin size={18} />
                        <span>現在地を取得</span>
                      </>
                    )}
                  </button>
                ) : (
                  <>
                    {/* 移動手段選択 */}
                    <div className="flex gap-2 mb-4">
                      {[
                        { mode: 'walking' as const, label: '徒歩', icon: '🚶' },
                        { mode: 'driving' as const, label: '車', icon: '🚗' },
                        { mode: 'transit' as const, label: '公共交通', icon: '🚌' }
                      ].map(({ mode, label, icon }) => (
                        <button
                          key={mode}
                          onClick={() => setRouteMode(mode)}
                          className={`flex-1 py-2 rounded-xl font-black text-xs transition-all ${
                            routeMode === mode
                              ? 'bg-orange-500 text-white shadow-md'
                              : 'bg-white text-gray-600 border border-gray-200'
                          }`}
                        >
                          {icon} {label}
                        </button>
                      ))}
                    </div>

                    {/* ルート情報サマリー */}
                    {routeData && showRoute && (
                      <div className="bg-white p-4 rounded-[1.5rem] mb-4 border border-orange-200 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-gray-500">所要時間</span>
                          <span className="text-lg font-black text-orange-600">{routeData.duration.text}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-500">距離</span>
                          <span className="text-lg font-black text-gray-900">{routeData.distance.text}</span>
                        </div>
                      </div>
                    )}

                    {/* ルート検索ボタン */}
                    <button
                      onClick={searchRoute}
                      disabled={routeLoading}
                      className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white py-4 rounded-[1.5rem] font-black text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 mb-3"
                    >
                      {routeLoading ? (
                        <>
                          <div className="animate-spin">🔍</div>
                          <span>検索中...</span>
                        </>
                      ) : (
                        <>
                          <Navigation size={18} />
                          <span>ルートを検索</span>
                        </>
                      )}
                    </button>

                    {/* Googleマップアプリで開くボタン */}
                    {routeData && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&origin=${currentLocation.lat},${currentLocation.lng}&destination=${selectedShop.latitude},${selectedShop.longitude}&travelmode=${routeMode}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-gray-900 hover:bg-gray-800 text-white py-4 rounded-[1.5rem] font-black text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <Map size={18} />
                        <span>Googleマップアプリで開く</span>
                      </a>
                    )}
                  </>
                )}
              </div>

              <a href={`https://www.google.com/maps/search/?api=1&query=${selectedShop.latitude},${selectedShop.longitude}`} target="_blank" rel="noopener noreferrer" className="mt-10 flex items-center justify-center gap-2 w-full bg-orange-500 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl active:scale-95 transition-all">
                <MapPin size={20} /> ここに行く
              </a>
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .leaflet-top.leaflet-left { top: 12px !important; }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-in.slide-in-from-bottom { animation: slide-up 0.3s ease-out; }
      `}      </style>
      
      {/* 下部ナビゲーション */}
      <BottomNavigation />
    </div>
  )
}
