'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ShoppingBag, 
  Building2, 
  GraduationCap, 
  ChevronRight,
  MapPin,
  ExternalLink,
  Sparkles,
  Heart
} from 'lucide-react'
import BottomNavigation from '@/components/BottomNavigation'
import { useAuth } from '@/components/AuthProvider'

// カテゴリーの定義
const LIVING_CATEGORIES = [
  {
    id: 'shopping',
    name: '買い物',
    description: 'スーパー コンビニ ドラッグストアなど',
    icon: ShoppingBag,
    color: 'from-blue-500 to-blue-600',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-200',
    href: '/kaimono',
    isExternal: false
  },
  {
    id: 'government',
    name: '行政',
    description: '彦根市役所 公共サービス 届出など',
    icon: Building2,
    color: 'from-emerald-500 to-emerald-600',
    bgLight: 'bg-emerald-50',
    textColor: 'text-emerald-600',
    borderColor: 'border-emerald-200',
    href: 'https://www.city.hikone.lg.jp/',
    isExternal: true
  },
  {
    id: 'learning',
    name: '習い事',
    description: '教室 スクール カルチャーセンターなど',
    icon: GraduationCap,
    color: 'from-purple-500 to-purple-600',
    bgLight: 'bg-purple-50',
    textColor: 'text-purple-600',
    borderColor: 'border-purple-200',
    href: '/learning',
    isExternal: false
  },
]

// おすすめ情報
const FEATURED_ITEMS = [
  {
    id: 1,
    title: '彦根市ゴミ出しカレンダー',
    description: 'お住まいのエリアに合わせた収集日をチェック',
    icon: '🗑️',
    href: '/',
    tag: '便利'
  },
  {
    id: 2,
    title: '市民向け各種届出',
    description: '転入届 婚姻届 住民票の取得など',
    icon: '📝',
    href: 'https://www.city.hikone.lg.jp/kurashi_tetsuzuki/index.html',
    tag: '行政',
    isExternal: true
  },
  {
    id: 3,
    title: '彦根市公民館講座',
    description: '地域で開催される習い事や講座情報',
    icon: '📚',
    href: 'https://www.city.hikone.lg.jp/shisetsu/kouminkan/index.html',
    tag: '習い事',
    isExternal: true
  },
]

export default function LivingPage() {
  const router = useRouter()
  const { profile: authProfile } = useAuth()
  const [userCity, setUserCity] = useState<string | null>(null)
  
  // ユーザーの登録都市を取得
  useEffect(() => {
    if (authProfile?.city) {
      setUserCity(authProfile.city)
    }
  }, [authProfile])

  // カテゴリーカードをクリック
  const handleCategoryClick = (category: typeof LIVING_CATEGORIES[0]) => {
    if (category.isExternal) {
      window.open(category.href, '_blank', 'noopener,noreferrer')
    } else {
      router.push(category.href)
    }
  }

  // おすすめアイテムをクリック
  const handleFeaturedClick = (item: typeof FEATURED_ITEMS[0]) => {
    if (item.isExternal) {
      window.open(item.href, '_blank', 'noopener,noreferrer')
    } else {
      router.push(item.href)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100 px-5 py-4 shadow-sm">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-gray-900">暮らし</h1>
              <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                {userCity ? `${userCity}での生活をサポート` : '地域の暮らしをサポート'}
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-full">
              <MapPin size={12} className="text-red-500" />
              <span className="text-[10px] font-bold text-red-600">
                {userCity || '彦根市'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-md mx-auto px-4 py-5 space-y-6">
          
          {/* カテゴリーカード */}
          <section>
            <h2 className="text-sm font-black text-gray-800 mb-3 flex items-center gap-2">
              <Sparkles size={14} className="text-yellow-500" />
              カテゴリー
            </h2>
            <div className="space-y-3">
              {LIVING_CATEGORIES.map((category) => {
                const Icon = category.icon
                return (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryClick(category)}
                    className={`w-full ${category.bgLight} ${category.borderColor} border-2 rounded-2xl p-5 flex items-center gap-4 active:scale-[0.98] transition-all shadow-sm hover:shadow-md`}
                  >
                    {/* アイコン */}
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center shadow-lg`}>
                      <Icon size={28} className="text-white" />
                    </div>
                    
                    {/* テキスト */}
                    <div className="flex-1 text-left">
                      <p className={`text-lg font-black ${category.textColor}`}>
                        {category.name}
                      </p>
                      <p className="text-[11px] font-bold text-gray-500 mt-0.5">
                        {category.description}
                      </p>
                    </div>
                    
                    {/* 矢印 or 外部リンク */}
                    <div className={`w-8 h-8 rounded-full ${category.bgLight} flex items-center justify-center`}>
                      {category.isExternal ? (
                        <ExternalLink size={16} className={category.textColor} />
                      ) : (
                        <ChevronRight size={18} className={category.textColor} />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {/* おすすめ情報 */}
          <section>
            <h2 className="text-sm font-black text-gray-800 mb-3 flex items-center gap-2">
              <Heart size={14} className="text-red-500" />
              おすすめ情報
            </h2>
            <div className="space-y-2">
              {FEATURED_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleFeaturedClick(item)}
                  className="w-full bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3 active:scale-[0.98] transition-all shadow-sm hover:shadow-md"
                >
                  {/* アイコン */}
                  <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-2xl">
                    {item.icon}
                  </div>
                  
                  {/* テキスト */}
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black text-gray-800">
                        {item.title}
                      </p>
                      <span className="px-2 py-0.5 bg-gray-100 rounded-full text-[9px] font-bold text-gray-500">
                        {item.tag}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                      {item.description}
                    </p>
                  </div>
                  
                  {/* 矢印 */}
                  <ChevronRight size={16} className="text-gray-300" />
                </button>
              ))}
            </div>
          </section>

          {/* 地域情報バナー */}
          <section>
            <div className="bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl p-5 text-white shadow-lg">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-3xl">
                  🏯
                </div>
                <div className="flex-1">
                  <p className="text-lg font-black">彦根市公式サイト</p>
                  <p className="text-[11px] font-bold text-white/80 mt-1">
                    最新の市政情報やイベント、<br/>防災情報をチェック
                  </p>
                  <button
                    onClick={() => window.open('https://www.city.hikone.lg.jp/', '_blank')}
                    className="mt-3 px-4 py-2 bg-white text-red-500 rounded-full text-xs font-black flex items-center gap-1.5 active:scale-95 transition-all"
                  >
                    <ExternalLink size={12} />
                    公式サイトを開く
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* 緊急連絡先 */}
          <section>
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <h3 className="text-xs font-black text-gray-700 mb-3">緊急連絡先</h3>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href="tel:119"
                  className="flex items-center gap-2 p-3 bg-red-50 rounded-xl"
                >
                  <span className="text-lg">🚒</span>
                  <div>
                    <p className="text-[10px] font-bold text-gray-500">消防 救急</p>
                    <p className="text-sm font-black text-red-600">119</p>
                  </div>
                </a>
                <a
                  href="tel:110"
                  className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl"
                >
                  <span className="text-lg">👮</span>
                  <div>
                    <p className="text-[10px] font-bold text-gray-500">警察</p>
                    <p className="text-sm font-black text-blue-600">110</p>
                  </div>
                </a>
                <a
                  href="tel:0749-22-1411"
                  className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl col-span-2"
                >
                  <span className="text-lg">🏢</span>
                  <div>
                    <p className="text-[10px] font-bold text-gray-500">彦根市役所</p>
                    <p className="text-sm font-black text-emerald-600">0749-22-1411</p>
                  </div>
                </a>
              </div>
            </div>
          </section>

        </div>
      </div>

      {/* 下部ナビゲーション */}
      <BottomNavigation />
    </div>
  )
}
