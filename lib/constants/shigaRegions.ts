/**
 * 滋賀県の地方区分と市区町村の定義
 * 居住地設定で使用
 */

// ===== サービス対応エリアの定義 =====
// 現在は彦根市、犬上郡（多賀町、甲良町、豊郷町）、愛知郡（愛荘町）が対応エリア
export const SUPPORTED_CITIES = [
  '彦根市',
  '多賀町',
  '甲良町',
  '豊郷町',
  '愛荘町',
] as const

export type SupportedCity = typeof SUPPORTED_CITIES[number]

// 対応エリアかどうかをチェックする関数
export function isSupportedCity(city: string | null | undefined): boolean {
  if (!city) return false
  return SUPPORTED_CITIES.includes(city as SupportedCity)
}

// 未対応エリアのメッセージ
export const UNSUPPORTED_AREA_MESSAGE = '現在は彦根市、犬上郡、愛知郡エリア限定のサービスです。順次拡大予定ですので、今しばらくお待ちください。'

// 地方区分の定義
export const SHIGA_REGIONS = ['湖東', '湖南', '湖北', '湖西'] as const
export type ShigaRegion = typeof SHIGA_REGIONS[number]

// 地方区分ごとの市区町村
export const SHIGA_REGION_CITIES: Record<ShigaRegion, string[]> = {
  '湖東': [
    '彦根市',
    '近江八幡市',
    '東近江市',
    '愛荘町',
    '豊郷町',
    '甲良町',
    '多賀町',
    '日野町',
    '竜王町',
  ],
  '湖南': [
    '大津市',
    '草津市',
    '守山市',
    '栗東市',
    '野洲市',
    '湖南市',
    '甲賀市',
  ],
  '湖北': [
    '長浜市',
    '米原市',
  ],
  '湖西': [
    '高島市',
  ],
}

// 市区町村ごとの詳細エリア（主に彦根市）
export const CITY_DETAIL_AREAS: Record<string, string[]> = {
  '彦根市': [
    '城南,城陽,若葉,高宮',
    '城東,城北',
    '城西',
    '平田,金城',
    '旭森,鳥居本,佐和山',
    '河瀬,亀山,稲枝東,稲枝北,稲枝西',
  ],
  '近江八幡市': [
    '八幡学区',
    '島学区',
    '岡山学区',
    '金田学区',
    '桐原学区',
    '馬淵学区',
    '北里学区',
    '武佐学区',
    '安土学区',
    '老蘇学区',
  ],
  '東近江市': [
    '八日市地区',
    '永源寺地区',
    '五個荘地区',
    '愛東地区',
    '湖東地区',
    '能登川地区',
    '蒲生地区',
  ],
  '長浜市': [
    '長浜地域',
    '神照地域',
    '南郷里地域',
    '北郷里地域',
    '六荘地域',
    '浅井地域',
    '虎姫地域',
    '湖北地域',
    '高月地域',
    '木之本地域',
    '余呉地域',
    '西浅井地域',
  ],
  '大津市': [
    '大津地域',
    '膳所地域',
    '石山地域',
    '瀬田地域',
    '田上地域',
    '大石地域',
    '堅田地域',
    '真野地域',
    '志賀地域',
    '葛川地域',
  ],
  '草津市': [
    '草津学区',
    '大路学区',
    '渋川学区',
    '矢倉学区',
    '老上学区',
    '老上西学区',
    '志津学区',
    '志津南学区',
    '玉川学区',
    '南笠東学区',
    '山田学区',
    '笠縫学区',
    '笠縫東学区',
    '常盤学区',
  ],
}

// 全市区町村リスト（滋賀県内）
export const ALL_SHIGA_CITIES = [
  ...SHIGA_REGION_CITIES['湖東'],
  ...SHIGA_REGION_CITIES['湖南'],
  ...SHIGA_REGION_CITIES['湖北'],
  ...SHIGA_REGION_CITIES['湖西'],
]

// 市区町村から地方区分を取得
export function getRegionByCity(city: string): ShigaRegion | null {
  for (const [region, cities] of Object.entries(SHIGA_REGION_CITIES)) {
    if (cities.includes(city)) {
      return region as ShigaRegion
    }
  }
  return null
}

// 居住地の完全な表示文字列を生成
export function formatFullLocation(
  prefecture: string | null,
  region: string | null,
  city: string | null,
  detailArea: string | null
): string {
  const parts: string[] = []
  
  if (prefecture) parts.push(prefecture)
  if (region) parts.push(region)
  if (city) parts.push(city)
  if (detailArea) {
    // 詳細エリアは最初の地名のみ表示（「城南,城陽,若葉,高宮」→「城南」）
    const firstArea = detailArea.split(',')[0]
    parts.push(`${firstArea}エリア`)
  }
  
  return parts.join(' ')
}

// 短縮表示用（市区町村 + 詳細エリア）
export function formatShortLocation(
  city: string | null,
  detailArea: string | null
): string {
  if (!city) return ''
  
  if (detailArea) {
    const firstArea = detailArea.split(',')[0]
    return `${city} ${firstArea}エリア`
  }
  
  return city
}
