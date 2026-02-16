import { createClient } from '@/lib/supabase/client'

// 最新の @supabase/ssr の createBrowserClient を使用してクライアントを初期化
// これにより、クライアント側でも Cookie を介した認証状態の同期が可能になります
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('🚨 [Supabase] クライアント作成エラー: 環境変数が不足しています', {
    url: !!supabaseUrl,
    key: !!supabaseAnonKey
  })
}

export const supabase = createClient()

// --- お店（Shop）関連の型定義 ---
export type Shop = {
  id: string
  name: string
  category_main: string
  category_sub?: string    // 詳細ジャンル
  meal_type?: string       // ランチ/ディナー等
  address: string
  latitude: number | null  // 緯度（未取得の場合はnull）
  longitude: number | null // 経度（未取得の場合はnull）
  place_id?: string        // Google Place ID（座標補正用）
  opening_hours: string    // 営業時間
  phone: string            // 電話番号
  image_url?: string 
  image_urls?: string[]    // Google Places APIから取得した写真URL配列（最大5枚）
  // --- 💡 詳細ページ用の追加フィールド ---
  description?: string     // お店の紹介文
  price_range?: string     // 予算 (例: ¥1,000〜¥2,000)
  menu_items?: string[]    // メニュー名の配列 (Supabaseでは text[] 型)
  website_url?: string     // 公式サイトやInstagramのURL
  view_count?: number      // 閲覧数（人気ランキング用）
  // --- フロントエンド用の計算フィールド ---
  distance?: number        // 現在地からの距離（km）
  isFavorite?: boolean     // お気に入り登録済みか
}

// --- お気に入り関連の型定義 ---
export type Favorite = {
  id: string
  user_id: string
  shop_id: string
  created_at: string
}

// 2点間の距離を計算（ハバーサインの公式）
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number | null,
  lon2: number | null
): number | null => {
  if (lat2 === null || lon2 === null) return null
  
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

// 距離をフォーマットして表示
export const formatDistance = (distance: number | null | undefined): string => {
  if (distance === null || distance === undefined) return '距離不明'
  if (distance < 1) return `${Math.round(distance * 1000)}m`
  return `${distance.toFixed(1)}km`
}

// 営業中かどうかを判定する関数
export const isShopOpen = (openingHours: string) => {
  if (!openingHours || openingHours === 'NULL') return true
  // 将来的にはここで現在の時刻(new Date())と比較するロジックを実装可能
  return true 
}

// --- 電車（Train）関連の型定義と関数 ---
export interface TrainTimetable {
  id: number;
  station_name: string;
  line_name: string;
  direction: string;
  destination_station: string;
  departure_time: string;
  train_type: string;
  is_weekday: boolean;
}

// --- 学生コミュニティ関連の型定義 ---
export type School = {
  id: string
  name: string
  type: 'high_school' | 'university'
  created_at: string
}

export type StudentProfile = {
  id: string
  is_student: boolean
  school_id: string | null
  grade: number | null
}

export type ActivityLog = {
  id: string
  user_id: string
  activity_type: 'run' | 'walk'
  distance: number
  duration: number
  calories: number
  steps: number
  created_at: string
}

// ページから呼び出される検索関数
export async function getTrainTimetables(station: string, destination: string) {
  const { data, error } = await supabase
    .from('train_timetables')
    .select('*')
    .eq('station_name', station)
    .eq('destination_station', destination)
    .order('departure_time', { ascending: true });

  if (error) throw error;
  return data as TrainTimetable[];
}

// --- LINE連携ヘルパー ---
export const getLineId = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // identities配列からLINEの接続情報を探す
  // 1. 直接LINEプロバイダーの場合
  // 2. Auth0経由でLINE接続の場合 (connection: 'line')
  const identity = user.identities?.find(
    (i) => i.provider === 'line' // LINEプロバイダーのみチェック
  )
  
  if (identity) {
    return identity.id
  }
  
  return null
}

// supabase.auth.get_line_id として呼び出せるように拡張（実行時パッチ）
if (typeof window !== 'undefined') {
  (supabase.auth as any).get_line_id = getLineId
}
