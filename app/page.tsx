'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Sun, Send, X, UserCircle, Sparkles, Building2, Map as MapIcon, 
  ChevronRight, LogOut, Edit, Mail, MapPin, User, Search,
  Cloud, CloudRain, CloudSun, Droplets, Wind, Ticket, Gift, CalendarDays, PartyPopper, ShoppingBag,
  Camera, Trophy, Target, CheckCircle, Star, Coffee, Utensils, Castle, Mountain, 
  Heart, ShoppingCart, Bike, Upload, Award, MessageSquare, Activity, Footprints, Stamp
} from 'lucide-react'
import ProfileRegistrationModal from '@/components/ProfileRegistrationModal'
import ChatRegistration from '@/components/ChatRegistration'
import BottomNavigation from '@/components/BottomNavigation'
import WasteScheduleCard, { HikoneWasteMaster } from '@/components/home/WasteScheduleCard'
import { useWasteSchedule, prefetchWasteSchedule } from '@/lib/hooks/useWasteSchedule'
import { usePoints } from '@/lib/hooks/usePoints'
import { useMunicipalityStats } from '@/lib/hooks/useMunicipalityStats'
import { formatFullLocation, isSupportedCity, UNSUPPORTED_AREA_MESSAGE } from '@/lib/constants/shigaRegions'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import { HomeSkeleton, Skeleton } from '@/components/Skeleton'
import { HIKONYAN_IMAGE } from '@/lib/constants/images'
import { 
  cityData, HOURLY_WEATHER, COUPONS, EVENTS,
  ALL_PREFECTURES, PREFECTURE_CITIES, HIKONE_AREAS, PREFECTURES, COUNTRIES 
} from '@/lib/constants/appData'

import { getMissions, Mission, getUserMissionStatus } from '@/lib/actions/missions'
import MissionStampCard from '@/components/mission/MissionStampCard'
import MissionModal from '@/components/mission/MissionModal'

export default function AppHome() {
  const pathname = usePathname()
  const router = useRouter()
  
  // マンスリーミッション
  const [activeTab, setActiveTab] = useState<'current' | 'next'>('current')
  const [currentMissions, setCurrentMissions] = useState<Mission[]>([])
  const [nextMissions, setNextMissions] = useState<Mission[]>([])
  const [userMissionStatuses, setUserMissionStatuses] = useState<Record<string, string>>({})
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null)
  const [missionModalOpen, setMissionModalOpen] = useState(false)

  // ミッションステータスを更新する関数
  const refreshMissionStatus = async () => {
    const statusResult = await getUserMissionStatus()
    if (statusResult.success && statusResult.data) {
      setUserMissionStatuses(statusResult.data)
    }
  }

  useEffect(() => {
    const now = new Date()
    const getMonthStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    
    const currentMonth = getMonthStr(now)
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const nextMonth = getMonthStr(nextMonthDate)

    // 今月のミッション取得
    getMissions(currentMonth).then(result => {
      if (result.success && result.data) {
        setCurrentMissions(result.data)
      }
    })

    // 来月のミッション取得
    getMissions(nextMonth).then(result => {
      if (result.success && result.data) {
        setNextMissions(result.data)
      }
    })
    
    // ステータス取得
    refreshMissionStatus()
  }, [])

  const displayMissions = activeTab === 'current' ? currentMissions : nextMissions

  const { session, user: authUser, profile: authProfile, refreshProfile, loading: authLoading } = useAuth()
  
  // マウント済みフラグ（ハイドレーションエラー防止）
  const [isMounted, setIsMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  // 強制表示フラグ（0.5秒後に強制的に表示）
  const [forceShow, setForceShow] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    setLoading(false)
    setProfileChecked(true)
    
    // 0.5秒後に強制表示
    const timer = setTimeout(() => {
      setForceShow(true)
    }, 500)
    
    return () => clearTimeout(timer)
  }, [])

  const [view, setView] = useState<'main' | 'profile'>('main')
  
  
  
  
  
  // プロフィール情報
  const [profile, setProfile] = useState<any>(null)

  // authProfile 監視を1つの useEffect に統合（ステート更新回数を削減）
  useEffect(() => {
    // ロード中は判定しない
    if (authLoading) return

    // 1. authProfile の同期
    if (authProfile) {
      setProfile(authProfile)
      setUserCity(authProfile.city || null)
      setUserSelectedArea(authProfile.selected_area || authProfile.detail_area || null)
      setShowUnsupportedAreaModal(authProfile.city ? !isSupportedCity(authProfile.city) : false)
      setProfileChecked(true)
    } else if (!authUser) {
      setProfile(null)
      setUserCity(null)
      setUserSelectedArea(null)
      setShowUnsupportedAreaModal(false)
      setProfileChecked(true)
    }

    // 2. プロフィールモーダル判定（is_student 等）
    // authLoadingがfalseで、authUserが存在し、かつauthProfileが完全に取得できていない場合のみ表示
    if (view === 'main' && authUser && !authLoading) {
      // プロフィールが存在しない、または必須項目が欠けている場合
      const isProfileIncomplete = !authProfile || 
        (authProfile.is_student === null || authProfile.is_student === undefined) ||
        !authProfile.full_name ||
        (!authProfile.birthday && !authProfile.location)
      
      if (isProfileIncomplete) {
        // 少し遅延させてから表示判定を行う（非同期データ整合のため）
        const timer = setTimeout(() => {
          setShowProfileModal(true)
        }, 1000)
        return () => clearTimeout(timer)
      }
    }
  }, [authProfile, authUser, view, authLoading])

  const [mode, setMode] = useState<'local' | 'tourist'>('local') 
  const handleToggleMode = () => {
    setMode(prev => prev === 'local' ? 'tourist' : 'local')
  }
  const [selectedCityId, setSelectedCityId] = useState<string>('hikone')
  const [isCitySelectorOpen, setIsCitySelectorOpen] = useState(false)
  const [tempPref, setTempPref] = useState<string | null>(null)
  const [citySearchQuery, setCitySearchQuery] = useState<string>('')
  const [selectedDestinationName, setSelectedDestinationName] = useState<string>('')
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([{ role: 'ai', text: '何かお手伝いするニャ？' }])
  const [isChatLoading, setIsChatLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // チャット送信処理
  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return

    const userMessage = { role: 'user', text: chatInput }
    setMessages(prev => [...prev, userMessage])
    setChatInput('') // 入力欄を空にする
    setIsChatLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.text }),
      })

      const data = await response.json()

      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        const aiText = data.candidates[0].content.parts[0].text
        setMessages(prev => [...prev, { role: 'ai', text: aiText }])
      } else {
        setMessages(prev => [...prev, { role: 'ai', text: 'ごめんニャ、うまく聞き取れなかったニャ...' }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'エラーが発生したニャ。少し時間を置いてまた送ってニャ！' }])
    } finally {
      setIsChatLoading(false)
    }
  }

  // チャットの自動スクロール
  useEffect(() => {
    if (isChatOpen) {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isChatOpen])
  
  // 経路検索用のステート
  const [startPoint, setStartPoint] = useState<string>('彦根駅')
  const [goalPoint, setGoalPoint] = useState<string>('京都駅')
  const [departureDateTime, setDepartureDateTime] = useState<string>(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  })
  const [routes, setRoutes] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
  // プロフィール登録モーダル用のステート
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileChecked, setProfileChecked] = useState(false)
  
  const [profileLoading, setProfileLoading] = useState(false)
  
  // ユーザーの登録都市（ホーム画面のパーソナライズ用）
  const [userCity, setUserCity] = useState<string | null>(null)
  // ユーザーの選択エリア（profiles.selected_area）
  const [userSelectedArea, setUserSelectedArea] = useState<string | null>(null)
  // エリア未対応ガード用のステート（ログイン済みかつ対応エリア外の場合に表示）
  const [showUnsupportedAreaModal, setShowUnsupportedAreaModal] = useState(false)
  
  // SWRでゴミ収集スケジュールをキャッシュ付きで取得
  // ※ userSelectedArea が変更されると、SWRのキーが変わり自動的に再フェッチされる
  const { wasteSchedule: swrWasteSchedule, isLoading: wasteLoading, error: wasteError, refetch: refetchWaste } = useWasteSchedule(userSelectedArea)
  
  // SWRでポイント情報をキャッシュ付きで取得
  const { points: userPoints, referralCode, isLoading: pointsLoading, error: pointsError, refetch: refetchPoints } = usePoints(authUser?.id ?? null)
  
  // SWRで自治体の人口 登録者数を取得（authUser?.idを渡して自分がカウントに含まれているか確認）
  // ※ userCity が変更されると、SWRのキーが変わり自動的に再フェッチされる
  const { stats: municipalityStats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useMunicipalityStats(userCity, authUser?.id)
  


  // フォトコンテストイベント（events テーブルから取得）
  const [activeEvent, setActiveEvent] = useState<{
    id: string
    title: string
    prize_amount: number
    end_date: string
  } | null>(null)
  
  // ミッション達成数の計算
  const completedCount = (displayMissions || []).filter(m => userMissionStatuses[m.id] === 'approved').length

  const currentCity = cityData[selectedCityId] || cityData['hikone']

  // レンダリング条件の緩和：isMountedのみチェックし、スケルトン表示を廃止して即座に表示
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-blue-50/30 flex items-center justify-center">
        <div className="animate-pulse text-gray-400 font-bold text-sm">Loading...</div>
      </div>
    )
  }

  // 統計データの存在チェックを強化
  const safeStats = municipalityStats || {
    municipalityName: userCity || '彦根市',
    population: 110489,
    registeredUsers: 0,
    totalAppUsers: 0,
    mascotName: 'ひこにゃん',
    populationUpdatedAt: null
  }

  return (
    <div className="h-screen bg-blue-50/30 font-sans flex flex-col text-gray-800 tracking-tight overflow-hidden">
      
      {/* エラー表示 */}
      <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none">
        <div className="max-w-xl mx-auto p-2">
          {(statsError || wasteError || pointsError) && (
            <div className="bg-red-600 text-white p-4 rounded-xl shadow-2xl border-4 border-white animate-bounce pointer-events-auto">
              <h3 className="font-black text-lg mb-2 flex items-center gap-2">
                <X className="bg-white text-red-600 rounded-full" size={20} />
                エラーが発生したニャ！
              </h3>
              <div className="text-xs font-bold space-y-1 overflow-auto max-h-40">
                {statsError && <p>📊 Stats: {statsError.message || JSON.stringify(statsError)}</p>}
                {wasteError && <p>🗑️ Waste: {wasteError.message || JSON.stringify(wasteError)}</p>}
                {pointsError && <p>💰 Points: {pointsError.message || JSON.stringify(pointsError)}</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- ヘッダー：コンパクト化したスイッチ --- */}
      <div className="bg-white/90 backdrop-blur-md px-4 py-2 border-b border-gray-100 shadow-sm z-[110]">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <div 
            onClick={() => setIsChatOpen(true)}
            className="flex-1 bg-gray-100 rounded-xl px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-gray-200 transition-colors"
          >
            <img src={HIKONYAN_IMAGE} className="w-5 h-5" />
            <span className="text-[11px] font-bold text-gray-400">ひこにゃんAIに質問...</span>
          </div>
          
          {/* ポイントバッジ（読み込み中は個別スケルトン） */}
          {authUser && (
            <div 
              onClick={() => router.push('/profile')}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-yellow-500 px-3 py-1.5 rounded-full cursor-pointer hover:from-amber-500 hover:to-yellow-600 transition-all shadow-sm active:scale-95"
            >
              <span className="text-sm">💰</span>
              <span className="text-xs font-black text-white min-w-[2rem]">
                {pointsLoading ? (
                  <span>読込中..</span>
                ) : (
                  userPoints.toLocaleString()
                )}
              </span>
              <span className="text-[10px] font-bold text-white/80">pt</span>
            </div>
          )}

          {/* スライドスイッチ（コンパクト版） */}
          <div 
            onClick={handleToggleMode}
            className={`relative w-20 h-8 rounded-full p-1 cursor-pointer transition-colors duration-300 ${
              mode === 'local' ? 'bg-blue-500' : 'bg-orange-500'
            }`}
          >
            <div className={`w-6 h-6 bg-white rounded-full shadow-sm transform transition-transform duration-300 flex items-center justify-center ${
              mode === 'local' ? 'translate-x-0' : 'translate-x-12'
            }`}>
              {mode === 'local' ? <Building2 size={12} className="text-blue-500" /> : <MapIcon size={12} className="text-orange-500" />}
            </div>
            <div className="absolute inset-0 flex items-center justify-between px-2.5 text-[9px] font-black text-white pointer-events-none uppercase">
              <span className={mode === 'local' ? 'opacity-0' : 'opacity-100'}>観光</span>
              <span className={mode === 'local' ? 'opacity-100' : 'opacity-0'}>地元</span>
            </div>
          </div>
        </div>
      </div>

      {/* --- メインコンテンツ --- */}
      <main className="flex-1 overflow-y-auto p-6 pb-24">
        {/* 条件付きレンダリングを1箇所に集約（ガードなし） */}
        {view === 'main' && (
          /* ホームコンテンツ - 新UI */
          <div className="max-w-xl mx-auto animate-in fade-in duration-500 space-y-4">
            
            {/* 0. 市民カウンター（町ごとの登録者数 / その町の人口） + 会員番号 */}
            {/* 表示する自治体名: userCity（ログインユーザーの居住地）を優先、なければ municipalityStats.municipalityName、最終フォールバックは「彦根市」 */}
            {(() => {
              const displayCityName = userCity || safeStats.municipalityName || '彦根市'
              return (
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-4 shadow-lg">
                  {/* 上段：町ごとの登録者数 / その町の人口 */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <UserCircle size={24} className="text-white" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
                          {/* 自治体名を表示（userCityを優先） */}
                          {displayCityName}の仲間
                        </p>
                        <div className="text-lg font-black text-white">
                          {statsLoading ? (
                            <Skeleton width={80} height={24} className="bg-white/30 rounded" />
                          ) : (
                            <div className="flex items-baseline gap-1">
                              {/* 町ごとの登録者数 / その町の人口 */}
                              <span className="text-yellow-300">
                                {(safeStats?.registeredUsers || 0).toLocaleString()}
                              </span>
                              <span className="text-sm font-bold opacity-80">人</span>
                              <span className="mx-1 opacity-50">/</span>
                              {/* 人口が0の場合は「取得中」と表示、それ以外は人口を表示 */}
                              {(safeStats?.population || 0) > 0 ? (
                                <>
                                  <span>{(safeStats?.population || 0).toLocaleString()}</span>
                                  <span className="text-sm font-bold opacity-80">人</span>
                                </>
                              ) : (
                                <span className="text-sm opacity-70">取得中...</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {/* 自治体名を常に表示（userCityを優先） */}
                      <p className="text-xs font-black text-white/90">
                        {displayCityName}
                      </p>
                      {/* 普及率：その町の登録人数 ÷ その町の人口 */}
                      {!statsLoading && safeStats && (safeStats?.population || 0) > 0 && (
                        <p className="text-[10px] font-bold text-yellow-300">
                          {(() => {
                            const registered = safeStats?.registeredUsers || 0
                            const population = safeStats?.population || 1
                            const rate = (registered / population) * 100
                            return `普及率 ${rate.toFixed(3)}%`
                          })()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* 学生情報（学生の場合のみ表示） */}
            {authProfile?.is_student && (
              <Link href={`/school/${authProfile.school_id || 'unknown'}`} className="block group">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 shadow-sm border border-blue-100 flex items-center justify-between transition-all duration-200 group-hover:bg-white group-hover:shadow-md group-active:scale-[0.98]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                      <Award size={18} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider group-hover:text-blue-500 transition-colors">所属</p>
                      <p className="text-sm font-black text-gray-800">
                        {authProfile?.school_name} {authProfile?.grade ? `${authProfile.grade}年` : ''}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            )}
            
            {/* 0.5 支払いボタン（QR決済） */}
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => {
                  if (authUser) {
                    router.push('/pay')
                  } else {
                    return
                  }
                }}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-4 rounded-[2rem] font-black text-lg shadow-xl shadow-red-200/50 active:scale-[0.98] transition-all flex items-center justify-center gap-3 border-b-4 border-red-800"
              >
                <div className="bg-white/20 p-2 rounded-full">
                  <Camera size={24} />
                </div>
                <span>ひこポで払う</span>
                <Sparkles size={16} className="animate-pulse" />
              </button>
            </div>

            {/* 1. ゴミ収集情報カード（独立コンポーネント） */}
            <WasteScheduleCard
              userCity={userCity}
              userSelectedArea={userSelectedArea}
              userWasteSchedule={swrWasteSchedule}
              onSetupClick={() => setView('profile')}
            />

            {/* 1.5. 暮らしセクション：ランニング ウォーキングアクションカード */}
            {mode === 'local' && (
              <div className="bg-white rounded-[2rem] p-5 shadow-lg border border-gray-100 relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 size={18} className="text-blue-500" />
                  <h2 className="text-sm font-black text-gray-800">暮らし</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {/* ランニング開始ボタン */}
                  <Link
                    href="/running"
                    className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden cursor-pointer active:scale-[0.98] transition-all group no-underline block z-20"
                  >
                    <div className="absolute -right-4 -bottom-4 opacity-20">
                      <Activity size={60} className="text-white rotate-12" />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity size={24} className="text-white" />
                        <span className="text-lg font-black">ランニング開始</span>
                      </div>
                      <p className="text-xs font-bold opacity-90">運動を記録しよう</p>
                    </div>
                  </Link>

                  {/* ウォーキング開始ボタン */}
                  <Link
                    href="/running"
                    className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden cursor-pointer active:scale-[0.98] transition-all group no-underline block z-20"
                  >
                    <div className="absolute -right-4 -bottom-4 opacity-20">
                      <Footprints size={60} className="text-white rotate-12" />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-2">
                        <Footprints size={24} className="text-white" />
                        <span className="text-lg font-black">ウォーキング開始</span>
                      </div>
                      <p className="text-xs font-bold opacity-90">歩数を記録しよう</p>
                    </div>
                  </Link>
                </div>
              </div>
            )}

            {/* 2. フォトコンテストバナー */}
            {activeEvent && (
              <div 
                onClick={() => {
                  if (authUser) {
                    router.push('/event')
                  } else {
                    return
                  }
                }}
                className="relative bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 rounded-[2rem] p-5 text-white shadow-xl overflow-hidden cursor-pointer active:scale-[0.98] transition-all group"
              >
                {/* 背景装飾 */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                  <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-xl" />
                  <Camera size={100} className="absolute -right-4 -bottom-4 text-white/10 rotate-12" />
                </div>
                
                {/* コンテンツ */}
                <div className="relative z-10">
                  {/* 賞金バッジ */}
                  <div className="inline-flex items-center gap-1.5 bg-yellow-400 text-yellow-900 px-3 py-1.5 rounded-full font-black text-sm mb-3 shadow-lg animate-pulse">
                    <Trophy size={14} />
                    賞金 ¥{activeEvent.prize_amount.toLocaleString()}
                    <Sparkles size={12} />
                  </div>
                  
                  <h3 className="text-lg font-black mb-1 drop-shadow-sm">
                    今週のフォトコンテスト
                  </h3>
                  <p className="text-sm font-bold opacity-90 mb-3">
                    お題：{activeEvent.title.replace('フォトコンテスト', '').replace('ベストショット', '').trim() || '彦根の魅力'}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold opacity-70">
                      〆切：{new Date(activeEvent.end_date).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}まで
                    </span>
                    <div className="flex items-center gap-1 bg-white/20 px-3 py-1.5 rounded-full text-xs font-black group-hover:bg-white/30 transition-colors">
                      <Camera size={14} />
                      参加する
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. マンスリー チャレンジセクション（新デザイン） */}
            {(displayMissions || []).length > 0 && (
              <div className="bg-white rounded-[2rem] p-5 shadow-lg border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-orange-500" />
                    <h3 className="font-bold text-gray-800">マンスリーミッション</h3>
                  </div>
                  <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button 
                      onClick={() => setActiveTab('current')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                        activeTab === 'current' 
                          ? 'bg-white text-orange-600 shadow-sm' 
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      今月
                    </button>
                    <button 
                      onClick={() => setActiveTab('next')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                        activeTab === 'next' 
                          ? 'bg-white text-blue-600 shadow-sm' 
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      来月
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  <MissionStampCard 
                    missions={displayMissions}
                    userId={authUser?.id || ''}
                    userMissionStatuses={userMissionStatuses}
                    onMissionSelect={(mission) => {
                      setSelectedMission(mission)
                      setMissionModalOpen(true)
                    }}
                    isNextMonth={activeTab === 'next'}
                  />
                </div>
              </div>
            )}

            {/* スタンプカード一覧へのリンク */}
            <Link href="/stamp/cards" className="block">
              <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-[2rem] p-5 text-white shadow-lg flex items-center justify-between active:scale-95 transition-transform">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-xl">
                    <Stamp size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">スタンプカード</h3>
                    <p className="text-xs font-bold opacity-80">集めたスタンプを確認しよう</p>
                  </div>
                </div>
                <ChevronRight size={24} className="opacity-80" />
              </div>
            </Link>

            {/* 4. 天気予報セクション */}
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[2rem] p-5 text-white shadow-xl relative overflow-hidden">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[10px] font-black uppercase opacity-80 mb-1">{userCity || '彦根市'}の天気</p>
                  <div className="flex items-end gap-2">
                    <p className="text-5xl font-black tracking-tighter">12°C</p>
                    <p className="text-lg font-bold mb-2 opacity-90">晴れ</p>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-sm opacity-80">
                    <span className="flex items-center gap-1"><Droplets size={14} /> 20%</span>
                    <span className="flex items-center gap-1"><Wind size={14} /> 3m/s</span>
                  </div>
                </div>
                <Sun size={70} className="text-yellow-300 opacity-90" />
              </div>
              
              {/* 時系列天気（横スクロール） */}
              <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-[10px] font-black uppercase opacity-70 mb-3">12時間予報</p>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                  {HOURLY_WEATHER.map((hour, idx) => {
                    const WeatherIcon = hour.icon
                    return (
                      <div key={idx} className="flex flex-col items-center min-w-[50px] bg-white/10 rounded-xl p-2">
                        <p className="text-[10px] font-bold opacity-80">{hour.time}</p>
                        <WeatherIcon size={20} className="my-1" />
                        <p className="text-sm font-black">{hour.temp}°</p>
                        {hour.precipitation > 0 && (
                          <p className="text-[9px] text-blue-200">{hour.precipitation}%</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* 5. クーポン バナーセクション */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Ticket size={16} className="text-orange-500" />
                  <h2 className="text-sm font-black text-gray-800">今日のクーポン</h2>
                </div>
                <button className="text-[10px] font-black text-orange-500">すべて見る</button>
              </div>
              
              {/* クーポン横スクロール */}
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                {COUPONS.map((coupon) => (
                  <div 
                    key={coupon.id} 
                    className={`min-w-[200px] bg-gradient-to-br ${coupon.color} rounded-2xl p-4 text-white shadow-lg relative overflow-hidden`}
                  >
                    <div className="absolute -right-4 -bottom-4 opacity-10">
                      <Gift size={60} />
                    </div>
                    <p className="text-[10px] font-bold opacity-80">{coupon.shop}</p>
                    <p className="text-xl font-black mb-1">{coupon.discount}</p>
                    <p className="text-[11px] font-bold opacity-90">{coupon.description}</p>
                    <p className="text-[9px] font-bold opacity-70 mt-2">{coupon.expires}</p>
                  </div>
                ))}
                {/* 広告枠プレースホルダー */}
                <div className="min-w-[200px] bg-gray-100 rounded-2xl p-4 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center">
                  <Sparkles size={24} className="text-gray-300 mb-2" />
                  <p className="text-[10px] font-black text-gray-400 text-center">あなたのお店の<br/>クーポンを掲載しませんか？</p>
                </div>
              </div>
            </div>

            {/* 6. イベント情報リスト */}
            <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CalendarDays size={18} className="text-purple-500" />
                  <h2 className="text-sm font-black text-gray-800">イベント情報</h2>
                </div>
                <button className="text-[10px] font-black text-purple-500">もっと見る</button>
              </div>
              
              <div className="space-y-3">
                {EVENTS.map((event) => {
                  const EventIcon = event.icon
                  return (
                    <div 
                      key={event.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
                        <EventIcon size={18} className="text-purple-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm text-gray-800 truncate">{event.title}</p>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold">
                          <span>{event.date}</span>
                          <span>•</span>
                          <span className="truncate">{event.location}</span>
                        </div>
                      </div>
                      <span className={`text-[9px] font-black px-2 py-1 rounded-full shrink-0 ${
                        event.category === 'お祭り' ? 'bg-orange-100 text-orange-600' :
                        event.category === 'イベント' ? 'bg-blue-100 text-blue-600' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {event.category}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ひこにゃんAI バナー */}
            <div 
              onClick={() => setIsChatOpen(true)}
              className="bg-gradient-to-r from-orange-500 to-red-500 rounded-[2rem] p-5 text-white shadow-xl relative overflow-hidden cursor-pointer active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-4">
                <img src={HIKONYAN_IMAGE} className="w-16 h-16 object-contain" alt="ひこにゃん" />
                <div>
                  <p className="font-black text-lg">困ったことがあったら</p>
                  <p className="text-sm font-bold opacity-90">ひこにゃんAIに聞いてニャ！</p>
                </div>
              </div>
              <Sparkles size={40} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20" />
            </div>

            {/* 街を良くする目安箱（お問い合わせ）ボタン */}
            <div 
              onClick={() => router.push('/contact')}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-[2rem] p-5 text-white shadow-xl relative overflow-hidden cursor-pointer active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                  <MessageSquare size={28} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-black text-lg">街を良くする目安箱</p>
                  <p className="text-sm font-bold opacity-90">アプリや街への提案 ご意見をお寄せください</p>
                </div>
                <ChevronRight size={24} className="text-white/60" />
              </div>
            </div>
          </div>
        )}
        
        {view === 'profile' && (
          !authUser ? null : (
            /* ログイン済みなら編集フォームを直接表示（ProfileEditView） */
            <div className="p-6 animate-in slide-in-from-bottom-4 max-w-xl mx-auto">
              {profileLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="animate-spin text-4xl mb-4">🐱</div>
                  <p className="font-black text-gray-400">読み込み中...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* プロフィール編集フォーム */}
                  <div className="bg-white rounded-[2.5rem] p-6 shadow-lg border border-gray-100 space-y-6">
                    <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                      <Edit size={24} className="text-orange-500" />
                      プロフィール編集
                    </h3>

                    {/* ユーザー名入力欄 */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 ml-2">
                        <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">ユーザー名</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full bg-gray-50 border-2 border-transparent rounded-[1.5rem] py-4 pl-14 pr-5 font-bold text-gray-700 focus:border-orange-400 focus:bg-white focus:outline-none transition-all text-sm"
                          placeholder="ユーザー名を入力"
                        />
                      </div>
                    </div>

                    {/* アイコン画像URL入力欄（オプション） */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 ml-2">
                        <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">アイコン画像URL（任意）</span>
                      </label>
                      <div className="relative">
                        <UserCircle className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                        <input
                          type="url"
                          value={avatarUrl}
                          onChange={(e) => setAvatarUrl(e.target.value)}
                          className="w-full bg-gray-50 border-2 border-transparent rounded-[1.5rem] py-4 pl-14 pr-5 font-bold text-gray-700 focus:border-orange-400 focus:bg-white focus:outline-none transition-all text-sm"
                          placeholder="https://example.com/avatar.png"
                        />
                      </div>
                      {avatarUrl && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <img 
                            src={avatarUrl} 
                            alt="プレビュー" 
                            className="w-12 h-12 rounded-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                          <span className="text-xs font-bold text-gray-500">プレビュー</span>
                        </div>
                      )}
                    </div>

                    {/* 居住地：都道府県選択 */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 ml-2">
                        <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">どこの街から来たのか教えてニャ！</span>
                      </label>
                      <p className="text-xs text-gray-500 font-bold ml-2 mb-2">まず都道府県を選んでニャ</p>
                      <div className="relative">
                        <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                        <select
                          value={prefecture}
                          onChange={(e) => {
                            setPrefecture(e.target.value)
                            // 都道府県が変更されたら市区町村とエリアをリセット
                            setCity('')
                            setSelectedArea('')
                          }}
                          className="w-full bg-gray-50 border-2 border-transparent rounded-[1.5rem] py-4 pl-14 pr-5 font-bold text-gray-700 focus:border-orange-400 focus:bg-white focus:outline-none transition-all text-sm appearance-none"
                        >
                          <option value="">都道府県を選択してください</option>
                          {PREFECTURES.map((pref) => (
                            <option key={pref} value={pref}>{pref}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* 居住地：市区町村選択（都道府県が選択されている場合のみ表示） */}
                    {prefecture && prefecture !== '海外' && PREFECTURE_CITIES[prefecture] && (
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 ml-2">
                          <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                          <span className="text-xs font-black text-gray-400 uppercase tracking-widest">市区町村を選んでニャ</span>
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                          <select
                            value={city}
                            onChange={(e) => {
                              setCity(e.target.value)
                              // 彦根市以外に変更された場合はエリアをリセット
                              if (e.target.value !== '彦根市') {
                                setSelectedArea('')
                              }
                            }}
                            className="w-full bg-gray-50 border-2 border-transparent rounded-[1.5rem] py-4 pl-14 pr-5 font-bold text-gray-700 focus:border-orange-400 focus:bg-white focus:outline-none transition-all text-sm appearance-none"
                            required
                          >
                            <option value="">市区町村を選択してください</option>
                            {PREFECTURE_CITIES[prefecture].map((cityName) => (
                              <option key={cityName} value={cityName}>{cityName}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* お住まいのエリア選択セクション */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 ml-2">
                        <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">お住まいのエリア（彦根市限定）</span>
                      </label>
                      
                      {city === '彦根市' ? (
                        <>
                          <div className="relative">
                            <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-400" size={20} />
                            <select
                              value={selectedArea}
                              onChange={(e) => setSelectedArea(e.target.value)}
                              className="w-full bg-blue-50 border-2 border-transparent rounded-[1.5rem] py-4 pl-14 pr-5 font-bold text-gray-700 focus:border-blue-400 focus:bg-white focus:outline-none transition-all text-sm appearance-none"
                            >
                              <option value="">エリアを選択してください</option>
                              {HIKONE_AREAS.map((area) => (
                                <option key={area} value={area}>{area}</option>
                              ))}
                            </select>
                          </div>
                          <p className="text-[10px] text-gray-500 ml-2">
                            ※ エリアに合わせた情報（ゴミ収集日等）をお届けします
                          </p>
                          {selectedArea && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl">
                              <p className="text-xs font-bold text-blue-700">
                                📍 選択中: {selectedArea.split(',')[0]}...
                              </p>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl">
                          <p className="text-xs text-gray-500 text-center">
                            {city ? (
                              <>現在「{city}」が選択されています。<br/>エリア選択は彦根市在住の方のみご利用いただけます。</>
                            ) : (
                              <>上で「滋賀県」→「彦根市」を選択すると、<br/>詳細なエリアを設定できます。</>
                            )}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* 居住地：国名選択（海外が選択された場合のみ表示） */}
                    {prefecture === '海外' && (
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 ml-2">
                          <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                          <span className="text-xs font-black text-gray-400 uppercase tracking-widest">国名を選んでニャ</span>
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                          <select
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full bg-gray-50 border-2 border-transparent rounded-[1.5rem] py-4 pl-14 pr-5 font-bold text-gray-700 focus:border-orange-400 focus:bg-white focus:outline-none transition-all text-sm appearance-none"
                            required
                          >
                            <option value="">国名を選択してください</option>
                            {COUNTRIES.map((country) => (
                              <option key={country} value={country}>{country}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* 保存ボタン */}
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving || !username.trim()}
                      className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-4 rounded-[1.5rem] font-black shadow-xl shadow-orange-200 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin">🐱</div>
                          <span>保存中...</span>
                        </>
                      ) : (
                        <>
                          <Edit size={20} />
                          <span>保存するニャ！</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* 現在のプロフィール情報（参考表示） */}
                  {profile && (
                    <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
                      <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
                      <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-4">
                          {profile?.avatar_url ? (
                            <img 
                              src={profile.avatar_url} 
                              alt={profile.full_name || 'ユーザー'} 
                              className="w-20 h-20 rounded-full border-4 border-white/30 object-cover"
                            />
                          ) : (
                            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center border-4 border-white/30">
                              <UserCircle size={40} className="text-white" />
                            </div>
                          )}
                          <div className="flex-1">
                            <h2 className="text-2xl font-black mb-1">
                              {profile?.full_name || 'ユーザー'}
                            </h2>
                            {profile?.email && (
                              <p className="text-sm text-white/80 font-bold flex items-center gap-1">
                                <Mail size={14} />
                                {profile.email}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* 居住地情報（新フォーマット対応）- prefecture または location を使用 */}
                        {(profile?.prefecture || profile?.location || profile?.city) && (
                          <div className="mt-4 pt-4 border-t border-white/20">
                            <p className="text-xs text-white/60 font-bold mb-2">居住地</p>
                            <div className="flex items-center gap-2">
                              <MapPin size={16} className="text-white/80" />
                              <p className="text-sm font-bold text-white">
                                {formatFullLocation(
                                  profile?.prefecture || profile?.location || null,
                                  profile?.region || null,
                                  profile?.city || null,
                                  profile?.selected_area || profile?.detail_area || null
                                )}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ログアウトボタン */}
                  <div className="pt-4 pb-8">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-2 text-gray-400 font-bold text-sm hover:text-red-500 transition-colors py-3"
                    >
                      <LogOut size={18} />
                      ログアウト
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        )}

      </main>

      {/* 街選択ポップアップ（全国対応） */}
      {isCitySelectorOpen && (
        <>
          {/* Backdrop - クリックでキャンセル */}
          <div 
            className="fixed inset-0 z-[2499] bg-black/60 backdrop-blur-md"
            onClick={handleCancelCitySelection}
          />
          <div className="fixed inset-0 z-[2500] flex items-end justify-center pointer-events-none">
            <div className="bg-white w-full max-w-md rounded-t-[3rem] p-8 pb-12 animate-in slide-in-from-bottom max-h-[90vh] flex flex-col pointer-events-auto">
              {/* ヘッダー */}
              <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <div>
                  <h3 className="text-xl font-black">どこへ行くニャ？</h3>
                  {selectedDestinationName && (
                    <p className="text-sm text-orange-500 font-bold mt-1">
                      {selectedDestinationName}は良いところだニャ〜！
                    </p>
                  )}
                </div>
                <button 
                  onClick={handleCancelCitySelection}
                  className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <X size={20}/>
                </button>
              </div>

            {/* コンテンツエリア（スクロール可能） */}
            <div className="flex-1 overflow-y-auto space-y-4">
              {!tempPref ? (
                /* 都道府県選択 */
                <div className="space-y-3">
                  <p className="text-sm font-bold text-gray-500 mb-4">次はどこへお出かけするニャ？都道府県を選んでニャ！</p>
                  {/* 都道府県検索 */}
                  <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input
                      type="text"
                      value={citySearchQuery}
                      onChange={(e) => setCitySearchQuery(e.target.value)}
                      placeholder="都道府県を検索..."
                      className="w-full bg-gray-50 border-2 border-transparent rounded-[1.5rem] py-3 pl-12 pr-4 font-bold text-gray-700 focus:border-orange-400 focus:bg-white focus:outline-none transition-all text-sm"
                    />
                  </div>
                  {/* 都道府県リスト */}
                  <div className="space-y-2">
                    {ALL_PREFECTURES.filter(pref => 
                      !citySearchQuery || pref.includes(citySearchQuery)
                    ).map(pref => (
                      <button 
                        key={pref} 
                        onClick={() => {
                          setTempPref(pref)
                          setCitySearchQuery('')
                        }} 
                        className="w-full p-4 bg-gray-50 hover:bg-orange-50 rounded-2xl font-black flex justify-between items-center transition-all hover:scale-[1.02]"
                      >
                        <span>{pref}</span>
                        <ChevronRight size={18} className="text-gray-400"/>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* 市区町村選択 */
                <div className="space-y-3">
                  <div className="flex items-center gap-3 mb-4">
                    <button
                      onClick={() => {
                        setTempPref(null)
                        setCitySearchQuery('')
                      }}
                      className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                    >
                      <ChevronRight size={18} className="rotate-180 text-gray-600"/>
                    </button>
                    <h4 className="text-lg font-black text-gray-800">{tempPref}</h4>
                  </div>
                  
                  {/* 市区町村検索 */}
                  <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input
                      type="text"
                      value={citySearchQuery}
                      onChange={(e) => setCitySearchQuery(e.target.value)}
                      placeholder="市区町村を検索..."
                      className="w-full bg-gray-50 border-2 border-transparent rounded-[1.5rem] py-3 pl-12 pr-4 font-bold text-gray-700 focus:border-orange-400 focus:bg-white focus:outline-none transition-all text-sm"
                    />
                  </div>

                  {/* 市区町村リスト */}
                  <div className="space-y-2">
                    {(PREFECTURE_CITIES[tempPref] || []).filter(city => 
                      !citySearchQuery || city.includes(citySearchQuery)
                    ).map(city => (
                      <button 
                        key={city} 
                        onClick={() => {
                          const cityKey = city.toLowerCase().replace(/[市県区]/g, '')
                          // cityDataに存在しない場合は、新しいエントリを作成
                          if (!cityData[cityKey]) {
                            cityData[cityKey] = {
                              name: city,
                              food: '名物料理',
                              move: '交通情報',
                              shop: 'おすすめスポット',
                              color: 'from-orange-500 to-red-600'
                            }
                          }
                          setSelectedCityId(cityKey)
                          setSelectedDestinationName(city)
                          // 目的地が確定したので、観光モードに切り替える
                          setMode('tourist')
                          // メッセージを表示してからポップアップを閉じる
                          setTimeout(() => {
                            setIsCitySelectorOpen(false)
                            setTempPref(null)
                            setCitySearchQuery('')
                            // ポップアップが閉じた後にメッセージをクリア
                            setTimeout(() => {
                              setSelectedDestinationName('')
                            }, 2000)
                          }, 800)
                        }} 
                        className="w-full p-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black flex justify-between items-center shadow-lg transition-all hover:scale-[1.02] active:scale-95"
                      >
                        <span>{city}</span>
                        <Sparkles size={18}/>
                      </button>
                    ))}
                    {/* 自由入力オプション（検索に該当しない場合） */}
                    {citySearchQuery && !PREFECTURE_CITIES[tempPref]?.some(city => city.includes(citySearchQuery)) && (
                      <button
                        onClick={() => {
                          const cityName = citySearchQuery.trim()
                          if (cityName) {
                            const cityKey = cityName.toLowerCase().replace(/[市県区]/g, '')
                            cityData[cityKey] = {
                              name: cityName,
                              food: '名物料理',
                              move: '交通情報',
                              shop: 'おすすめスポット',
                              color: 'from-orange-500 to-red-600'
                            }
                            setSelectedCityId(cityKey)
                            setSelectedDestinationName(cityName)
                            // 目的地が確定したので、観光モードに切り替える
                            setMode('tourist')
                            // メッセージを表示してからポップアップを閉じる
                            setTimeout(() => {
                              setIsCitySelectorOpen(false)
                              setTempPref(null)
                              setCitySearchQuery('')
                              // ポップアップが閉じた後にメッセージをクリア
                              setTimeout(() => {
                                setSelectedDestinationName('')
                              }, 2000)
                            }, 800)
                          }
                        }}
                        className="w-full p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-black flex justify-between items-center shadow-lg transition-all hover:scale-[1.02]"
                      >
                        <span>「{citySearchQuery}」を追加する</span>
                        <Sparkles size={18}/>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>
        </>
      )}

      {/* プロフィール登録 編集モーダル */}
      {/* 
        表示条件:
        1. ローディング完了後（profileChecked === true）
        2. モーダル表示フラグがtrue（showProfileModal === true）
        3. ログイン済み（authUser が存在）
        4. ホーム画面にいる（view === 'main'）← 重要：ホーム画面でのみ表示
        z-index: z-[110] でナビバー（z-[100]）より前面に表示
      */}
      {profileChecked && showProfileModal && authUser && view === 'main' && (
        <ProfileRegistrationModal
          userId={authUser.id}
          userEmail={authUser.email}
          userFullName={authUser.user_metadata?.full_name || authUser.user_metadata?.name || profile?.full_name}
          onComplete={async () => {
            setShowProfileModal(false)
            await refreshProfile()
            refetchWaste()
            refetchStats()
          }}
        />
      )}

      {/* ミッション詳細モーダル */}
      {selectedMission && (
        <MissionModal
          mission={selectedMission}
          userId={authUser?.id || ''}
          isOpen={missionModalOpen}
          onClose={() => {
            setMissionModalOpen(false)
            setSelectedMission(null)
          }}
          isCompleted={userMissionStatuses[selectedMission.id] === 'approved'}
          isPending={userMissionStatuses[selectedMission.id] === 'pending'}
          isNextMonth={activeTab === 'next'}
          onUpdate={() => {
            refreshMissionStatus()
            refetchPoints()
            setMissionModalOpen(false)
            setSelectedMission(null)
            alert('ミッション報告ありがとうございます！審査をお待ちください。')
          }}
        />
      )}

      {/* エリア未対応モーダル（ログイン済みかつ対応エリア外の場合に表示） */}
      {showUnsupportedAreaModal && authUser && (
        <>
          {/* Backdrop（クリックしても閉じない） */}
          <div className="fixed inset-0 z-[3000] bg-black/70 backdrop-blur-md" />
          
          {/* モーダル本体 */}
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[3001] bg-white rounded-[2rem] max-w-md mx-auto shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* ヘッダー */}
            <div className="bg-gradient-to-r from-gray-500 to-gray-600 p-6 text-white relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full" />
              <div className="relative z-10 text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin size={32} className="text-white" />
                </div>
                <h3 className="text-xl font-black">サービス対象エリア外です</h3>
              </div>
            </div>

            {/* コンテンツ */}
            <div className="p-6 space-y-5">
              {/* メッセージ */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
                <p className="text-sm font-bold text-amber-800 leading-relaxed">
                  {UNSUPPORTED_AREA_MESSAGE}
                </p>
              </div>
              
              {/* 現在の設定エリア */}
              {userCity && (
                <div className="bg-gray-50 rounded-2xl p-4 text-center">
                  <p className="text-xs text-gray-500 font-bold mb-1">現在の設定エリア</p>
                  <p className="text-lg font-black text-gray-800">{userCity}</p>
                </div>
              )}
              
              {/* 対応エリア一覧 */}
              <div className="text-center">
                <p className="text-xs text-gray-500 font-bold mb-2">現在の対応エリア</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {['彦根市', '多賀町', '甲良町', '豊郷町', '愛荘町'].map((area) => (
                    <span 
                      key={area}
                      className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-xs font-black"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
              
              {/* ひこにゃんメッセージ */}
              <div className="flex items-center gap-4 bg-orange-50 rounded-2xl p-4">
                <img 
                  src={HIKONYAN_IMAGE}
                  className="w-16 h-16 object-contain" 
                  alt="ひこにゃん" 
                />
                <div>
                  <p className="text-sm font-black text-orange-700">
                    もう少し待っててニャ！
                  </p>
                  <p className="text-xs text-orange-600 font-bold mt-1">
                    あなたの街にも早く届けたいニャ〜
                  </p>
                </div>
              </div>
              
              {/* ボタン */}
              <div className="space-y-3">
                <button
                  onClick={() => {
                    // プロフィール編集画面に遷移
                    setShowUnsupportedAreaModal(false)
                    setView('profile')
                  }}
                  className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Edit size={18} />
                  居住地を変更する
                </button>
                <button
                  onClick={async () => {
                    // ログアウト
                    if (confirm('ログアウトしますか？')) {
                      await supabase.auth.signOut()
                      setProfile(null)
                      setShowUnsupportedAreaModal(false)
                      setView('main')
                      router.refresh()
                    }
                  }}
                  className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut size={16} />
                  ログアウト
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* --- 下部ナビゲーション --- */}
      <BottomNavigation 
        onNavigate={() => {
          setIsChatOpen(false) // 他のページに遷移する時もチャットを閉じる
        }}
      />

      {isChatOpen && <ChatRegistration onComplete={() => setIsChatOpen(false)} />}
    </div>
  )
}
