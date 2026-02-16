/**
 * GTFS（General Transit Feed Specification）パーサー
 * 
 * 滋賀県の公共交通オープンデータ（GTFS形式）を解析するためのパーサー
 * 
 * @example
 * ```typescript
 * // 彦根駅の時刻表を取得
 * const timetable = await getStationTimetable('彦根駅')
 * 
 * // 次の5本の列車を取得
 * const nextTrains = getNextTrains(timetable, 5)
 * ```
 */

import fs from 'fs'
import path from 'path'

// ===== GTFS型定義 =====

/**
 * 停留所情報（stops.txt）
 */
export interface GTFSStop {
  stop_id: string
  stop_code?: string
  stop_name: string
  stop_desc?: string
  stop_lat: number
  stop_lon: number
  zone_id?: string
  stop_url?: string
  location_type?: number
  parent_station?: string
}

/**
 * 停留所時刻情報（stop_times.txt）
 */
export interface GTFSStopTime {
  trip_id: string
  arrival_time: string  // "HH:MM:SS" 形式
  departure_time: string  // "HH:MM:SS" 形式
  stop_id: string
  stop_sequence: number
  stop_headsign?: string
  pickup_type?: number
  drop_off_type?: number
  shape_dist_traveled?: number
}

/**
 * 運行パターン情報（trips.txt）
 */
export interface GTFSTrip {
  route_id: string
  service_id: string
  trip_id: string
  trip_headsign?: string
  trip_short_name?: string
  direction_id?: number
  block_id?: string
  shape_id?: string
  wheelchair_accessible?: number
  bikes_allowed?: number
}

/**
 * 路線情報（routes.txt）
 */
export interface GTFSRoute {
  route_id: string
  agency_id?: string
  route_short_name?: string
  route_long_name: string
  route_desc?: string
  route_type: number
  route_url?: string
  route_color?: string
  route_text_color?: string
}

/**
 * 運行カレンダー情報（calendar.txt）
 */
export interface GTFSCalendar {
  service_id: string
  monday: number  // 0 or 1
  tuesday: number
  wednesday: number
  thursday: number
  friday: number
  saturday: number
  sunday: number
  start_date: string  // "YYYYMMDD" 形式
  end_date: string  // "YYYYMMDD" 形式
}

/**
 * 変換後の時刻表オブジェクト
 */
export interface StationTimetable {
  stationId: string
  stationName: string
  trains: TrainTimetable[]
}

/**
 * 変換後の列車時刻表
 */
export interface TrainTimetable {
  tripId: string
  departureTime: string  // "HH:MM" 形式
  arrivalTime: string  // "HH:MM" 形式
  routeName: string
  destination: string
  direction?: number
}

// ===== CSVパーサー =====

/**
 * CSVファイルを読み込んでオブジェクトの配列に変換
 * GTFS形式のCSVを正しくパース（引用符やカンマを含むフィールドに対応）
 */
function parseCSV<T extends Record<string, string>>(
  filePath: string,
  mapper: (row: Record<string, string>) => T
): T[] {
  try {
    // ファイルが存在するかチェック
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ [GTFS Parser] ファイルが存在しません: ${filePath}`)
      return []
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const lines = fileContent.split('\n').filter(line => line.trim())
    
    if (lines.length === 0) {
      return []
    }
    
    // ヘッダー行を取得（引用符を除去）
    const headers = parseCSVLine(lines[0])
    
    // データ行をパース
    const data: T[] = []
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      const row: Record<string, string> = {}
      
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      
      data.push(mapper(row))
    }
    
    return data
  } catch (error: any) {
    console.error(`❌ [GTFS Parser] CSV読み込みエラー (${filePath}):`, error.message)
    return []
  }
}

/**
 * CSV行をパース（引用符で囲まれたフィールドに対応）
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  // 最後のフィールドを追加
  result.push(current.trim())
  
  return result
}

// ===== GTFSファイル読み込み =====

/**
 * GTFSファイルのベースパス
 * Next.jsでは、publicディレクトリはビルド時にコピーされるため、
 * サーバーサイドからは直接fsで読み込む必要がある
 */
const GTFS_BASE_PATH = path.join(process.cwd(), 'public', 'gtfs')

/**
 * stops.txtを読み込む
 */
function loadStops(): GTFSStop[] {
  const filePath = path.join(GTFS_BASE_PATH, 'stops.txt')
  
  return parseCSV<GTFSStop>(filePath, (row) => ({
    stop_id: row.stop_id || '',
    stop_code: row.stop_code,
    stop_name: row.stop_name || '',
    stop_desc: row.stop_desc,
    stop_lat: parseFloat(row.stop_lat || '0'),
    stop_lon: parseFloat(row.stop_lon || '0'),
    zone_id: row.zone_id,
    stop_url: row.stop_url,
    location_type: row.location_type ? parseInt(row.location_type) : undefined,
    parent_station: row.parent_station,
  }))
}

/**
 * stop_times.txtを読み込む
 */
function loadStopTimes(): GTFSStopTime[] {
  const filePath = path.join(GTFS_BASE_PATH, 'stop_times.txt')
  
  return parseCSV<GTFSStopTime>(filePath, (row) => ({
    trip_id: row.trip_id || '',
    arrival_time: row.arrival_time || '',
    departure_time: row.departure_time || '',
    stop_id: row.stop_id || '',
    stop_sequence: parseInt(row.stop_sequence || '0'),
    stop_headsign: row.stop_headsign,
    pickup_type: row.pickup_type ? parseInt(row.pickup_type) : undefined,
    drop_off_type: row.drop_off_type ? parseInt(row.drop_off_type) : undefined,
    shape_dist_traveled: row.shape_dist_traveled ? parseFloat(row.shape_dist_traveled) : undefined,
  }))
}

/**
 * trips.txtを読み込む
 */
function loadTrips(): GTFSTrip[] {
  const filePath = path.join(GTFS_BASE_PATH, 'trips.txt')
  
  return parseCSV<GTFSTrip>(filePath, (row) => ({
    route_id: row.route_id || '',
    service_id: row.service_id || '',
    trip_id: row.trip_id || '',
    trip_headsign: row.trip_headsign,
    trip_short_name: row.trip_short_name,
    direction_id: row.direction_id ? parseInt(row.direction_id) : undefined,
    block_id: row.block_id,
    shape_id: row.shape_id,
    wheelchair_accessible: row.wheelchair_accessible ? parseInt(row.wheelchair_accessible) : undefined,
    bikes_allowed: row.bikes_allowed ? parseInt(row.bikes_allowed) : undefined,
  }))
}

/**
 * routes.txtを読み込む
 */
function loadRoutes(): GTFSRoute[] {
  const filePath = path.join(GTFS_BASE_PATH, 'routes.txt')
  
  return parseCSV<GTFSRoute>(filePath, (row) => ({
    route_id: row.route_id || '',
    agency_id: row.agency_id,
    route_short_name: row.route_short_name,
    route_long_name: row.route_long_name || '',
    route_desc: row.route_desc,
    route_type: parseInt(row.route_type || '0'),
    route_url: row.route_url,
    route_color: row.route_color,
    route_text_color: row.route_text_color,
  }))
}

/**
 * calendar.txtを読み込む
 */
function loadCalendar(): GTFSCalendar[] {
  const filePath = path.join(GTFS_BASE_PATH, 'calendar.txt')
  
  return parseCSV<GTFSCalendar>(filePath, (row) => ({
    service_id: row.service_id || '',
    monday: parseInt(row.monday || '0'),
    tuesday: parseInt(row.tuesday || '0'),
    wednesday: parseInt(row.wednesday || '0'),
    thursday: parseInt(row.thursday || '0'),
    friday: parseInt(row.friday || '0'),
    saturday: parseInt(row.saturday || '0'),
    sunday: parseInt(row.sunday || '0'),
    start_date: row.start_date || '',
    end_date: row.end_date || '',
  }))
}

// ===== キャッシュ =====

let stopsCache: GTFSStop[] | null = null
let stopTimesCache: GTFSStopTime[] | null = null
let tripsCache: GTFSTrip[] | null = null
let routesCache: GTFSRoute[] | null = null
let calendarCache: GTFSCalendar[] | null = null

/**
 * GTFSデータをキャッシュから取得（なければ読み込む）
 */
function getCachedData() {
  if (!stopsCache) {
    stopsCache = loadStops()
    console.log(`📊 [GTFS] stops.txt 読み込み完了: ${stopsCache.length}件`)
  }
  if (!stopTimesCache) {
    stopTimesCache = loadStopTimes()
    console.log(`📊 [GTFS] stop_times.txt 読み込み完了: ${stopTimesCache.length}件`)
  }
  if (!tripsCache) {
    tripsCache = loadTrips()
    console.log(`📊 [GTFS] trips.txt 読み込み完了: ${tripsCache.length}件`)
  }
  if (!routesCache) {
    routesCache = loadRoutes()
    console.log(`📊 [GTFS] routes.txt 読み込み完了: ${routesCache.length}件`)
  }
  if (!calendarCache) {
    calendarCache = loadCalendar()
    console.log(`📊 [GTFS] calendar.txt 読み込み完了: ${calendarCache.length}件`)
  }
  
  return {
    stops: stopsCache,
    stopTimes: stopTimesCache,
    trips: tripsCache,
    routes: routesCache,
    calendar: calendarCache,
  }
}

// ===== 時刻表取得 =====

/**
 * 駅名から停留所を検索（部分一致）
 */
function findStopByName(stationName: string): GTFSStop | null {
  const { stops } = getCachedData()
  
  // 完全一致を優先
  const exactMatch = stops.find(s => s.stop_name === stationName || s.stop_name === `${stationName}駅`)
  if (exactMatch) return exactMatch
  
  // 部分一致
  const partialMatch = stops.find(s => 
    s.stop_name.includes(stationName) || 
    stationName.includes(s.stop_name.replace('駅', ''))
  )
  
  return partialMatch || null
}

/**
 * 現在の曜日に該当するservice_idを取得
 */
function getCurrentServiceIds(): string[] {
  const { calendar } = getCachedData()
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=日, 1=月, ..., 6=土
  
  const today = now.toISOString().split('T')[0].replace(/-/g, '') // "YYYYMMDD"
  
  return calendar
    .filter(cal => {
      // 日付範囲チェック
      if (cal.start_date > today || cal.end_date < today) {
        return false
      }
      
      // 曜日チェック
      const dayMap = [cal.sunday, cal.monday, cal.tuesday, cal.wednesday, cal.thursday, cal.friday, cal.saturday]
      return dayMap[dayOfWeek] === 1
    })
    .map(cal => cal.service_id)
}

/**
 * 時刻文字列（"HH:MM:SS"）を分に変換
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * 時刻文字列（"HH:MM:SS"）を"HH:MM"形式に変換
 */
function formatTime(time: string): string {
  return time.substring(0, 5) // "HH:MM:SS" → "HH:MM"
}

/**
 * 駅の時刻表を取得
 * 
 * @param stationName 駅名（例: "彦根"）
 * @returns 時刻表オブジェクト
 */
export async function getStationTimetable(stationName: string): Promise<StationTimetable | null> {
  try {
    const { stops, stopTimes, trips, routes } = getCachedData()
    
    // 1. 駅を検索
    const stop = findStopByName(stationName)
    if (!stop) {
      console.warn(`⚠️ [GTFS] 駅が見つかりません: ${stationName}`)
      return null
    }
    
    console.log(`🚉 [GTFS] 駅を発見: ${stop.stop_name} (${stop.stop_id})`)
    
    // 2. 現在の曜日に該当するservice_idを取得
    const serviceIds = getCurrentServiceIds()
    
    // 3. 該当駅のstop_timesを取得
    const stationStopTimes = stopTimes.filter(st => st.stop_id === stop.stop_id)
    
    // 4. trip_idからtrip情報を取得し、service_idでフィルタリング
    const validTrips = new Set<string>()
    stationStopTimes.forEach(st => {
      const trip = trips.find(t => t.trip_id === st.trip_id)
      if (trip && serviceIds.includes(trip.service_id)) {
        validTrips.add(st.trip_id)
      }
    })
    
    // 5. 有効なtripのstop_timesを取得
    const validStopTimes = stationStopTimes.filter(st => validTrips.has(st.trip_id))
    
    // 6. 時刻表を構築
    const trains: TrainTimetable[] = validStopTimes.map(st => {
      const trip = trips.find(t => t.trip_id === st.trip_id)!
      const route = routes.find(r => r.route_id === trip.route_id)
      
      return {
        tripId: st.trip_id,
        departureTime: formatTime(st.departure_time),
        arrivalTime: formatTime(st.arrival_time),
        routeName: route?.route_short_name || route?.route_long_name || '不明',
        destination: trip.trip_headsign || '不明',
        direction: trip.direction_id,
      }
    })
    
    // 7. 出発時刻でソート
    trains.sort((a, b) => {
      const aMinutes = timeToMinutes(a.departureTime + ':00')
      const bMinutes = timeToMinutes(b.departureTime + ':00')
      return aMinutes - bMinutes
    })
    
    return {
      stationId: stop.stop_id,
      stationName: stop.stop_name,
      trains,
    }
  } catch (error: any) {
    console.error(`❌ [GTFS] 時刻表取得エラー:`, error)
    return null
  }
}

/**
 * 現在時刻に基づいて、次の出発時刻の列車を取得
 * 
 * @param timetable 時刻表
 * @param limit 取得件数
 * @returns 次の列車の配列
 */
export function getNextTrains(
  timetable: StationTimetable,
  limit: number = 5
): TrainTimetable[] {
  const now = new Date()
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  const currentMinutes = timeToMinutes(currentTime + ':00')
  
  // 現在時刻以降の列車をフィルタリング
  const nextTrains = timetable.trains
    .filter(train => {
      const depMinutes = timeToMinutes(train.departureTime + ':00')
      return depMinutes >= currentMinutes
    })
    .slice(0, limit)
  
  return nextTrains
}

/**
 * 特定の行先への列車を取得
 * 
 * @param timetable 時刻表
 * @param destination 行先（部分一致）
 * @returns 該当する列車の配列
 */
export function getTrainsToDestination(
  timetable: StationTimetable,
  destination: string
): TrainTimetable[] {
  const normalizedDestination = destination.toLowerCase()
  
  return timetable.trains.filter(train => {
    const normalizedDest = train.destination.toLowerCase()
    return normalizedDest.includes(normalizedDestination) || 
           normalizedDestination.includes(normalizedDest)
  })
}

/**
 * 全ての停留所を取得
 */
export function getAllStops(): GTFSStop[] {
  const { stops } = getCachedData()
  return stops
}

/**
 * 停留所名で検索（部分一致）
 */
export function searchStops(query: string): GTFSStop[] {
  const { stops } = getCachedData()
  const normalizedQuery = query.toLowerCase()
  
  return stops.filter(stop => 
    stop.stop_name.toLowerCase().includes(normalizedQuery) ||
    normalizedQuery.includes(stop.stop_name.toLowerCase().replace('駅', ''))
  )
}
