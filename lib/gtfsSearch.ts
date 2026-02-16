/**
 * GTFS検索ロジック
 * 
 * 2つの座標（緯度経度）から最寄り駅を特定し、直近の出発便を検索する機能
 */

import { supabase } from './supabase'

// ===== 型定義 =====

export interface NearestStop {
  stop_id: string
  stop_name: string
  stop_lat: number
  stop_lon: number
  distance: number  // 距離（km）
  feed_id: string
}

export interface DepartureInfo {
  stop_id: string
  stop_name: string
  departure_time: string
  trip_id: string
  route_id: string
  route_name: string
  trip_headsign: string
  direction_id: number | null
  feed_id: string
}

export interface RouteSearchResult {
  fromStop: NearestStop
  toStop: NearestStop
  departures: DepartureInfo[]
}

// ===== 最寄り駅検索 =====

/**
 * 指定した座標から最寄りの停留所を検索
 * 
 * @param lat 緯度
 * @param lon 経度
 * @param radiusKm 検索半径（km、デフォルト: 5km）
 * @param limit 取得件数（デフォルト: 1）
 * @returns 最寄りの停留所の配列
 */
export async function findNearestStops(
  lat: number,
  lon: number,
  radiusKm: number = 5,
  limit: number = 1
): Promise<NearestStop[]> {
  // PostgreSQLのearthdistance拡張を使用して距離を計算
  // earth_distance関数は2点間の距離をメートル単位で返す
  const query = `
    SELECT 
      stop_id,
      stop_name,
      stop_lat,
      stop_lon,
      feed_id,
      (earth_distance(
        ll_to_earth(stop_lat, stop_lon),
        ll_to_earth($1, $2)
      ) / 1000.0) AS distance
    FROM gtfs_stops
    WHERE 
      earth_distance(
        ll_to_earth(stop_lat, stop_lon),
        ll_to_earth($1, $2)
      ) <= $3 * 1000  -- 半径をメートルに変換
    ORDER BY distance ASC
    LIMIT $4
  `
  
  const { data, error } = await supabase.rpc('find_nearest_stops', {
    lat_param: lat,
    lon_param: lon,
    radius_km: radiusKm,
    limit_param: limit
  })
  
  if (error) {
    // RPC関数が存在しない場合は、直接クエリを実行
    // 注意: Supabaseのクエリビルダーではearth_distance関数を直接使えないため、
    // 簡易的な距離計算を使用
    return await findNearestStopsFallback(lat, lon, radiusKm, limit)
  }
  
  return (data || []).map((row: any) => ({
    stop_id: row.stop_id,
    stop_name: row.stop_name,
    stop_lat: parseFloat(row.stop_lat),
    stop_lon: parseFloat(row.stop_lon),
    distance: parseFloat(row.distance),
    feed_id: row.feed_id,
  }))
}

/**
 * フォールバック: 簡易的な距離計算を使用した最寄り駅検索
 * ハバーサインの公式を使用（PostgreSQL関数が使えない場合）
 */
async function findNearestStopsFallback(
  lat: number,
  lon: number,
  radiusKm: number = 5,
  limit: number = 1
): Promise<NearestStop[]> {
  // まず広範囲で取得してから、アプリケーション側で距離計算
  // 緯度1度 ≈ 111km、経度1度 ≈ 111km * cos(緯度)
  const latDelta = radiusKm / 111.0
  const lonDelta = radiusKm / (111.0 * Math.cos(lat * Math.PI / 180))
  
  const { data, error } = await supabase
    .from('gtfs_stops')
    .select('stop_id, stop_name, stop_lat, stop_lon, feed_id')
    .gte('stop_lat', lat - latDelta)
    .lte('stop_lat', lat + latDelta)
    .gte('stop_lon', lon - lonDelta)
    .lte('stop_lon', lon + lonDelta)
  
  if (error) {
    console.error('最寄り駅検索エラー:', error)
    return []
  }
  
  // ハバーサインの公式で距離を計算してソート
  const stopsWithDistance = (data || []).map(stop => {
    const distance = calculateHaversineDistance(
      lat,
      lon,
      parseFloat(stop.stop_lat),
      parseFloat(stop.stop_lon)
    )
    return {
      stop_id: stop.stop_id,
      stop_name: stop.stop_name,
      stop_lat: parseFloat(stop.stop_lat),
      stop_lon: parseFloat(stop.stop_lon),
      distance,
      feed_id: stop.feed_id,
    }
  })
    .filter(stop => stop.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
  
  return stopsWithDistance
}

/**
 * ハバーサインの公式で2点間の距離を計算（km）
 */
function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
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

// ===== 直近の出発便検索 =====

/**
 * 指定した停留所から直近の出発便を検索
 * 
 * @param stopId 停留所ID
 * @param feedId フィードID
 * @param limit 取得件数（デフォルト: 10）
 * @param afterTime この時刻以降の便を検索（デフォルト: 現在時刻）
 * @returns 出発便の配列
 */
export async function findNextDepartures(
  stopId: string,
  feedId: string,
  limit: number = 10,
  afterTime?: string
): Promise<DepartureInfo[]> {
  // 現在時刻を取得（指定されていない場合）
  const currentTime = afterTime || new Date().toTimeString().substring(0, 8) // "HH:MM:SS"
  
  const { data, error } = await supabase
    .from('gtfs_stop_times')
    .select(`
      stop_id,
      departure_time,
      trip_id,
      feed_id,
      gtfs_trips!inner (
        route_id,
        trip_headsign,
        direction_id,
        gtfs_routes!inner (
          route_long_name,
          route_short_name
        )
      ),
      gtfs_stops!inner (
        stop_name
      )
    `)
    .eq('feed_id', feedId)
    .eq('stop_id', stopId)
    .gte('departure_time', currentTime)
    .order('departure_time', { ascending: true })
    .limit(limit)
  
  if (error) {
    console.error('出発便検索エラー:', error)
    return []
  }
  
  return (data || []).map((row: any) => ({
    stop_id: row.stop_id,
    stop_name: row.gtfs_stops?.stop_name || '',
    departure_time: row.departure_time,
    trip_id: row.trip_id,
    route_id: row.gtfs_trips?.route_id || '',
    route_name: row.gtfs_trips?.gtfs_routes?.route_short_name || 
                 row.gtfs_trips?.gtfs_routes?.route_long_name || 
                 '不明',
    trip_headsign: row.gtfs_trips?.trip_headsign || '不明',
    direction_id: row.gtfs_trips?.direction_id ?? null,
    feed_id: row.feed_id,
  }))
}

// ===== 2点間の経路検索 =====

/**
 * 2つの座標から最寄り駅を特定し、出発駅から直近の出発便を検索
 * 
 * @param fromLat 出発地点の緯度
 * @param fromLon 出発地点の経度
 * @param toLat 到着地点の緯度
 * @param toLon 到着地点の経度
 * @param radiusKm 最寄り駅検索の半径（km、デフォルト: 5km）
 * @param limit 取得する出発便の件数（デフォルト: 10）
 * @returns 検索結果
 */
export async function searchRoute(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
  radiusKm: number = 5,
  limit: number = 10
): Promise<RouteSearchResult | null> {
  // 1. 出発地点の最寄り駅を検索
  const fromStops = await findNearestStops(fromLat, fromLon, radiusKm, 1)
  if (fromStops.length === 0) {
    console.warn('出発地点の最寄り駅が見つかりません')
    return null
  }
  
  const fromStop = fromStops[0]
  
  // 2. 到着地点の最寄り駅を検索
  const toStops = await findNearestStops(toLat, toLon, radiusKm, 1)
  if (toStops.length === 0) {
    console.warn('到着地点の最寄り駅が見つかりません')
    return null
  }
  
  const toStop = toStops[0]
  
  // 3. 出発駅から直近の出発便を検索
  const departures = await findNextDepartures(fromStop.stop_id, fromStop.feed_id, limit)
  
  return {
    fromStop,
    toStop,
    departures,
  }
}
