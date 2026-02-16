/**
 * 公共交通オープンデータセンター（ODPT）API クライアント
 * 
 * 関西圏（滋賀、京都、大阪、福井、愛知）の鉄道時刻表を取得するためのAPIクライアント
 * 
 * @example
 * ```typescript
 * // 彦根駅の時刻表を取得（JR西日本・東海道線）
 * const timetable = await getStationTimetable({
 *   operator: 'odpt.Operator:JR-West',
 *   station: 'odpt.Station:JR-West.Tokaido.Hikone',
 *   calendar: 'odpt.Calendar:Weekday'
 * })
 * 
 * // 次の5本の列車を取得
 * const nextTrains = getNextTrains(timetable[0], 5)
 * 
 * // 京都行きの列車を取得
 * const trainsToKyoto = getTrainsToDestination(timetable[0], '京都')
 * ```
 * 
 * @requires ODPT_API_KEY 環境変数にAPIキーを設定してください
 * @see https://developer.odpt.org/
 */

// ===== 型定義 =====

/**
 * ODPT Operator ID（事業者ID）
 */
export type ODPTOperator =
  | 'odpt.Operator:JR-West'        // JR西日本
  | 'odpt.Operator:Keihan'        // 京阪電気鉄道
  | 'odpt.Operator:Kintetsu'      // 近畿日本鉄道
  | 'odpt.Operator:Meitetsu'      // 名古屋鉄道
  | 'odpt.Operator:Nagoya'         // 名古屋市交通局
  | 'odpt.Operator:Keio'           // 京王電鉄
  | 'odpt.Operator:Odakyu'         // 小田急電鉄
  | 'odpt.Operator:Tobu'           // 東武鉄道
  | 'odpt.Operator:Seibu'          // 西武鉄道
  | 'odpt.Operator:Tokyu'          // 東急電鉄

/**
 * ODPT APIのJSON-LD形式の駅時刻表レスポンス
 */
export interface ODPTStationTimetable {
  '@context': string
  '@id': string
  '@type': 'odpt:StationTimetable'
  'dc:title': string
  'odpt:operator': ODPTOperator
  'odpt:station': string
  'odpt:railway': string
  'odpt:railDirection': string
  'odpt:calendar': string
  'odpt:note': string | null
  'odpt:stationTimetableObject': ODPTTimetableObject[]
}

/**
 * 時刻表オブジェクト（1本の列車）
 */
export interface ODPTTimetableObject {
  'odpt:departureTime': string | null  // 出発時刻（例: "08:00"）
  'odpt:arrivalTime': string | null    // 到着時刻（例: "08:05"）
  'odpt:trainNumber': string | null   // 列車番号
  'odpt:trainType': string | null      // 列車種別（例: "odpt.TrainType:Local"）
  'odpt:destinationStation': string[]  // 行先駅（配列）
  'odpt:viaStation': string[] | null   // 経由駅
  'odpt:viaRailway': string[] | null   // 経由路線
  'odpt:trainName': string | null      // 列車名（例: "ひかり"）
  'odpt:trainOwner': string | null     // 車両所有者
}

/**
 * 変換後のシンプルな時刻表オブジェクト
 */
export interface StationTimetable {
  stationId: string
  stationName: string
  operator: string
  operatorId: ODPTOperator
  railway: string
  direction: string
  calendar: string
  trains: TrainTimetable[]
}

/**
 * 変換後の列車時刻表
 */
export interface TrainTimetable {
  departureTime: string | null      // "08:00" 形式
  arrivalTime: string | null        // "08:05" 形式
  trainNumber: string | null
  trainType: string | null           // "Local", "Rapid", "Express" など
  destinationStation: string[]       // 行先駅名の配列
  viaStation: string[] | null
  viaRailway: string[] | null
  trainName: string | null
  trainOwner: string | null
}

/**
 * APIリクエストパラメータ
 */
export interface StationTimetableParams {
  operator?: ODPTOperator | ODPTOperator[]  // 事業者ID（複数指定可）
  station?: string                            // 駅ID（例: "odpt.Station:JR-West.Tokaido.Hikone"）
  railway?: string                            // 路線ID
  railDirection?: string                      // 方向（例: "odpt.RailDirection:Outbound"）
  calendar?: string                           // カレンダー（例: "odpt.Calendar:Weekday"）
}

// ===== Operator ID マッピング =====

/**
 * Operator IDから事業者名を取得
 */
export const OPERATOR_NAMES: Record<ODPTOperator, string> = {
  'odpt.Operator:JR-West': 'JR西日本',
  'odpt.Operator:Keihan': '京阪電気鉄道',
  'odpt.Operator:Kintetsu': '近畿日本鉄道',
  'odpt.Operator:Meitetsu': '名古屋鉄道',
  'odpt.Operator:Nagoya': '名古屋市交通局',
  'odpt.Operator:Keio': '京王電鉄',
  'odpt.Operator:Odakyu': '小田急電鉄',
  'odpt.Operator:Tobu': '東武鉄道',
  'odpt.Operator:Seibu': '西武鉄道',
  'odpt.Operator:Tokyu': '東急電鉄',
}

// ===== 駅IDマッピング =====

/**
 * 駅名から正しいODPT駅IDを取得するマッピング
 * 路線ごとに駅IDが異なるため、主要駅については正しいIDを固定で返す
 */
export const STATION_ID_MAP: Record<string, string> = {
  // 滋賀・京都エリア（東海道線）
  '彦根': 'odpt.Station:JR-West.Tokaido.Hikone',
  '南彦根': 'odpt.Station:JR-West.Tokaido.MinamiHikone',
  '河瀬': 'odpt.Station:JR-West.Tokaido.Kawase',
  '稲枝': 'odpt.Station:JR-West.Tokaido.Inae',
  '米原': 'odpt.Station:JR-West.Tokaido.Maibara',
  '草津': 'odpt.Station:JR-West.Tokaido.Kusatsu',
  '京都': 'odpt.Station:JR-West.Tokaido.Kyoto',
  '大阪': 'odpt.Station:JR-West.Tokaido.Osaka',
  '長浜': 'odpt.Station:JR-West.Tokaido.Nagahama',
  '近江八幡': 'odpt.Station:JR-West.Tokaido.OmiHachiman',
  '野洲': 'odpt.Station:JR-West.Tokaido.Yasu',
  '大津': 'odpt.Station:JR-West.Tokaido.Otsu',
}

/**
 * 事業者名からOperator IDを取得（部分一致）
 */
export function getOperatorIdByName(name: string): ODPTOperator | null {
  const normalizedName = name.toLowerCase()
  
  if (normalizedName.includes('jr') && (normalizedName.includes('西') || normalizedName.includes('west'))) {
    return 'odpt.Operator:JR-West'
  }
  if (normalizedName.includes('京阪') || normalizedName.includes('keihan')) {
    return 'odpt.Operator:Keihan'
  }
  if (normalizedName.includes('近鉄') || normalizedName.includes('近畿') || normalizedName.includes('kintetsu')) {
    return 'odpt.Operator:Kintetsu'
  }
  if (normalizedName.includes('名鉄') || normalizedName.includes('meitetsu')) {
    return 'odpt.Operator:Meitetsu'
  }
  if (normalizedName.includes('名古屋市') || normalizedName.includes('nagoya')) {
    return 'odpt.Operator:Nagoya'
  }
  
  return null
}

// ===== APIクライアント =====

/**
 * ODPT APIのベースURL
 */
const ODPT_API_BASE_URL = 'https://api.odpt.org/api/v4'

/**
 * APIキーを取得（環境変数から）
 */
function getApiKey(): string {
  const apiKey = process.env.ODPT_API_KEY || process.env.NEXT_PUBLIC_ODPT_API_KEY
  if (!apiKey) {
    throw new Error('ODPT_API_KEY が設定されていません。環境変数を確認してください。')
  }
  return apiKey
}

/**
 * ODPT APIを呼び出す共通関数
 * 
 * 認証: APIキーをクエリパラメータ `acl:consumerKey` で渡す
 */
async function callODPTAPI(endpoint: string, params: Record<string, string | string[]> = {}): Promise<any> {
  const apiKey = getApiKey()
  
  // パラメータをURLSearchParamsに変換
  const searchParams = new URLSearchParams()
  
  // APIキーを追加（ODPT APIの標準的な認証方法）
  searchParams.append('acl:consumerKey', apiKey)
  
  // その他のパラメータを追加
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(v => searchParams.append(key, v))
    } else {
      searchParams.append(key, value)
    }
  })
  
  const url = `${ODPT_API_BASE_URL}/${endpoint}?${searchParams.toString()}`
  
  console.log(`🚃 [ODPT API] リクエスト: ${endpoint}`)
  console.log(`   URL: ${url.replace(apiKey, 'KEY_HIDDEN')}`)
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // キャッシュを無効化
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`ODPT API エラー: ${response.status} ${response.statusText} - ${errorText}`)
    }
    
    const data = await response.json()
    console.log(`✅ [ODPT API] レスポンス取得成功: ${Array.isArray(data) ? data.length : 1}件`)
    
    return data
  } catch (error: any) {
    console.error(`❌ [ODPT API] エラー:`, error.message)
    throw error
  }
}

/**
 * 駅時刻表を取得
 * 
 * @param params 検索パラメータ
 * @returns 駅時刻表の配列
 */
export async function getStationTimetable(
  params: StationTimetableParams = {}
): Promise<StationTimetable[]> {
  const apiParams: Record<string, string | string[]> = {}
  
  // パラメータを構築
  if (params.operator) {
    if (Array.isArray(params.operator)) {
      apiParams['odpt:operator'] = params.operator
    } else {
      apiParams['odpt:operator'] = params.operator
    }
  }
  
  if (params.station) {
    apiParams['odpt:station'] = params.station
  }
  
  if (params.railway) {
    apiParams['odpt:railway'] = params.railway
  }
  
  if (params.railDirection) {
    apiParams['odpt:railDirection'] = params.railDirection
  }
  
  // デバッグ用: calendarパラメータを一時的にコメントアウト（全ての時刻表を取得）
  // if (params.calendar) {
  //   apiParams['odpt:calendar'] = params.calendar
  // }
  
  // APIを呼び出し
  const data = await callODPTAPI('odpt:StationTimetable', apiParams)
  
  // JSON-LD形式の配列を変換
  const timetables: ODPTStationTimetable[] = Array.isArray(data) ? data : [data]
  
  // エラーログの強化: 0件の場合に警告を出す
  if (timetables.length === 0) {
    const stationId = params.station || '未指定'
    console.warn(`⚠️ [ODPT API] ID: ${stationId} のデータが見つかりません。IDが間違っている可能性があります`)
    console.warn(`   リクエストパラメータ:`, apiParams)
  }
  
  return timetables.map(convertTimetable)
}

/**
 * JSON-LD形式の時刻表をシンプルなオブジェクト形式に変換
 */
function convertTimetable(odptData: ODPTStationTimetable): StationTimetable {
  // 駅IDから駅名を抽出（dc:titleを優先、なければ駅IDから抽出）
  const stationId = odptData['odpt:station']
  let stationName = extractStationName(stationId)
  
  // dc:titleに日本語の駅名が含まれている場合はそれを使用
  if (odptData['dc:title']) {
    const title = odptData['dc:title']
    // タイトルから駅名を抽出（例: "彦根駅 平日 上り" → "彦根"）
    const titleMatch = title.match(/^(.+?)(駅|$)/)
    if (titleMatch) {
      stationName = titleMatch[1]
    }
  }
  
  // Operator IDから事業者名を取得
  const operatorId = odptData['odpt:operator'] as ODPTOperator
  const operatorName = OPERATOR_NAMES[operatorId] || operatorId
  
  // 時刻表オブジェクトを変換
  const trains: TrainTimetable[] = (odptData['odpt:stationTimetableObject'] || []).map(obj => {
    // 行先駅名を抽出（odpt:destinationStationから日本語名を取得）
    const destinationStations = (obj['odpt:destinationStation'] || []).map(stationId => {
      // 駅IDから駅名を抽出（例: "odpt.Station:JR-West.Tokaido.Kyoto" → "京都"）
      return extractStationName(stationId)
    })
    
    return {
      departureTime: obj['odpt:departureTime'],
      arrivalTime: obj['odpt:arrivalTime'],
      trainNumber: obj['odpt:trainNumber'],
      trainType: extractTrainType(obj['odpt:trainType']),
      destinationStation: destinationStations,
      viaStation: obj['odpt:viaStation'] || null,
      viaRailway: obj['odpt:viaRailway'] || null,
      trainName: obj['odpt:trainName'],
      trainOwner: obj['odpt:trainOwner'],
    }
  })
  
  return {
    stationId,
    stationName,
    operator: operatorName,
    operatorId,
    railway: odptData['odpt:railway'],
    direction: odptData['odpt:railDirection'],
    calendar: odptData['odpt:calendar'],
    trains,
  }
}

/**
 * 駅IDから表示用の駅名を抽出する
 */
function extractStationName(stationId: string): string {
  // 1. ローマ字から日本語への変換マッピング（主要駅）
  const stationNameMap: Record<string, string> = {
    'Hikone': '彦根',
    'MinamiHikone': '南彦根',
    'Kawase': '河瀬',
    'Inae': '稲枝',
    'Maibara': '米原',
    'Kyoto': '京都',
    'Osaka': '大阪',
    'Nagoya': '名古屋',
    'Nagahama': '長浜',
    'Kusatsu': '草津',
    'OmiHachiman': '近江八幡',
    'Yasu': '野洲',
    'Otsu': '大津',
  }

  // 2. 駅IDの最後の部分を取得（例: "odpt.Station:JR-West.Tokaido.Hikone" → "Hikone"）
  const parts = stationId.split('.')
  const lastPart = parts[parts.length - 1]
  
  // 3. マッピングにあれば日本語を、なければ抽出した部分を返す
  return stationNameMap[lastPart] || lastPart
}

/**
 * 列車種別IDから種別名を抽出
 * 例: "odpt.TrainType:Local" → "Local"
 */
function extractTrainType(trainTypeId: string | null): string | null {
  if (!trainTypeId) return null
  
  const parts = trainTypeId.split(':')
  return parts[parts.length - 1] || trainTypeId
}

/**
 * 現在時刻に基づいて、次の出発時刻の列車を取得
 */
export function getNextTrains(
  timetable: StationTimetable,
  limit: number = 5
): TrainTimetable[] {
  const now = new Date()
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  
  // 出発時刻でフィルタリング（現在時刻以降）
  const nextTrains = timetable.trains
    .filter(train => {
      if (!train.departureTime) return false
      return train.departureTime >= currentTime
    })
    .slice(0, limit)
  
  return nextTrains
}

/**
 * 特定の行先への列車を取得
 */
export function getTrainsToDestination(
  timetable: StationTimetable,
  destination: string
): TrainTimetable[] {
  const normalizedDestination = destination.toLowerCase()
  
  return timetable.trains.filter(train => {
    return train.destinationStation.some(station => 
      station.toLowerCase().includes(normalizedDestination)
    )
  })
}
