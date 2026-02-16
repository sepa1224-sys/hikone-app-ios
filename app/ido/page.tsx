'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Train, MapPin, Search, Clock, ArrowUpDown, AlertCircle, 
  ArrowLeft, ArrowRight, RefreshCw, Calendar, ExternalLink, X, History
} from 'lucide-react'
import BottomNavigation from '@/components/BottomNavigation'
import { supabase } from '@/lib/supabase'

// クイック検索の駅順（指定された順番で固定）
const QUICK_STATIONS = [
  '彦根', '南彦根', '河瀬', '稲枝', '米原', '長浜', '能登川', '安土', 
  '近江八幡', '野洲', '守山', '草津', '京都', 'ひこね芹川', '彦根口', 
  '高宮', '鳥居本', 'フジテック前'
]

// 修正ポイント：Google Directions APIで確実にヒットする Place ID を定義
const STATION_DATA: Record<string, { lat: number; lon: number; id: string }> = {
  '彦根': { lat: 35.2746, lon: 136.2522, id: 'ChIJqSwSmsjUA2ARUaJr69Vmcc4' },
  '南彦根': { lat: 35.2467, lon: 136.2361, id: 'ChIJV4Y763HVA2ARp0Y3uGz9YgQ' },
  '河瀬': { lat: 35.2206, lon: 136.2217, id: 'ChIJN6r3qD_XA2AR72Fv-qjC1mE' },
  '稲枝': { lat: 35.1983, lon: 136.2069, id: 'ChIJP46O24vWA2ARFm9Y6v7O82E' },
  '草津': { lat: 35.0222, lon: 135.9593, id: 'ChIJtz4xbz9yAWAREwliauTa0LQ' },
  '京都': { lat: 34.9858, lon: 135.7588, id: 'ChIJ0eJ88pOnAWARn3oV1S68CIs' },
  '米原': { lat: 35.3147, lon: 136.2908, id: 'ChIJz-S8C-3VA2ARf6WkI6yvL8g' },
  '近江八幡': { lat: 35.1281, lon: 136.0986, id: 'ChIJs9kG9KDyA2AR3fW4zI785rE' },
}

export default function IdoPage() {
  const [departure, setDeparture] = useState('')
  const [arrival, setArrival] = useState('')
  const [focusedField, setFocusedField] = useState<'dep' | 'arr'>('dep')
  const [routes, setRoutes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchDate, setSearchDate] = useState('')
  const [searchYear, setSearchYear] = useState('')
  const [searchMonth, setSearchMonth] = useState('')
  const [searchDay, setSearchDay] = useState('')
  const [searchHour, setSearchHour] = useState('14')
  const [searchMinute, setSearchMinute] = useState('00')
  const [searchType, setSearchType] = useState<'departure' | 'arrival' | 'first' | 'last'>('departure')
  const [isCached, setIsCached] = useState(false) // キャッシュから取得したかどうか
  const [isFirstTrain, setIsFirstTrain] = useState(false) // 始発表示フラグ
  const [iframeLoading, setIframeLoading] = useState(true) // iframeの読み込み状態
  const resultsRef = useRef<HTMLDivElement>(null) // 検索結果エリアへの参照
  const [recentStations, setRecentStations] = useState<{ from: string; to: string }[]>([]) // 最近の検索駅履歴（出発→到着のペア）

  useEffect(() => {
    const now = new Date()
    // 日付を YYYY-MM-DD 形式で設定
    const dateStr = now.toISOString().split('T')[0]
    setSearchDate(dateStr)
    // 年/月/日を個別に設定
    setSearchYear(String(now.getFullYear()))
    setSearchMonth(String(now.getMonth() + 1).padStart(2, '0'))
    setSearchDay(String(now.getDate()).padStart(2, '0'))
    // 時刻を24時間形式で設定（時と分を分けて保存）
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    setSearchHour(hours)
    setSearchMinute(minutes)
    
    // localStorageから履歴を読み込み
    const saved = localStorage.getItem('recentStations')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          // 後方互換性: 文字列配列の場合は空配列に（新しい形式に移行）
          if (parsed.length > 0 && typeof parsed[0] === 'string') {
            setRecentStations([])
            localStorage.removeItem('recentStations')
          } else {
            // 新しい形式（オブジェクト配列）として読み込み
            setRecentStations(parsed.filter((item: any) => item && item.from && item.to))
          }
        } else {
          setRecentStations([])
        }
      } catch (e) {
        console.error('履歴の読み込みに失敗しました:', e)
        setRecentStations([])
      }
    }
  }, [])

  // 年/月/日が変更されたらsearchDateを更新
  useEffect(() => {
    if (searchYear && searchMonth && searchDay) {
      const formattedDate = `${searchYear}-${searchMonth.padStart(2, '0')}-${searchDay.padStart(2, '0')}`
      setSearchDate(formattedDate)
    }
  }, [searchYear, searchMonth, searchDay])

  const formatTime = (time: any) => {
    if (!time) return "--:--"
    const date = new Date(time)
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  }

  // ===== キャッシュ戦略: DB保存型 =====
  const handleSearch = async (forceRefresh = false) => {
    const cleanDep = departure.replace('駅', '').trim()
    const cleanArr = arrival.replace('駅', '').trim()
    
    // バリデーション: 空でないことを確認
    if (!cleanDep || !cleanArr) {
      setError('出発駅と到着駅を入力してください')
      return
    }

    setLoading(true)
    setError('')
    setIsCached(false)
    setIsFirstTrain(false)
    setIframeLoading(true) // iframeの読み込み状態をリセット

    try {
      // ===== 1. キャッシュ優先: Supabase から検索 =====
      if (!forceRefresh) {
        // 日時を駅すぱあとAPIの形式に変換（キャッシュ検索用）
        // 24時間形式で確実に変換（例: "14:00" → "1400", "15:30" → "1530"）
        const formattedDate = searchDate.replace(/-/g, '') // YYYY-MM-DD → YYYYMMDD
        // 時と分を結合してからHHMM形式に変換
        const timeString = `${searchHour.padStart(2, '0')}:${searchMinute.padStart(2, '0')}` // HH:mm形式
        const formattedTime = timeString.replace(/:/g, '') // HHMM（24時間形式、4桁の数値）
        
        console.log('🔍 キャッシュを検索中...', { 
          departure: cleanDep, 
          arrival: cleanArr, 
          search_date: formattedDate, 
          search_time: formattedTime,
          search_hour: searchHour,
          search_minute: searchMinute,
          originalTime: timeString // 元の時刻（HH:mm形式）も記録
        })
        const now = new Date().toISOString()
        
        // 厳格な一致: 駅名、日付、時刻が完全に一致する場合のみキャッシュを使用
        // 重要: search_time も条件に含めることで、1分でも時間が違えばキャッシュを使わない
        const { data: cachedData, error: cacheError } = await supabase
          .from('train_routes')
          .select('*')
          .eq('departure_station', cleanDep) // 出発駅が完全一致
          .eq('arrival_station', cleanArr) // 到着駅が完全一致
          .eq('search_date', formattedDate) // 日付が完全一致
          .eq('search_time', formattedTime) // 時刻が完全一致（1分でも違う場合はキャッシュを使わない）
          .gt('valid_until', now) // valid_until が現在時刻より後
          .order('created_at', { ascending: false })
          .limit(1)
        
        if (!cacheError && cachedData && cachedData.length > 0) {
          console.log('✅ キャッシュヒット！DBから経路を取得（日時完全一致）')
          console.log('   検索条件:', { 
            departure: cleanDep, 
            arrival: cleanArr, 
            search_date: formattedDate, 
            search_time: formattedTime 
          })
          const cached = cachedData[0]
          
          // route_data を復元
          const routeData = typeof cached.route_data === 'string' 
            ? JSON.parse(cached.route_data) 
            : cached.route_data
          
          setRoutes(routeData || [])
          setIsCached(true)
          setLoading(false)
          // 検索結果エリアへ自動スクロール
          setTimeout(() => {
            resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }, 100)
          
          // 履歴に追加（重複排除、最大10件）
          const newPair = { from: cleanDep, to: cleanArr }
          setRecentStations(prev => {
            // 同じペアが既に存在するかチェック
            const exists = prev.some(p => p.from === cleanDep && p.to === cleanArr)
            if (exists) {
              // 既に存在する場合は、先頭に移動
              const filtered = prev.filter(p => !(p.from === cleanDep && p.to === cleanArr))
              const updated = [newPair, ...filtered].slice(0, 10)
              localStorage.setItem('recentStations', JSON.stringify(updated))
              return updated
            } else {
              // 新規追加
              const updated = [newPair, ...prev].slice(0, 10)
              localStorage.setItem('recentStations', JSON.stringify(updated))
              return updated
            }
          })
          return
        }
        console.log('📭 キャッシュなし、APIを呼び出します')
        console.log('   理由: 日時が一致しない、またはキャッシュが存在しない')
        console.log('   検索条件:', { 
          departure: cleanDep, 
          arrival: cleanArr, 
          search_date: formattedDate, 
          search_time: formattedTime 
        })
      } else {
        console.log('🔄 強制更新モード: キャッシュを無視してAPIを呼び出します')
      }

      // ===== 2. API取得: キャッシュがない場合のみ =====
      // 座標ではなく駅名で送信
      // 日時を駅すぱあとAPIの形式に変換（ハイフンとコロンを除去）
      // 画面上の searchHour と searchMinute を結合して使用
      // 24時間形式で確実に変換（例: "14:00" → "1400", "15:30" → "1530"）
      const formattedDate = searchDate.replace(/-/g, '') // YYYY-MM-DD → YYYYMMDD
      // 時と分を結合してからHHMM形式に変換
      const timeString = `${searchHour.padStart(2, '0')}:${searchMinute.padStart(2, '0')}` // HH:mm形式
      const formattedTime = timeString.replace(/:/g, '') // HHMM（24時間形式、4桁の数値）
      
      // 時刻のバリデーション: 24時間形式（HHMM）であることを確認
      if (!/^\d{4}$/.test(formattedTime)) {
        console.error('❌ 時刻の形式が不正です:', { searchHour, searchMinute }, '→', formattedTime)
        setError('時刻の形式が正しくありません。24時間形式（例: 14:00）で入力してください。')
        setLoading(false)
        return
      }
      
      // 時刻が24時間以内であることを確認
      const hours = parseInt(searchHour, 10)
      const minutes = parseInt(searchMinute, 10)
      if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        console.error('❌ 時刻の値が範囲外です:', { hours, minutes })
        setError('時刻の値が範囲外です。0:00〜23:59の範囲で入力してください。')
        setLoading(false)
        return
      }
      
      // デバッグログ: 実際に送信される日時を確認
      console.log(`Searching for: ${formattedDate} ${formattedTime} (24時間形式)`)
      console.log('[API] 経路検索パラメータ:', { 
        cleanDep, 
        cleanArr, 
        formattedDate, 
        formattedTime, 
        searchType,
        search_hour: searchHour,
        search_minute: searchMinute,
        originalTime: timeString // 元の時刻（HH:mm形式）も記録
      })
      
      const params = new URLSearchParams({
        from: cleanDep,
        to: cleanArr,
        date: formattedDate,
        time: formattedTime,
        searchType: searchType,
      })
      
      console.log('[API] 最終リクエストURL:', `/api/transport/route?${params.toString()}`)
      
      const res = await fetch(`/api/transport/route?${params.toString()}`)
      const data = await res.json()

      if (res.ok && data.routes && data.routes.length > 0) {
        // ResourceURI形式の場合はDBに保存しない（外部リンクのため）
        const hasResourceURI = data.routes.some((route: any) => route.type === 'resourceURI')
        
        setRoutes(data.routes)
        setError('')
        
        // 始発フラグを設定
        if (data.isFirstTrain) {
          setIsFirstTrain(true)
        }
        
        // ===== 3. DB保存: 取得した経路をキャッシュとして保存 =====
        // ResourceURI形式の場合は保存しない（外部リンクのため）
        if (hasResourceURI) {
          console.log('🔗 ResourceURI形式のため、DBへの保存をスキップします')
          setLoading(false)
          // 検索結果エリアへ自動スクロール
          setTimeout(() => {
            resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }, 100)
          
          // 履歴に追加（重複排除、最大10件）
          const newPair = { from: cleanDep, to: cleanArr }
          setRecentStations(prev => {
            // 同じペアが既に存在するかチェック
            const exists = prev.some(p => p.from === cleanDep && p.to === cleanArr)
            if (exists) {
              // 既に存在する場合は、先頭に移動
              const filtered = prev.filter(p => !(p.from === cleanDep && p.to === cleanArr))
              const updated = [newPair, ...filtered].slice(0, 10)
              localStorage.setItem('recentStations', JSON.stringify(updated))
              return updated
            } else {
              // 新規追加
              const updated = [newPair, ...prev].slice(0, 10)
              localStorage.setItem('recentStations', JSON.stringify(updated))
              return updated
            }
          })
          return
        }
        // 日時を駅すぱあとAPIの形式に変換（保存用）
        // 24時間形式で確実に変換（例: "14:00" → "1400", "15:30" → "1530"）
        // 重要: 必ずその時の searchHour と searchMinute を結合してカラムに保存する
        const formattedDate = searchDate.replace(/-/g, '') // YYYY-MM-DD → YYYYMMDD
        const timeString = `${searchHour.padStart(2, '0')}:${searchMinute.padStart(2, '0')}` // HH:mm形式
        const formattedTime = timeString.replace(/:/g, '') // HHMM（24時間形式、4桁の数値）
        
        // 保存時の時刻が24時間形式であることを確認
        if (!/^\d{4}$/.test(formattedTime)) {
          console.error('❌ 保存時の時刻形式が不正です:', { searchHour, searchMinute }, '→', formattedTime)
        }
        
        const validUntil = new Date()
        validUntil.setHours(validUntil.getHours() + 1) // 1時間後
        
        const { error: saveError } = await supabase
          .from('train_routes')
          .insert({
            departure_station: cleanDep,
            arrival_station: cleanArr,
            search_date: formattedDate, // 検索に使用した日付を保存
            search_time: formattedTime, // 検索に使用した時刻を保存（1分単位で厳格に保存）
            route_data: data.routes,
            valid_until: validUntil.toISOString(),
          })
        
        if (saveError) {
          console.error('❌ キャッシュ保存失敗:', saveError.message)
          console.error('   保存しようとしたデータ:', { 
            departure_station: cleanDep, 
            arrival_station: cleanArr, 
            search_date: formattedDate, 
            search_time: formattedTime 
          })
        } else {
          console.log('✅ 経路をDBにキャッシュ保存完了（有効期限: 1時間）')
          console.log('   保存した日時（24時間形式）:', { 
            search_date: formattedDate, 
            search_time: formattedTime,
            search_hour: searchHour,
            search_minute: searchMinute,
            originalTime: timeString // 元の時刻（HH:mm形式）も記録
          })
        }
        // 検索結果エリアへ自動スクロール
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 100)
        
        // 履歴に追加（重複排除、最大10件）
        const newPair = { from: cleanDep, to: cleanArr }
        setRecentStations(prev => {
          // 同じペアが既に存在するかチェック
          const exists = prev.some(p => p.from === cleanDep && p.to === cleanArr)
          if (exists) {
            // 既に存在する場合は、先頭に移動
            const filtered = prev.filter(p => !(p.from === cleanDep && p.to === cleanArr))
            const updated = [newPair, ...filtered].slice(0, 10)
            localStorage.setItem('recentStations', JSON.stringify(updated))
            return updated
          } else {
            // 新規追加
            const updated = [newPair, ...prev].slice(0, 10)
            localStorage.setItem('recentStations', JSON.stringify(updated))
            return updated
          }
        })
      } else if (res.ok && data.routes && data.routes.length === 0) {
        setRoutes([])
        setError('指定された時間の経路は見つかりませんでした。別の時間を試してください')
      } else {
        setError(data.error || '経路が見つかりませんでした。時刻を少し遅らせてみてください。')
        setRoutes([])
      }
    } catch (e) { 
      console.error('通信エラー:', e)
      setError('通信エラーが発生しました') 
    } finally { 
      setLoading(false) 
    }
  }

  return (
    <div className="max-w-md mx-auto bg-[#F8F9FB] min-h-screen pb-24 font-sans text-slate-800">
      <div className="bg-white p-6 pt-6 rounded-b-[40px] shadow-sm border-b border-gray-100">
        {/* クイック検索：周辺駅ボタン（最上部に配置） */}
        <div className="mb-4 pt-6">
          <p className="text-[10px] text-gray-500 font-bold mb-3 ml-2 uppercase tracking-widest">クイック検索</p>
          <div 
            className="flex overflow-x-auto no-scrollbar gap-2 px-4 -mx-4"
            style={{
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {QUICK_STATIONS.map(s => (
              <button 
                key={s} 
                onClick={() => {
                  const name = s.endsWith('駅') ? s : `${s}駅`;
                  if (focusedField === 'dep') { 
                    setDeparture(name); 
                    setFocusedField('arr'); 
                  } else { 
                    setArrival(name); 
                  }
                }} 
                className="bg-gray-50 border border-gray-200 px-4 py-2 rounded-full text-xs font-black whitespace-nowrap active:bg-gray-100 transition-all hover:border-blue-300 hover:bg-blue-50 text-slate-700 flex-shrink-0"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* 最近の検索駅（履歴） */}
        {recentStations.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3 ml-2">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1">
                <History size={12} className="text-gray-400" />
                履歴
              </p>
              <button
                onClick={() => {
                  setRecentStations([])
                  localStorage.removeItem('recentStations')
                }}
                className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
                title="履歴をすべて削除"
              >
                すべて削除
              </button>
            </div>
            <div 
              className="flex overflow-x-auto no-scrollbar gap-2 px-4 -mx-4"
              style={{
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {recentStations.map((pair, idx) => {
                const fromName = pair.from.endsWith('駅') ? pair.from : `${pair.from}駅`
                const toName = pair.to.endsWith('駅') ? pair.to : `${pair.to}駅`
                return (
                  <div
                    key={`${pair.from}-${pair.to}-${idx}`}
                    className="bg-gray-50 border border-gray-200 rounded-full flex items-center gap-1 px-3 py-2 flex-shrink-0 group"
                  >
                    <button
                      onClick={() => {
                        setDeparture(fromName)
                        setArrival(toName)
                        setFocusedField('arr')
                      }}
                      className="text-xs font-black whitespace-nowrap active:bg-gray-100 transition-all hover:text-blue-600 text-slate-700"
                    >
                      {pair.from} → {pair.to}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const updated = recentStations.filter((_, i) => i !== idx);
                        setRecentStations(updated);
                        localStorage.setItem('recentStations', JSON.stringify(updated));
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                      title="この履歴を削除"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 出発地 目的地入力欄 */}
        <div className="flex items-center gap-2 mb-4 relative">
          <div className="flex-1 space-y-3">
            <div className={`relative transition-all ${focusedField === 'dep' ? 'scale-[1.02]' : ''}`}>
              <input 
                value={departure} 
                onFocus={() => setFocusedField('dep')} 
                onChange={e => setDeparture(e.target.value)}
                className="w-full bg-[#EDF1F7] rounded-full py-3.5 px-12 font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 text-black placeholder:text-slate-400" 
                placeholder="出発駅" 
              />
              <MapPin className="absolute left-4 top-4 text-blue-500" size={20} />
            </div>
            <div className={`relative transition-all ${focusedField === 'arr' ? 'scale-[1.02]' : ''}`}>
              <input 
                value={arrival} 
                onFocus={() => setFocusedField('arr')} 
                onChange={e => setArrival(e.target.value)}
                className="w-full bg-[#EDF1F7] rounded-full py-3.5 px-12 font-bold focus:outline-none focus:ring-2 focus:ring-green-400 text-black placeholder:text-slate-400" 
                placeholder="到着駅" 
              />
              <MapPin className="absolute left-4 top-4 text-green-500" size={20} />
            </div>
          </div>
          <button 
            onClick={() => {setDeparture(arrival); setArrival(departure)}} 
            className="bg-white p-2.5 rounded-full shadow-lg absolute left-[45%] z-10 border border-gray-100 active:scale-95 transition-transform"
          >
            <ArrowUpDown size={18} className="text-blue-600" />
          </button>
        </div>

        {/* 現在時刻に設定ボタン */}
        <div className="mb-2">
          <button
            onClick={() => {
              const now = new Date()
              // 日付を設定
              const dateStr = now.toISOString().split('T')[0]
              setSearchDate(dateStr)
              setSearchYear(String(now.getFullYear()))
              setSearchMonth(String(now.getMonth() + 1).padStart(2, '0'))
              setSearchDay(String(now.getDate()).padStart(2, '0'))
              // 時刻を設定
              const hours = String(now.getHours()).padStart(2, '0')
              const minutes = String(now.getMinutes()).padStart(2, '0')
              setSearchHour(hours)
              setSearchMinute(minutes)
            }}
            className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 border border-blue-200"
          >
            <Clock size={12} className="text-blue-600" />
            現在時刻に設定
          </button>
        </div>

        {/* 出発日 & 出発時刻（横並び） */}
        <div className="mb-4 p-4 bg-slate-50 rounded-2xl border border-gray-200 shadow-sm">
          <div className="w-full overflow-hidden flex items-center gap-2">
            {/* 日付選択（左側） - 年/月/日形式 */}
            <div className="flex-[1.5] min-w-0">
              <label className="text-xs text-gray-600 font-bold mb-2 block">
                <Calendar size={14} className="text-blue-600 inline mr-1" />
                出発日
              </label>
              <div className="flex items-center gap-1">
                {/* 年選択 */}
                <select
                  value={searchYear}
                  onChange={(e) => setSearchYear(e.target.value)}
                  className="flex-1 min-w-0 bg-white border-2 border-gray-300 rounded-xl px-1 py-2.5 font-black text-gray-900 text-[13px] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23334155' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.25rem center',
                    paddingRight: '1rem',
                    fontFamily: 'inherit'
                  }}
                >
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = String(new Date().getFullYear() + i - 1)
                    return (
                      <option key={year} value={year} className="bg-white text-gray-900">
                        {year}
                      </option>
                    )
                  })}
                </select>
                <span className="text-gray-700 font-black text-xs flex-shrink-0">/</span>
                {/* 月選択 */}
                <select
                  value={searchMonth}
                  onChange={(e) => setSearchMonth(e.target.value)}
                  className="flex-1 min-w-0 bg-white border-2 border-gray-300 rounded-xl px-1 py-2.5 font-black text-gray-900 text-[13px] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23334155' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.25rem center',
                    paddingRight: '1rem',
                    fontFamily: 'inherit'
                  }}
                >
                  {Array.from({ length: 12 }, (_, i) => {
                    const month = String(i + 1).padStart(2, '0')
                    return (
                      <option key={month} value={month} className="bg-white text-gray-900">
                        {month}
                      </option>
                    )
                  })}
                </select>
                <span className="text-gray-700 font-black text-xs flex-shrink-0">/</span>
                {/* 日選択 */}
                <select
                  value={searchDay}
                  onChange={(e) => setSearchDay(e.target.value)}
                  className="flex-1 min-w-0 bg-white border-2 border-gray-300 rounded-xl px-1 py-2.5 font-black text-gray-900 text-[13px] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23334155' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.25rem center',
                    paddingRight: '1rem',
                    fontFamily: 'inherit'
                  }}
                >
                  {Array.from({ length: 31 }, (_, i) => {
                    const day = String(i + 1).padStart(2, '0')
                    return (
                      <option key={day} value={day} className="bg-white text-gray-900">
                        {day}
                      </option>
                    )
                  })}
                </select>
              </div>
            </div>

            {/* 時刻選択（右側） */}
            <div className="flex-1 min-w-0">
              <label className="text-xs text-gray-600 font-bold mb-2 block">
                <Clock size={14} className="text-blue-600 inline mr-1" />
                出発時刻
                <span className="text-[10px] text-gray-400 font-normal ml-1">(24h)</span>
              </label>
              <div className="flex items-center gap-1">
                {/* 時選択（00-23） */}
                <select
                  value={searchHour}
                  onChange={(e) => setSearchHour(e.target.value)}
                  className="flex-1 min-w-0 bg-white border-2 border-gray-300 rounded-xl px-1 py-2.5 font-black text-gray-900 text-[13px] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23334155' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.25rem center',
                    paddingRight: '1rem',
                    fontFamily: 'inherit'
                  }}
                >
                  {Array.from({ length: 24 }, (_, i) => {
                    const hour = String(i).padStart(2, '0')
                    return (
                      <option key={hour} value={hour} className="bg-white text-gray-900">
                        {hour}
                      </option>
                    )
                  })}
                </select>
                
                {/* コロン */}
                <span className="text-gray-700 font-black text-[13px] flex-shrink-0">:</span>
                
                {/* 分選択（00-59） */}
                <select
                  value={searchMinute}
                  onChange={(e) => setSearchMinute(e.target.value)}
                  className="flex-1 min-w-0 bg-white border-2 border-gray-300 rounded-xl px-1 py-2.5 font-black text-gray-900 text-[13px] focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23334155' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.25rem center',
                    paddingRight: '1rem',
                    fontFamily: 'inherit'
                  }}
                >
                  {Array.from({ length: 60 }, (_, i) => {
                    const minute = String(i).padStart(2, '0')
                    return (
                      <option key={minute} value={minute} className="bg-white text-gray-900">
                        {minute}
                      </option>
                    )
                  })}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 検索タイプ選択 */}
        <div className="mb-4">
          <label className="text-xs text-gray-600 font-bold mb-2 block">検索タイプ</label>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => setSearchType('departure')}
              className={`px-3 py-2.5 rounded-xl font-black text-xs transition-all ${
                searchType === 'departure'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
              }`}
            >
              出発
            </button>
            <button
              onClick={() => setSearchType('arrival')}
              className={`px-3 py-2.5 rounded-xl font-black text-xs transition-all ${
                searchType === 'arrival'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
              }`}
            >
              到着
            </button>
            <button
              onClick={() => setSearchType('first')}
              className={`px-3 py-2.5 rounded-xl font-black text-xs transition-all ${
                searchType === 'first'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
              }`}
            >
              始発
            </button>
            <button
              onClick={() => setSearchType('last')}
              className={`px-3 py-2.5 rounded-xl font-black text-xs transition-all ${
                searchType === 'last'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
              }`}
            >
              終電
            </button>
          </div>
        </div>

        {/* 検索ボタン */}
        <button 
          onClick={() => handleSearch(false)} 
          disabled={loading} 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-full font-black text-lg shadow-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70"
        >
          {loading ? "時刻表を照会中..." : <><Search size={20}/> 検索</>}
        </button>
      </div>

      <div ref={resultsRef} className="px-6 space-y-6">
        {/* キャッシュから取得した場合の表示 */}
        {isCached && routes.length > 0 && (
          <div className="p-3 bg-green-50 text-green-700 rounded-xl text-center text-xs font-bold flex items-center justify-center gap-2 border border-green-200">
            <Clock size={14} />
            キャッシュから取得しました（高速表示）
          </div>
        )}

        {/* 始発表示の場合のメッセージ */}
        {isFirstTrain && routes.length > 0 && (
          <div className="p-4 bg-amber-50 text-amber-700 rounded-2xl text-center font-bold flex flex-col items-center gap-2 border border-amber-200">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} />
              本日の運行は終了しました
            </div>
            <div className="text-xs font-medium opacity-80">
              始発（5:00以降）の情報を表示しています
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-center font-bold flex items-center justify-center gap-2 border border-red-100">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {routes.map((route, idx) => {
          // ResourceURI形式のレスポンスの場合
          if (route.type === 'resourceURI' && route.resourceURI) {
            return (
              <div 
                key={idx} 
                className="bg-white rounded-[35px] overflow-hidden shadow-xl border border-gray-50 animate-fade-in"
              >
                <div className="p-6">
                  {/* 1. iframeでアプリ内に埋め込み（最初に表示） */}
                  <div className="relative w-full h-[600px] rounded-2xl overflow-hidden shadow-2xl border-none mb-4">
                    {iframeLoading && (
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                          <p className="text-sm font-bold text-gray-600">時刻表を生成中...</p>
                        </div>
                      </div>
                    )}
                    <iframe
                      src={route.resourceURI}
                      className="w-full h-full border-none rounded-2xl"
                      onLoad={() => setIframeLoading(false)}
                      title="駅すぱあと 時刻表"
                      sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                      style={{
                        opacity: iframeLoading ? 0 : 1,
                        transition: 'opacity 0.5s ease-in-out'
                      }}
                    />
                  </div>

                  {/* 2. 詳細な経路情報ボタン */}
                  <a
                    href={route.resourceURI}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-black text-sm shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] mb-2"
                  >
                    <ExternalLink size={16} />
                    詳細な経路情報
                  </a>

                  {/* 3. 外部サイトで開くボタン */}
                  <a
                    href={route.resourceURI}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-black text-sm shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] mb-2"
                  >
                    <ExternalLink size={16} />
                    外部サイトで開く
                  </a>

                  <p className="text-xs text-gray-500 mt-3 text-center">
                    ※ 外部サイトのコンテンツをアプリ内で表示しています
                  </p>
                </div>
              </div>
            )
          }
          
          // 通常の経路データの場合
          return (
            <div key={idx} className="bg-white rounded-[35px] overflow-hidden shadow-xl border border-gray-50">
              <div className="bg-slate-800 p-6 text-white">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-blue-400" />
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">最速</span>
                  </div>
                  <div className="text-xl font-black text-green-400">¥{route.summary?.fare?.total || '---'}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-black tracking-tighter flex items-center">
                    {formatTime(route.summary.start_time)}
                    <div className="flex flex-col items-center mx-3">
                      <ArrowRight size={16} className="text-blue-500" />
                    </div>
                    {formatTime(route.summary.arrival_time)}
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold opacity-50">所要時間</div>
                    <div className="text-lg font-black text-blue-400">{route.summary.move.time}分</div>
                  </div>
                </div>
              </div>

              <div className="p-6 relative">
                <div className="space-y-8">
                  {route.sections && route.sections.map((section: any, sIdx: number) => (
                    <div key={sIdx} className="flex gap-6">
                      <div className="w-12 h-12 bg-white border-4 border-blue-600 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                        <Train size={24} />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-black text-slate-800 bg-blue-50 px-3 py-1 rounded-lg inline-block mb-2">
                          {section.transit?.line?.name || "JR 琵琶湖線"}
                        </div>
                        <div className="text-xs font-black text-slate-600">
                          {section.transit?.from?.name} <span className="mx-1 opacity-30">→</span> {section.transit?.to?.name}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}

        {/* 最新の情報に更新ボタン */}
        {routes.length > 0 && (
          <div className="pt-4 pb-2">
            <button
              onClick={() => handleSearch(true)}
              disabled={loading}
              className="w-full py-3 text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              最新の情報に更新（キャッシュを無視してAPIを叩く）
            </button>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  )
}
