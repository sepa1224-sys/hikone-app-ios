/**
 * GTFSデータ一括インポートスクリプト
 * 
 * 指定したディレクトリにある複数のGTFSファイルをSupabaseに一括でインポートします
 * 
 * 使用方法:
 *   npx tsx scripts/import-gtfs.ts <GTFSディレクトリパス> <feed_id>
 * 
 * 例:
 *   npx tsx scripts/import-gtfs.ts ./public/gtfs/shiga shiga
 *   npx tsx scripts/import-gtfs.ts ./public/gtfs/kyoto kyoto
 */

import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// ===== 設定 =====

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kawntunevmabyxqmhqnv.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY 環境変数が設定されていません')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// ===== 型定義 =====

interface GTFSStop {
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

interface GTFSRoute {
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

interface GTFSTrip {
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

interface GTFSStopTime {
  trip_id: string
  arrival_time: string
  departure_time: string
  stop_id: string
  stop_sequence: number
  stop_headsign?: string
  pickup_type?: number
  drop_off_type?: number
  shape_dist_traveled?: number
}

interface GTFSCalendar {
  service_id: string
  monday: number
  tuesday: number
  wednesday: number
  thursday: number
  friday: number
  saturday: number
  sunday: number
  start_date: string  // "YYYYMMDD"
  end_date: string    // "YYYYMMDD"
}

// ===== CSVパーサー =====

/**
 * CSVファイルを読み込んでオブジェクトの配列に変換
 */
function parseCSV<T extends Record<string, string>>(
  filePath: string,
  mapper: (row: Record<string, string>) => T
): T[] {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  ファイルが存在しません: ${filePath}`)
      return []
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const lines = fileContent.split('\n').filter(line => line.trim())
    
    if (lines.length === 0) {
      return []
    }
    
    const headers = parseCSVLine(lines[0])
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
    console.error(`❌ CSV読み込みエラー (${filePath}):`, error.message)
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
  
  result.push(current.trim())
  return result
}

// ===== データ変換関数 =====

/**
 * 時刻文字列をTIME型に変換（"HH:MM:SS" → TIME）
 * 24時間を超える時刻（例: "25:30:00"）は "01:30:00" に変換
 */
function parseTime(timeStr: string): string | null {
  if (!timeStr || timeStr.trim() === '') return null
  
  const parts = timeStr.split(':')
  if (parts.length < 2) return null
  
  let hours = parseInt(parts[0], 10)
  const minutes = parseInt(parts[1], 10)
  const seconds = parts[2] ? parseInt(parts[2], 10) : 0
  
  // 24時間を超える時刻を処理
  if (hours >= 24) {
    hours = hours % 24
  }
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

/**
 * 日付文字列をDATE型に変換（"YYYYMMDD" → "YYYY-MM-DD"）
 */
function parseDate(dateStr: string): string {
  if (dateStr.length === 8) {
    return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`
  }
  return dateStr
}

// ===== インポート関数 =====

/**
 * stops.txtをインポート
 */
async function importStops(gtfsDir: string, feedId: string): Promise<number> {
  const filePath = path.join(gtfsDir, 'stops.txt')
  const stops = parseCSV<GTFSStop>(filePath, (row) => ({
    stop_id: row.stop_id || '',
    stop_code: row.stop_code,
    stop_name: row.stop_name || '',
    stop_desc: row.stop_desc,
    stop_lat: parseFloat(row.stop_lat || '0'),
    stop_lon: parseFloat(row.stop_lon || '0'),
    zone_id: row.zone_id,
    stop_url: row.stop_url,
    location_type: row.location_type ? parseInt(row.location_type) : 0,
    parent_station: row.parent_station,
  }))
  
  if (stops.length === 0) {
    console.warn('⚠️  stops.txt にデータがありません')
    return 0
  }
  
  // 既存データを削除（同じfeed_idのデータ）
  const { error: deleteError } = await supabase
    .from('gtfs_stops')
    .delete()
    .eq('feed_id', feedId)
  
  if (deleteError) {
    console.error('❌ 既存データの削除エラー:', deleteError)
    throw deleteError
  }
  
  // バッチ挿入（Supabaseの制限: 最大1000件ずつ）
  const batchSize = 1000
  let imported = 0
  
  for (let i = 0; i < stops.length; i += batchSize) {
    const batch = stops.slice(i, i + batchSize).map(stop => ({
      feed_id: feedId,
      stop_id: stop.stop_id,
      stop_code: stop.stop_code || null,
      stop_name: stop.stop_name,
      stop_desc: stop.stop_desc || null,
      stop_lat: stop.stop_lat,
      stop_lon: stop.stop_lon,
      zone_id: stop.zone_id || null,
      stop_url: stop.stop_url || null,
      location_type: stop.location_type || 0,
      parent_station: stop.parent_station || null,
    }))
    
    const { error } = await supabase
      .from('gtfs_stops')
      .insert(batch)
    
    if (error) {
      console.error(`❌ stops インポートエラー (バッチ ${Math.floor(i / batchSize) + 1}):`, error)
      throw error
    }
    
    imported += batch.length
    process.stdout.write(`\r📊 stops: ${imported}/${stops.length} 件インポート中...`)
  }
  
  console.log(`\n✅ stops: ${imported} 件インポート完了`)
  return imported
}

/**
 * routes.txtをインポート
 */
async function importRoutes(gtfsDir: string, feedId: string): Promise<number> {
  const filePath = path.join(gtfsDir, 'routes.txt')
  const routes = parseCSV<GTFSRoute>(filePath, (row) => ({
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
  
  if (routes.length === 0) {
    console.warn('⚠️  routes.txt にデータがありません')
    return 0
  }
  
  const { error: deleteError } = await supabase
    .from('gtfs_routes')
    .delete()
    .eq('feed_id', feedId)
  
  if (deleteError) {
    console.error('❌ 既存データの削除エラー:', deleteError)
    throw deleteError
  }
  
  const batchSize = 1000
  let imported = 0
  
  for (let i = 0; i < routes.length; i += batchSize) {
    const batch = routes.slice(i, i + batchSize).map(route => ({
      feed_id: feedId,
      route_id: route.route_id,
      agency_id: route.agency_id || null,
      route_short_name: route.route_short_name || null,
      route_long_name: route.route_long_name,
      route_desc: route.route_desc || null,
      route_type: route.route_type,
      route_url: route.route_url || null,
      route_color: route.route_color || null,
      route_text_color: route.route_text_color || null,
    }))
    
    const { error } = await supabase
      .from('gtfs_routes')
      .insert(batch)
    
    if (error) {
      console.error(`❌ routes インポートエラー (バッチ ${Math.floor(i / batchSize) + 1}):`, error)
      throw error
    }
    
    imported += batch.length
    process.stdout.write(`\r📊 routes: ${imported}/${routes.length} 件インポート中...`)
  }
  
  console.log(`\n✅ routes: ${imported} 件インポート完了`)
  return imported
}

/**
 * trips.txtをインポート
 */
async function importTrips(gtfsDir: string, feedId: string): Promise<number> {
  const filePath = path.join(gtfsDir, 'trips.txt')
  const trips = parseCSV<GTFSTrip>(filePath, (row) => ({
    route_id: row.route_id || '',
    service_id: row.service_id || '',
    trip_id: row.trip_id || '',
    trip_headsign: row.trip_headsign,
    trip_short_name: row.trip_short_name,
    direction_id: row.direction_id ? parseInt(row.direction_id) : null,
    block_id: row.block_id,
    shape_id: row.shape_id,
    wheelchair_accessible: row.wheelchair_accessible ? parseInt(row.wheelchair_accessible) : null,
    bikes_allowed: row.bikes_allowed ? parseInt(row.bikes_allowed) : null,
  }))
  
  if (trips.length === 0) {
    console.warn('⚠️  trips.txt にデータがありません')
    return 0
  }
  
  const { error: deleteError } = await supabase
    .from('gtfs_trips')
    .delete()
    .eq('feed_id', feedId)
  
  if (deleteError) {
    console.error('❌ 既存データの削除エラー:', deleteError)
    throw deleteError
  }
  
  const batchSize = 1000
  let imported = 0
  
  for (let i = 0; i < trips.length; i += batchSize) {
    const batch = trips.slice(i, i + batchSize).map(trip => ({
      feed_id: feedId,
      route_id: trip.route_id,
      service_id: trip.service_id,
      trip_id: trip.trip_id,
      trip_headsign: trip.trip_headsign || null,
      trip_short_name: trip.trip_short_name || null,
      direction_id: trip.direction_id ?? null,
      block_id: trip.block_id || null,
      shape_id: trip.shape_id || null,
      wheelchair_accessible: trip.wheelchair_accessible ?? null,
      bikes_allowed: trip.bikes_allowed ?? null,
    }))
    
    const { error } = await supabase
      .from('gtfs_trips')
      .insert(batch)
    
    if (error) {
      console.error(`❌ trips インポートエラー (バッチ ${Math.floor(i / batchSize) + 1}):`, error)
      throw error
    }
    
    imported += batch.length
    process.stdout.write(`\r📊 trips: ${imported}/${trips.length} 件インポート中...`)
  }
  
  console.log(`\n✅ trips: ${imported} 件インポート完了`)
  return imported
}

/**
 * stop_times.txtをインポート
 */
async function importStopTimes(gtfsDir: string, feedId: string): Promise<number> {
  const filePath = path.join(gtfsDir, 'stop_times.txt')
  const stopTimes = parseCSV<GTFSStopTime>(filePath, (row) => ({
    trip_id: row.trip_id || '',
    arrival_time: row.arrival_time || '',
    departure_time: row.departure_time || '',
    stop_id: row.stop_id || '',
    stop_sequence: parseInt(row.stop_sequence || '0'),
    stop_headsign: row.stop_headsign,
    pickup_type: row.pickup_type ? parseInt(row.pickup_type) : 0,
    drop_off_type: row.drop_off_type ? parseInt(row.drop_off_type) : 0,
    shape_dist_traveled: row.shape_dist_traveled ? parseFloat(row.shape_dist_traveled) : null,
  }))
  
  if (stopTimes.length === 0) {
    console.warn('⚠️  stop_times.txt にデータがありません')
    return 0
  }
  
  const { error: deleteError } = await supabase
    .from('gtfs_stop_times')
    .delete()
    .eq('feed_id', feedId)
  
  if (deleteError) {
    console.error('❌ 既存データの削除エラー:', deleteError)
    throw deleteError
  }
  
  const batchSize = 1000
  let imported = 0
  
  for (let i = 0; i < stopTimes.length; i += batchSize) {
    const batch = stopTimes.slice(i, i + batchSize).map(st => ({
      feed_id: feedId,
      trip_id: st.trip_id,
      arrival_time: parseTime(st.arrival_time),
      departure_time: parseTime(st.departure_time) || '00:00:00',
      stop_id: st.stop_id,
      stop_sequence: st.stop_sequence,
      stop_headsign: st.stop_headsign || null,
      pickup_type: st.pickup_type || 0,
      drop_off_type: st.drop_off_type || 0,
      shape_dist_traveled: st.shape_dist_traveled ?? null,
    }))
    
    const { error } = await supabase
      .from('gtfs_stop_times')
      .insert(batch)
    
    if (error) {
      console.error(`❌ stop_times インポートエラー (バッチ ${Math.floor(i / batchSize) + 1}):`, error)
      throw error
    }
    
    imported += batch.length
    process.stdout.write(`\r📊 stop_times: ${imported}/${stopTimes.length} 件インポート中...`)
  }
  
  console.log(`\n✅ stop_times: ${imported} 件インポート完了`)
  return imported
}

/**
 * calendar.txtをインポート（オプション）
 */
async function importCalendar(gtfsDir: string, feedId: string): Promise<number> {
  const filePath = path.join(gtfsDir, 'calendar.txt')
  
  if (!fs.existsSync(filePath)) {
    console.log('ℹ️  calendar.txt が見つかりません（スキップ）')
    return 0
  }
  
  const calendars = parseCSV<GTFSCalendar>(filePath, (row) => ({
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
  
  if (calendars.length === 0) {
    return 0
  }
  
  const { error: deleteError } = await supabase
    .from('gtfs_calendar')
    .delete()
    .eq('feed_id', feedId)
  
  if (deleteError) {
    console.error('❌ 既存データの削除エラー:', deleteError)
    throw deleteError
  }
  
  const batch = calendars.map(cal => ({
    feed_id: feedId,
    service_id: cal.service_id,
    monday: cal.monday,
    tuesday: cal.tuesday,
    wednesday: cal.wednesday,
    thursday: cal.thursday,
    friday: cal.friday,
    saturday: cal.saturday,
    sunday: cal.sunday,
    start_date: parseDate(cal.start_date),
    end_date: parseDate(cal.end_date),
  }))
  
  const { error } = await supabase
    .from('gtfs_calendar')
    .insert(batch)
  
  if (error) {
    console.error('❌ calendar インポートエラー:', error)
    throw error
  }
  
  console.log(`✅ calendar: ${calendars.length} 件インポート完了`)
  return calendars.length
}

// ===== メイン処理 =====

async function main() {
  const args = process.argv.slice(2)
  
  if (args.length < 2) {
    console.error('❌ 使用方法: npx tsx scripts/import-gtfs.ts <GTFSディレクトリパス> <feed_id>')
    console.error('   例: npx tsx scripts/import-gtfs.ts ./public/gtfs/shiga shiga')
    process.exit(1)
  }
  
  const gtfsDir = path.resolve(args[0])
  const feedId = args[1]
  
  if (!fs.existsSync(gtfsDir)) {
    console.error(`❌ ディレクトリが存在しません: ${gtfsDir}`)
    process.exit(1)
  }
  
  console.log(`🚀 GTFSデータのインポートを開始します`)
  console.log(`   ディレクトリ: ${gtfsDir}`)
  console.log(`   Feed ID: ${feedId}`)
  console.log('')
  
  try {
    // 順番にインポート（外部キー制約のため順序が重要）
    await importStops(gtfsDir, feedId)
    await importRoutes(gtfsDir, feedId)
    await importTrips(gtfsDir, feedId)
    await importStopTimes(gtfsDir, feedId)
    await importCalendar(gtfsDir, feedId)
    
    console.log('')
    console.log('✅ すべてのインポートが完了しました！')
  } catch (error: any) {
    console.error('')
    console.error('❌ インポート中にエラーが発生しました:', error.message)
    process.exit(1)
  }
}

main()
