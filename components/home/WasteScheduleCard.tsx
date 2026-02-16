'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Trash2, Recycle, Leaf, Calendar, X, ChevronRight, Home, Clock, ChevronLeft } from 'lucide-react'
import { Skeleton } from '@/components/Skeleton'

// hikone_waste_master テーブルから取得するデータの型
export interface HikoneWasteMaster {
  area_key: string                  // エリアキー（旧: area_name）
  area_name?: string                // エリア名（後方互換性のため残す）
  burnable: string | null           // 燃やせるごみ（例：「火 金」）
  cans_and_metal: string | null     // 缶 金属類
  glass_bottles: string | null      // びん
  pet_bottles: string | null        // ペットボトル
  landfill_waste: string | null     // 燃やせないごみ（埋立ごみ）
}

// ゴミ種類の定義
const WASTE_TYPES = [
  { key: 'burnable', name: '燃やせるごみ', icon: '🔥', color: 'red' },
  { key: 'landfill_waste', name: '埋立ごみ', icon: '🗑️', color: 'brown' },
  { key: 'pet_bottles', name: 'ペットボトル', icon: '♻️', color: 'blue' },
  { key: 'cans_and_metal', name: '缶 金属類', icon: '🥫', color: 'green' },
  { key: 'glass_bottles', name: 'びん', icon: '🍾', color: 'purple' },
] as const

// 曜日の定義
const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']
const DAY_NAMES_FULL = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日']

// ゴミ種類のアイコンと色のマッピング
const GARBAGE_TYPE_STYLES: Record<string, { icon: any; color: string }> = {
  '燃やせるごみ': { icon: Trash2, color: 'red' },
  '埋立ごみ': { icon: Leaf, color: 'brown' },
  'ペットボトル': { icon: Recycle, color: 'blue' },
  '缶 金属類': { icon: Recycle, color: 'green' },
  'びん': { icon: Recycle, color: 'purple' },
  '収集なし': { icon: Leaf, color: 'gray' },
  'default': { icon: Trash2, color: 'gray' }
}

// 曜日文字列をパースしてマッチするかチェックする関数
const parseScheduleString = (scheduleStr: string | null, targetDate: Date): boolean => {
  if (!scheduleStr || scheduleStr.trim() === '') return false
  
  const dayOfWeek = targetDate.getDay() // 0=日, 1=月, ..., 6=土
  const dayOfMonth = targetDate.getDate()
  const weekOfMonth = Math.ceil(dayOfMonth / 7) // 第何週か（1〜5）
  
  const targetDayName = DAY_NAMES[dayOfWeek] // 「月」「火」など（1文字）
  const targetDayNameFull = DAY_NAMES_FULL[dayOfWeek] // 「月曜日」など（フルネーム）
  
  // ===== 「第1 3月曜」「第2 4水曜日」のパターン（最優先でチェック）=====
  // 「第」が含まれる場合は、このパターンのみで判定する
  if (scheduleStr.includes('第')) {
    const weekMatch = scheduleStr.match(/第([0-9\u30fb]+)([日月火水木金土])/)
    if (weekMatch) {
      const weeks = weekMatch[1].split('\u30fb').map(Number)
      const day = weekMatch[2]
      // 完全一致: 指定された週かつ指定された曜日のみマッチ
      return weeks.includes(weekOfMonth) && day === targetDayName
    }
    // 「第」があるのにパターンにマッチしない場合は false
    return false
  }
  
  // ===== 「毎週月曜」「毎週火曜日」のパターン =====
  if (scheduleStr.includes('毎週')) {
    // 正規表現で曜日を厳密にチェック
    const everyWeekMatch = scheduleStr.match(/毎週([日月火水木金土])(?:曜日?)?/)
    if (everyWeekMatch) {
      return everyWeekMatch[1] === targetDayName
    }
  }
  
  // ===== 「月曜日」「火曜日」のような曜日フルネーム（毎週と解釈）=====
  // 厳密にチェック：「月曜日」が独立して存在するかどうか
  // 「日曜日」を含む場合、「月曜日」の「日」が誤マッチしないようにする
  for (const fullDayName of DAY_NAMES_FULL) {
    if (scheduleStr.includes(fullDayName)) {
      // この曜日フルネームがターゲットの曜日と一致するかチェック
      if (fullDayName === targetDayNameFull) {
        return true
      }
    }
  }
  
  // ===== 「火 金」「月 木」「月曜」のパターン（曜日が列挙されている）=====
  // 曜日の1文字を抽出するが、フルネームの曜日を除外してから判定
  // まず scheduleStr から「X曜日」パターンを除去
  let cleanedStr = scheduleStr
  for (const fullDayName of DAY_NAMES_FULL) {
    cleanedStr = cleanedStr.replace(new RegExp(fullDayName, 'g'), '')
  }
  // 「X曜」パターンも除去
  cleanedStr = cleanedStr.replace(/[日月火水木金土]曜/g, '')
  
  // 残った文字列から曜日を抽出
  const daysInStr = cleanedStr.match(/[日月火水木金土]/g)
  if (daysInStr && daysInStr.length > 0) {
    // 完全一致: 今日の曜日（1文字）が含まれていればマッチ
    if (daysInStr.includes(targetDayName)) {
      return true
    }
  }
  
  // 「月曜」などの2文字パターンをチェック
  const shortDayMatch = scheduleStr.match(/([日月火水木金土])曜(?![日])/g)
  if (shortDayMatch) {
    for (const match of shortDayMatch) {
      const dayChar = match.charAt(0)
      if (dayChar === targetDayName) {
        return true
      }
    }
  }
  
  return false
}

// 特定の曜日のゴミを取得する関数
const getWasteForDayOfWeek = (wasteData: HikoneWasteMaster | null, dayIndex: number): { name: string; icon: string; schedule: string }[] => {
  if (!wasteData) return []
  
  // 今週のその曜日の日付を計算
  const today = new Date()
  const currentDayOfWeek = today.getDay()
  const diff = dayIndex - currentDayOfWeek
  const targetDate = new Date(today)
  targetDate.setDate(today.getDate() + diff)
  
  const result: { name: string; icon: string; schedule: string }[] = []
  
  const wasteTypeMap: Record<string, { schedule: string | null }> = {
    'burnable': { schedule: wasteData.burnable },
    'landfill_waste': { schedule: wasteData.landfill_waste },
    'pet_bottles': { schedule: wasteData.pet_bottles },
    'cans_and_metal': { schedule: wasteData.cans_and_metal },
    'glass_bottles': { schedule: wasteData.glass_bottles },
  }
  
  for (const wt of WASTE_TYPES) {
    const scheduleData = wasteTypeMap[wt.key]
    if (scheduleData && parseScheduleString(scheduleData.schedule, targetDate)) {
      result.push({
        name: wt.name,
        icon: wt.icon,
        schedule: scheduleData.schedule || ''
      })
    }
  }
  
  return result
}

// 今日 明日のゴミ出しを取得する関数
const getTodayTomorrowWaste = (wasteData: HikoneWasteMaster | null): { today: string[], tomorrow: string[] } => {
  // データがない場合は空を返す
  if (!wasteData) return { today: [], tomorrow: [] }
  
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  // ===== 今日の曜日を取得（new Date().getDay() を使用）=====
  const todayDow = today.getDay() // 0=日, 1=月, 2=火, 3=水, 4=木, 5=金, 6=土
  const tomorrowDow = tomorrow.getDay()
  const todayDayName = DAY_NAMES[todayDow] // 日本語の曜日（1文字）
  const tomorrowDayName = DAY_NAMES[tomorrowDow]

  const wasteTypesData = [
    { key: 'burnable', name: '燃やせるごみ', schedule: wasteData.burnable },
    { key: 'landfill_waste', name: '埋立ごみ', schedule: wasteData.landfill_waste },
    { key: 'pet_bottles', name: 'ペットボトル', schedule: wasteData.pet_bottles },
    { key: 'cans_and_metal', name: '缶 金属類', schedule: wasteData.cans_and_metal },
    { key: 'glass_bottles', name: 'びん', schedule: wasteData.glass_bottles },
  ]
  
  const todayWaste: string[] = []
  const tomorrowWaste: string[] = []
  
  for (const wt of wasteTypesData) {
    // ===== 曜日の照合: parseScheduleString で部分一致（includes）を使用 =====
    const isTodayMatch = parseScheduleString(wt.schedule, today)
    const isTomorrowMatch = parseScheduleString(wt.schedule, tomorrow)

    if (isTodayMatch) {
      todayWaste.push(wt.name)
    }
    if (isTomorrowMatch) {
      tomorrowWaste.push(wt.name)
    }
  }

  return { today: todayWaste, tomorrow: tomorrowWaste }
}

// カラーマップ
const colorMap: Record<string, { bg: string; iconBg: string; text: string; border: string; dot: string }> = {
  'red': { bg: 'bg-red-50', iconBg: 'bg-red-100 text-red-500', text: 'text-red-500', border: 'border-red-200', dot: 'bg-red-500' },
  'yellow': { bg: 'bg-yellow-50', iconBg: 'bg-yellow-100 text-yellow-600', text: 'text-yellow-600', border: 'border-yellow-200', dot: 'bg-yellow-500' },
  'blue': { bg: 'bg-blue-50', iconBg: 'bg-blue-100 text-blue-500', text: 'text-blue-500', border: 'border-blue-200', dot: 'bg-blue-500' },
  'green': { bg: 'bg-green-50', iconBg: 'bg-green-100 text-green-500', text: 'text-green-500', border: 'border-green-200', dot: 'bg-green-500' },
  'gray': { bg: 'bg-gray-50', iconBg: 'bg-gray-100 text-gray-500', text: 'text-gray-500', border: 'border-gray-200', dot: 'bg-gray-400' },
  'brown': { bg: 'bg-amber-50', iconBg: 'bg-[#78350f]/10 text-[#78350f]', text: 'text-[#78350f]', border: 'border-[#78350f]/30', dot: 'bg-[#78350f]' },
  'purple': { bg: 'bg-purple-50', iconBg: 'bg-[#9333ea]/10 text-[#9333ea]', text: 'text-[#9333ea]', border: 'border-[#9333ea]/30', dot: 'bg-[#9333ea]' },
}

interface WasteScheduleCardProps {
  userCity: string | null
  userSelectedArea: string | null
  userWasteSchedule: HikoneWasteMaster | null
  onSetupClick?: () => void
}

export default function WasteScheduleCard({
  userCity,
  userSelectedArea,
  userWasteSchedule,
  onSetupClick
}: WasteScheduleCardProps) {
  const [showWeeklyModal, setShowWeeklyModal] = useState(false)
  const [showMonthlyModal, setShowMonthlyModal] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date()) // 月間カレンダー用の表示月

  // クライアントサイドでのみ実行（Portal用）- フックは常に呼ぶ必要がある
  useEffect(() => {
    setMounted(true)
  }, [])

  // モーダル表示時に背後のスクロールを禁止
  useEffect(() => {
    if (showWeeklyModal || showMonthlyModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [showWeeklyModal, showMonthlyModal])

  // エリア設定済みだがデータ読み込み中 → 個別スケルトン表示ではなく「読み込み中...」
  if (userSelectedArea && userSelectedArea.trim() !== '' && !userWasteSchedule) {
    return (
      <div className="bg-white rounded-[2rem] p-4 shadow-sm border border-gray-100 flex items-center justify-center min-h-[120px]">
        <p className="text-sm font-bold text-gray-400 animate-pulse">読み込み中...</p>
      </div>
    )
  }
  
  // エリア未設定
  if (!userSelectedArea || userSelectedArea.trim() === '') {
    return (
      <div className="bg-white rounded-[2rem] p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <Trash2 size={16} className="text-red-500" />
          <h2 className="text-xs font-black text-gray-800">ゴミ収集</h2>
        </div>
        <div 
          className="bg-blue-50 border border-blue-200 rounded-xl p-3 cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={onSetupClick}
        >
          <p className="text-[11px] text-blue-700 font-bold text-center">
            💡 エリアを設定して収集日を表示
          </p>
        </div>
      </div>
    )
  }
  
  // 月間カレンダー用: 指定月の全日付のゴミ収集情報を取得
  const getMonthlyWasteData = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    
    const monthData: { date: Date; day: number; wastes: { key: string; name: string; icon: string; color: string }[] }[] = []
    
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d)
      const wastes: { key: string; name: string; icon: string; color: string }[] = []
      
      if (userWasteSchedule) {
        const wasteTypeMap: Record<string, string | null> = {
          'burnable': userWasteSchedule.burnable,
          'landfill_waste': userWasteSchedule.landfill_waste,
          'pet_bottles': userWasteSchedule.pet_bottles,
          'cans_and_metal': userWasteSchedule.cans_and_metal,
          'glass_bottles': userWasteSchedule.glass_bottles,
        }
        
        for (const wt of WASTE_TYPES) {
          const schedule = wasteTypeMap[wt.key]
          if (parseScheduleString(schedule, date)) {
            wastes.push({
              key: wt.key,
              name: wt.name,
              icon: wt.icon,
              color: wt.color
            })
          }
        }
      }
      
      monthData.push({ date, day: d, wastes })
    }
    
    return monthData
  }
  
  // 月の最初の曜日（0=日, 1=月, ...）
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay()
  }
  
  // 前月へ
  const goToPrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }
  
  // 次月へ
  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }
  
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const todayDow = today.getDay()
  const tomorrowDow = tomorrow.getDay()
  
  // hikone_waste_master からゴミの種類を取得
  const wasteInfo = getTodayTomorrowWaste(userWasteSchedule)
  
  // スタイル取得（最初のゴミ種類に基づく）
  const getStyle = (wasteTypes: string[]) => {
    if (wasteTypes.length === 0) return GARBAGE_TYPE_STYLES['default']
    return GARBAGE_TYPE_STYLES[wasteTypes[0]] || GARBAGE_TYPE_STYLES['default']
  }
  
  const todayStyle = getStyle(wasteInfo.today)
  const tomorrowStyle = getStyle(wasteInfo.tomorrow)
  
  const TodayIcon = todayStyle.icon
  const TomorrowIcon = tomorrowStyle.icon
  
  const todayColors = colorMap[todayStyle.color] || colorMap['gray']
  const tomorrowColors = colorMap[tomorrowStyle.color] || colorMap['gray']
  
  // ゴミ種類からアイコン絵文字を取得
  const getWasteIcon = (wasteName: string) => {
    const wt = WASTE_TYPES.find(w => w.name === wasteName)
    return wt?.icon || '🗑️'
  }
  
  // ゴミ種類から色を取得
  const getWasteColor = (wasteName: string) => {
    const wt = WASTE_TYPES.find(w => w.name === wasteName)
    return colorMap[wt?.color || 'gray']
  }
  
  return (
    <>
      <div className="bg-white rounded-[2rem] p-4 shadow-sm border border-gray-100">
        {/* ヘッダー：タイトルとエリアバッジ（高さを抑える） */}
        <div className="flex items-center gap-2 mb-3">
          <Trash2 size={16} className="text-red-500" />
          <h2 className="text-xs font-black text-gray-800">ゴミ収集</h2>
          {userSelectedArea && (
            <span className="ml-auto px-2 py-0.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[8px] font-black rounded-full shadow-sm">
              {userSelectedArea.split('・')[0].replace('・', ' ')}...
            </span>
          )}
        </div>
        
        <>
            {/* 今日 明日の2カラムレイアウト（高さを大幅に圧縮） */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              {/* 今日のパネル */}
              <div className={`${wasteInfo.today.length > 0 ? 'bg-orange-50/50' : 'bg-gray-50'} rounded-xl p-2 border ${wasteInfo.today.length > 0 ? 'border-orange-100' : 'border-gray-100'} flex items-center justify-between`}>
                <div className="flex flex-col">
                  <span className={`text-[10px] font-black ${wasteInfo.today.length > 0 ? 'text-orange-500' : 'text-gray-400'}`}>今日</span>
                  <span className="text-[8px] text-gray-400 font-bold">{DAY_NAMES[todayDow]}曜</span>
                </div>
                
                <div className="flex items-center gap-1">
                  {wasteInfo.today.length === 0 ? (
                    <span className="text-xs font-black text-gray-300">なし</span>
                  ) : (
                    <div className="flex -space-x-1">
                      {wasteInfo.today.slice(0, 2).map((waste, idx) => (
                        <span key={idx} className="text-xl" title={waste}>{getWasteIcon(waste)}</span>
                      ))}
                      {wasteInfo.today.length > 2 && <span className="text-[8px] font-bold text-orange-500 self-end">+{wasteInfo.today.length - 2}</span>}
                    </div>
                  )}
                </div>
              </div>
              
              {/* 明日のパネル */}
              <div className={`${wasteInfo.tomorrow.length > 0 ? 'bg-blue-50/50' : 'bg-gray-50'} rounded-xl p-2 border ${wasteInfo.tomorrow.length > 0 ? 'border-blue-100' : 'border-gray-100'} flex items-center justify-between`}>
                <div className="flex flex-col">
                  <span className={`text-[10px] font-black ${wasteInfo.tomorrow.length > 0 ? 'text-blue-500' : 'text-gray-400'}`}>明日</span>
                  <span className="text-[8px] text-gray-400 font-bold">{DAY_NAMES[tomorrowDow]}曜</span>
                </div>
                
                <div className="flex items-center gap-1">
                  {wasteInfo.tomorrow.length === 0 ? (
                    <span className="text-xs font-black text-gray-300">なし</span>
                  ) : (
                    <div className="flex -space-x-1">
                      {wasteInfo.tomorrow.slice(0, 2).map((waste, idx) => (
                        <span key={idx} className="text-xl" title={waste}>{getWasteIcon(waste)}</span>
                      ))}
                      {wasteInfo.tomorrow.length > 2 && <span className="text-[8px] font-bold text-blue-500 self-end">+{wasteInfo.tomorrow.length - 2}</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* カレンダーボタンを横並びに */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowWeeklyModal(true)}
                className="flex items-center justify-center gap-1.5 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-100"
              >
                <Clock size={12} className="text-gray-400" />
                <span className="text-[9px] font-bold text-gray-500">週間</span>
              </button>
              <button
                onClick={() => {
                  setCurrentMonth(new Date())
                  setShowMonthlyModal(true)
                }}
                className="flex items-center justify-center gap-1.5 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-100"
              >
                <Calendar size={12} className="text-gray-400" />
                <span className="text-[9px] font-bold text-gray-500">月間</span>
              </button>
            </div>
        </>
      </div>
      
      {/* 週間カレンダーモーダル - Portal で body 直下にレンダリング */}
      {showWeeklyModal && mounted && createPortal(
        <div 
          className="fixed inset-0 flex flex-col"
          style={{ zIndex: 99999 }}
        >
          {/* オーバーレイ */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowWeeklyModal(false)}
          />
          
          {/* モーダルコンテナ */}
          <div className="relative flex-1 flex items-end justify-center">
            <div 
              className="bg-white w-full max-w-md rounded-t-[2.5rem] overflow-hidden flex flex-col shadow-2xl"
              style={{ maxHeight: 'calc(100vh - 40px)', height: 'auto' }}
            >
              {/* ヘッダー */}
              <div className="flex-shrink-0 p-5 border-b flex justify-between items-center bg-gradient-to-r from-red-50 to-orange-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                    <Calendar size={20} className="text-red-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-900">週間ゴミ出しカレンダー</h2>
                    <p className="text-[10px] text-gray-500 font-bold">
                      {userSelectedArea?.split('\u30fb')[0]}... エリア
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowWeeklyModal(false)}
                  className="p-2.5 bg-white hover:bg-gray-100 rounded-full transition-colors shadow-sm"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
              
              {/* スクロール可能なコンテンツ */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 overscroll-contain">
                {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
                  const wasteForDay = getWasteForDayOfWeek(userWasteSchedule, dayIndex)
                  const isToday = dayIndex === todayDow
                  
                  return (
                    <div 
                      key={dayIndex}
                      className={`rounded-2xl p-4 border-2 transition-all ${
                        isToday 
                          ? 'bg-orange-50 border-orange-300 shadow-md' 
                          : 'bg-white border-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-black ${isToday ? 'text-orange-600' : 'text-gray-700'}`}>
                            {DAY_NAMES_FULL[dayIndex]}
                          </span>
                          {isToday && (
                            <span className="px-2 py-0.5 bg-orange-500 text-white text-[9px] font-black rounded-full animate-pulse">
                              今日
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {wasteForDay.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {wasteForDay.map((waste, idx) => {
                            const wt = WASTE_TYPES.find(w => w.name === waste.name)
                            const colors = colorMap[wt?.color || 'gray']
                            return (
                              <div 
                                key={idx}
                                className={`flex items-center gap-1.5 px-3 py-1.5 ${colors.bg} ${colors.border} border rounded-full`}
                              >
                                <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                                <span className={`text-[11px] font-black ${colors.text}`}>{waste.name}</span>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 font-bold">収集なし</p>
                      )}
                    </div>
                  )
                })}
              </div>
              
              {/* フッター - より目立つデザイン */}
              <div className="flex-shrink-0 p-4 border-t-2 border-gray-200 bg-white space-y-3 pb-6">
                <p className="text-[10px] text-gray-500 text-center font-bold">
                  ※ 祝日や年末年始は収集日が変更になる場合があります
                </p>
                {/* ホームに戻るボタン - より目立つ */}
                <button
                  onClick={() => setShowWeeklyModal(false)}
                  className="w-full py-4 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black text-white text-base font-black rounded-2xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  <Home size={20} />
                  ホームに戻る
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      
      {/* 月間カレンダーモーダル - Portal で body 直下にレンダリング */}
      {showMonthlyModal && mounted && createPortal(
        <div 
          className="fixed inset-0 flex flex-col"
          style={{ zIndex: 99999 }}
        >
          {/* オーバーレイ */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowMonthlyModal(false)}
          />
          
          {/* モーダルコンテナ */}
          <div className="relative flex-1 flex items-end justify-center">
            <div 
              className="bg-white w-full max-w-md rounded-t-[2.5rem] overflow-hidden flex flex-col shadow-2xl"
              style={{ maxHeight: 'calc(100vh - 40px)', height: 'auto' }}
            >
              {/* ヘッダー */}
              <div className="flex-shrink-0 p-5 border-b flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Calendar size={20} className="text-blue-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-900">月間ゴミ出しカレンダー</h2>
                    <p className="text-[10px] text-gray-500 font-bold">
                      {userSelectedArea?.split('\u30fb')[0]}... エリア
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMonthlyModal(false)}
                  className="p-2.5 bg-white hover:bg-gray-100 rounded-full transition-colors shadow-sm"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
              
              {/* 月切り替えヘッダー */}
              <div className="flex-shrink-0 px-4 py-3 flex items-center justify-between bg-gray-50">
                <button
                  onClick={goToPrevMonth}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <ChevronLeft size={20} className="text-gray-600" />
                </button>
                <h3 className="text-base font-black text-gray-800">
                  {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
                </h3>
                <button
                  onClick={goToNextMonth}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <ChevronRight size={20} className="text-gray-600" />
                </button>
              </div>
              
              {/* カレンダーコンテンツ */}
              <div className="flex-1 overflow-y-auto p-4 overscroll-contain">
                {/* 凡例（上部に配置） */}
                <div className="mb-4 p-3 bg-gray-50 rounded-xl">
                  <p className="text-[10px] font-black text-gray-500 mb-2">凡例</p>
                  <div className="flex flex-wrap gap-3">
                    {WASTE_TYPES.map((wt) => {
                      const colors = colorMap[wt.color] || colorMap['gray']
                      return (
                        <div key={wt.key} className="flex items-center gap-1.5">
                          <div className={`w-3 h-3 rounded-full ${colors.dot}`} />
                          <span className="text-[10px] font-bold text-gray-600">{wt.name}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                
                {/* 曜日ヘッダー */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {DAY_NAMES.map((day, idx) => (
                    <div 
                      key={day} 
                      className={`text-center text-[10px] font-black py-1 ${
                        idx === 0 ? 'text-red-400' : idx === 6 ? 'text-blue-400' : 'text-gray-400'
                      }`}
                    >
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* カレンダーグリッド */}
                <div className="grid grid-cols-7 gap-1">
                  {/* 月初の空白セル */}
                  {Array.from({ length: getFirstDayOfMonth(currentMonth.getFullYear(), currentMonth.getMonth()) }).map((_, idx) => (
                    <div key={`empty-${idx}`} className="aspect-square" />
                  ))}
                  
                  {/* 日付セル */}
                  {getMonthlyWasteData(currentMonth.getFullYear(), currentMonth.getMonth()).map(({ date, day, wastes }) => {
                    const isToday = 
                      date.getDate() === today.getDate() &&
                      date.getMonth() === today.getMonth() &&
                      date.getFullYear() === today.getFullYear()
                    const isSunday = date.getDay() === 0
                    const isSaturday = date.getDay() === 6
                    
                    return (
                      <div 
                        key={day}
                        className={`aspect-square rounded-lg p-1 flex flex-col items-center justify-start ${
                          isToday 
                            ? 'bg-orange-100 border-2 border-orange-400' 
                            : 'bg-gray-50 border border-gray-100'
                        }`}
                      >
                        {/* 日付 */}
                        <span className={`text-[10px] font-black ${
                          isToday ? 'text-orange-600' : 
                          isSunday ? 'text-red-400' : 
                          isSaturday ? 'text-blue-400' : 'text-gray-600'
                        }`}>
                          {day}
                        </span>
                        
                        {/* ゴミの色付きドット */}
                        {wastes.length > 0 && (
                          <div className="flex flex-wrap gap-0.5 justify-center mt-0.5">
                            {wastes.slice(0, 4).map((waste, idx) => {
                              const colors = colorMap[waste.color] || colorMap['gray']
                              return (
                                <div 
                                  key={idx}
                                  className={`w-2 h-2 rounded-full ${colors.dot}`}
                                  title={waste.name}
                                />
                              )
                            })}
                            {wastes.length > 4 && (
                              <span className="text-[6px] text-gray-400 font-bold">+{wastes.length - 4}</span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
              
              {/* フッター */}
              <div className="flex-shrink-0 p-4 border-t-2 border-gray-200 bg-white space-y-3 pb-6">
                <p className="text-[10px] text-gray-500 text-center font-bold">
                  ※ 祝日や年末年始は収集日が変更になる場合があります
                </p>
                <button
                  onClick={() => setShowMonthlyModal(false)}
                  className="w-full py-4 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black text-white text-base font-black rounded-2xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  <Home size={20} />
                  ホームに戻る
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
