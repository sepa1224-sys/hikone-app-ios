'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  GraduationCap, 
  Music, 
  Palette, 
  Dumbbell, 
  Languages, 
  Code,
  ChefHat,
  Camera,
  ChevronLeft,
  MapPin,
  ExternalLink,
  Search,
  Clock
} from 'lucide-react'
import BottomNavigation from '@/components/BottomNavigation'

// 習い事カテゴリー
const LEARNING_CATEGORIES = [
  { id: 'music', name: '音楽', icon: Music, color: 'bg-pink-500', bgLight: 'bg-pink-50', textColor: 'text-pink-600' },
  { id: 'art', name: '芸術 工芸', icon: Palette, color: 'bg-purple-500', bgLight: 'bg-purple-50', textColor: 'text-purple-600' },
  { id: 'sports', name: 'スポーツ', icon: Dumbbell, color: 'bg-orange-500', bgLight: 'bg-orange-50', textColor: 'text-orange-600' },
  { id: 'language', name: '語学', icon: Languages, color: 'bg-blue-500', bgLight: 'bg-blue-50', textColor: 'text-blue-600' },
  { id: 'programming', name: 'プログラミング', icon: Code, color: 'bg-emerald-500', bgLight: 'bg-emerald-50', textColor: 'text-emerald-600' },
  { id: 'cooking', name: '料理', icon: ChefHat, color: 'bg-red-500', bgLight: 'bg-red-50', textColor: 'text-red-600' },
  { id: 'photography', name: '写真', icon: Camera, color: 'bg-gray-600', bgLight: 'bg-gray-50', textColor: 'text-gray-600' },
  { id: 'others', name: 'その他', icon: GraduationCap, color: 'bg-yellow-500', bgLight: 'bg-yellow-50', textColor: 'text-yellow-600' },
]

// サンプルの習い事データ（将来的にはDBから取得）
const SAMPLE_SCHOOLS = [
  {
    id: 1,
    name: 'ヤマハ音楽教室 彦根センター',
    category: 'music',
    description: 'ピアノ エレクトーン ギターなど',
    address: '彦根市大東町',
    schedule: '月〜土 10:00-20:00',
    url: 'https://www.yamaha.com/'
  },
  {
    id: 2,
    name: '彦根市立図書館 読書会',
    category: 'others',
    description: '月1回の読書会 文化講座',
    address: '彦根市尾末町',
    schedule: '毎月第2土曜 14:00-',
    url: 'https://www.city.hikone.lg.jp/'
  },
  {
    id: 3,
    name: 'コナミスポーツクラブ 彦根',
    category: 'sports',
    description: 'ジム スイミング スタジオプログラム',
    address: '彦根市高宮町',
    schedule: '月〜日 10:00-22:00',
    url: 'https://www.konami.com/sportsclub/'
  },
  {
    id: 4,
    name: 'ECCジュニア 彦根教室',
    category: 'language',
    description: '子供向け英会話 英検対策',
    address: '彦根市平田町',
    schedule: '月〜金 15:00-20:00',
    url: 'https://www.eccjr.co.jp/'
  },
]

export default function LearningPage() {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // カテゴリーでフィルタリング
  const filteredSchools = SAMPLE_SCHOOLS.filter(school => {
    if (selectedCategory && school.category !== selectedCategory) return false
    if (searchQuery && !school.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  // カテゴリー情報を取得
  const getCategoryInfo = (categoryId: string) => {
    return LEARNING_CATEGORIES.find(c => c.id === categoryId) || LEARNING_CATEGORIES[7]
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 shadow-sm">
        <div className="max-w-md mx-auto">
          {/* 戻るボタンとタイトル */}
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => router.push('/living')}
              className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center active:scale-95 transition-all"
            >
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg font-black text-gray-900">習い事</h1>
              <p className="text-[10px] font-bold text-gray-400">教室 スクール情報</p>
            </div>
          </div>

          {/* 検索バー */}
          <div className="bg-gray-50 rounded-full flex items-center p-2.5 px-4 gap-3 border border-gray-200">
            <Search size={16} className="text-gray-400" />
            <input 
              type="text" 
              placeholder="教室名で検索" 
              className="text-xs font-bold outline-none w-full bg-transparent text-gray-800"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-md mx-auto px-4 py-4 space-y-5">
          
          {/* カテゴリーフィルター */}
          <section>
            <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  selectedCategory === null
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                すべて
              </button>
              {LEARNING_CATEGORIES.map((cat) => {
                const Icon = cat.icon
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                      selectedCategory === cat.id
                        ? `${cat.color} text-white`
                        : `${cat.bgLight} ${cat.textColor} border ${cat.textColor.replace('text', 'border')}`
                    }`}
                  >
                    <Icon size={14} />
                    {cat.name}
                  </button>
                )
              })}
            </div>
          </section>

          {/* 教室リスト */}
          <section>
            <p className="text-[10px] font-bold text-gray-400 mb-3">
              {filteredSchools.length}件の教室が見つかりました
            </p>
            <div className="space-y-3">
              {filteredSchools.map((school) => {
                const catInfo = getCategoryInfo(school.category)
                const Icon = catInfo.icon
                return (
                  <button
                    key={school.id}
                    onClick={() => window.open(school.url, '_blank')}
                    className="w-full bg-white border border-gray-100 rounded-2xl p-4 text-left active:scale-[0.98] transition-all shadow-sm hover:shadow-md"
                  >
                    <div className="flex gap-3">
                      {/* アイコン */}
                      <div className={`w-12 h-12 ${catInfo.bgLight} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <Icon size={24} className={catInfo.textColor} />
                      </div>
                      
                      {/* 情報 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-gray-800 truncate">
                            {school.name}
                          </p>
                          <ExternalLink size={12} className="text-gray-300 flex-shrink-0" />
                        </div>
                        <p className="text-[11px] font-bold text-gray-500 mt-0.5">
                          {school.description}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
                            <MapPin size={10} />
                            {school.address}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
                            <Clock size={10} />
                            {school.schedule}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {/* 彦根市公民館へのリンク */}
          <section>
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
                  📚
                </div>
                <div className="flex-1">
                  <p className="text-base font-black">彦根市公民館講座</p>
                  <p className="text-[11px] font-bold text-white/80 mt-1">
                    市内各公民館で開催される<br/>講座やイベント情報をチェック
                  </p>
                  <button
                    onClick={() => window.open('https://www.city.hikone.lg.jp/shisetsu/kouminkan/index.html', '_blank')}
                    className="mt-3 px-4 py-2 bg-white text-purple-600 rounded-full text-xs font-black flex items-center gap-1.5 active:scale-95 transition-all"
                  >
                    <ExternalLink size={12} />
                    詳しく見る
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* 準備中のお知らせ */}
          <section>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-xs font-bold text-yellow-700 text-center">
                🚧 このページは現在準備中です<br/>
                <span className="text-[10px] font-normal text-yellow-600">
                  今後、地域の教室情報を充実させていきます
                </span>
              </p>
            </div>
          </section>

        </div>
      </div>

      {/* 下部ナビゲーション */}
      <BottomNavigation />
    </div>
  )
}
