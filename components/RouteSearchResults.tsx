'use client'

import { Train, ArrowRight, Coins, ArrowUpDown, MapPin } from 'lucide-react'

/**
 * 経路検索結果を表示するコンポーネント
 * 
 * @param routes - 経路検索結果の配列
 * @param getTrainTypeLabel - 列車種別のラベルを取得する関数（オプション）
 */
interface RouteSearchResultsProps {
  routes: any[]
  getTrainTypeLabel?: (trainType: string | null) => string
}

/**
 * 列車種別のラベルを取得（デフォルト実装）
 */
const defaultGetTrainTypeLabel = (trainType: string | null): string => {
  if (!trainType) return '普通'
  
  const typeMap: Record<string, string> = {
    'Local': '普通',
    'Rapid': '快速',
    'Express': '急行',
    'LimitedExpress': '特急',
    'SemiExpress': '準急',
    'RapidExpress': '快速急行',
    'SpecialRapid': '新快速',
    'CommuterRapid': '通勤快速',
    'CommuterLimitedExpress': '通勤特急',
  }
  
  return typeMap[trainType] || trainType
}

export default function RouteSearchResults({ routes, getTrainTypeLabel = defaultGetTrainTypeLabel }: RouteSearchResultsProps) {
  if (!routes || routes.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-black text-gray-800">検索結果 ({routes.length}件)</h3>
      {routes.map((route, index) => {
        const departureTime = new Date(route.summary.start_time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
        const arrivalTime = new Date(route.summary.arrival_time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
        // 所要時間（分）
        const duration = route.summary?.move?.time || 0
        const transferCount = route.summary?.move?.transfer_count || 0
        // 合計運賃（円）
        const fare = route.summary?.fare?.total || 0
        
        // Route.Line を配列として正規化（重要: 配列でない場合は配列に変換）
        const sections = route.sections && Array.isArray(route.sections) 
          ? route.sections 
          : (route.sections ? [route.sections] : [])
        
        return (
          <div
            key={index}
            className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-4 border border-amber-100"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-black text-gray-600">出発</p>
                <p className="text-lg font-black text-gray-900">{departureTime}</p>
              </div>
              <ArrowRight size={20} className="text-gray-400" />
              <div>
                <p className="text-sm font-black text-gray-600">到着</p>
                <p className="text-lg font-black text-gray-900">{arrivalTime}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-gray-600">所要時間</p>
                <p className="text-lg font-black text-amber-600">
                  {duration > 0 ? `${duration}分` : '--'}
                </p>
              </div>
            </div>
            
            {/* 運賃と乗り換え回数 */}
            <div className="flex items-center gap-4 mb-3 text-sm">
              {fare > 0 && (
                <div className="flex items-center gap-1">
                  <Coins size={14} className="text-amber-600" />
                  <span className="font-black text-gray-700">¥{fare.toLocaleString()}</span>
                </div>
              )}
              {transferCount > 0 && (
                <div className="flex items-center gap-1">
                  <ArrowUpDown size={14} className="text-gray-500" />
                  <span className="font-black text-gray-600">乗り換え{transferCount}回</span>
                </div>
              )}
            </div>
            
            {/* 各区間の詳細 */}
            <div className="space-y-2 border-t border-amber-200 pt-3">
              {sections.length > 0 ? (
                sections.map((section: any, secIndex: number) => {
                  // section が transit 型でない場合や、transit プロパティがない場合の処理
                  if (section.type === 'transit' && section.transit) {
                    return (
                      <div key={secIndex} className="flex items-start gap-2 text-sm">
                        <Train size={16} className="text-amber-600 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* 列車種別（新快速など） */}
                            {section.transit.line?.trainType && (
                              <span className="inline-block px-2 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-black">
                                {getTrainTypeLabel(section.transit.line.trainType)}
                              </span>
                            )}
                            <span className="font-black text-gray-700">
                              {section.transit.line?.name || '路線名不明'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {section.transit.from?.name || '出発駅不明'} → {section.transit.to?.name || '到着駅不明'}
                            {/* 番線情報があれば表示 */}
                            {section.transit.from?.platform && (
                              <span className="ml-2 text-amber-600 font-black">
                                {section.transit.from.platform}番線発
                              </span>
                            )}
                          </div>
                          {/* 出発 到着時刻 */}
                          {(section.transit.departureTime || section.transit.arrivalTime) && (
                            <div className="text-xs text-gray-500 mt-0.5">
                              {section.transit.departureTime && `発: ${formatTime(section.transit.departureTime)}`}
                              {section.transit.departureTime && section.transit.arrivalTime && ' / '}
                              {section.transit.arrivalTime && `着: ${formatTime(section.transit.arrivalTime)}`}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  } else if (section.type === 'walk' && section.walk) {
                    return (
                      <div key={secIndex} className="flex items-start gap-2 text-sm">
                        <MapPin size={16} className="text-gray-400 mt-0.5" />
                        <span className="font-black text-gray-600">{section.walk.instruction}</span>
                      </div>
                    )
                  }
                  return null
                })
              ) : (
                <p className="text-xs text-gray-500">詳細情報がありません</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * 時刻をフォーマット（ISO形式またはHH:mm形式に対応）
 */
function formatTime(timeString: string): string {
  if (!timeString) return ''
  
  // ISO形式（YYYY-MM-DDTHH:mm:ss+09:00）の場合
  if (timeString.includes('T')) {
    try {
      const date = new Date(timeString)
      return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return timeString
    }
  }
  
  // HH:mm形式の場合
  return timeString
}
