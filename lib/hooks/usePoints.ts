'use client'

import useSWR from 'swr'
import { supabase } from '@/lib/supabase'

// ポイント関連のカラムのみを指定
const POINTS_COLUMNS = 'points, referral_code, is_student, school_name, is_official_student, grade'

// ポイント履歴の型定義
export interface PointHistory {
  id: string
  user_id: string
  amount: number
  type: 'earn' | 'use' | 'referral' | 'bonus'
  activity_type?: string // アクティビティタイプ（'running' など）
  distance?: number // 走行距離（キロメートル）
  description: string
  created_at: string
}

// ポイント情報の型定義
export interface PointsData {
  points: number
  referral_code: string | null
}

// SWR用のフェッチャー関数（ポイント情報）
const fetchPoints = async (userId: string): Promise<PointsData | null> => {
  if (!userId) return null
  
  // ★ 3秒でタイムアウト（モバイルでのハング防止）
  const timeoutPromise = new Promise<PointsData>((resolve) =>
    setTimeout(() => resolve({ points: 0, referral_code: null }), 3000)
  )
  
  const fetchPromise = (async (): Promise<PointsData> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(POINTS_COLUMNS)
        .eq('id', userId)
        .single()
      
      if (error) return { points: 0, referral_code: null }
      
      if (data) {
        const pointsValue = data.points != null ? Number(data.points) : 0
        return {
          points: pointsValue,
          referral_code: data.referral_code || null
        }
      }
      
      return { points: 0, referral_code: null }
    } catch {
      return { points: 0, referral_code: null }
    }
  })()
  
  // タイムアウトかフェッチの早い方を返す
  return Promise.race([fetchPromise, timeoutPromise])
}

// SWR用のフェッチャー関数（ポイント履歴）
const fetchPointHistory = async (userId: string): Promise<PointHistory[]> => {
  if (!userId) return []
  
  // キャッシュを無効化して強制的に最新データを取得
  // activity_typeに関係なく全ての履歴を取得（runningタイプも含む）
  const { data, error } = await supabase
    .from('point_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10)
  
  if (error) return []
  return data || []
}

/**
 * ポイント情報をSWRでキャッシュして取得するカスタムフック
 * 
 * @param userId - ユーザーID
 * @returns { points, referralCode, isLoading, error, refetch }
 */
export function usePoints(userId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? `points:${userId}` : null,
    () => fetchPoints(userId!),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 5000,
      revalidateIfStale: false,
      errorRetryCount: 2,
      errorRetryInterval: 3000,
    }
  )
  
  return {
    points: data?.points ?? 0,
    referralCode: data?.referral_code ?? null,
    error,
    isLoading,
    refetch: () => mutate()
  }
}

/**
 * ポイント履歴をSWRでキャッシュして取得するカスタムフック
 * 
 * @param userId - ユーザーID
 * @returns { history, isLoading, error, refetch }
 */
export function usePointHistory(userId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? `point-history:${userId}` : null,
    () => fetchPointHistory(userId!),
    {
      revalidateOnFocus: true, // フォーカス時に再取得を有効化
      revalidateOnReconnect: true, // 再接続時に再取得を有効化
      dedupingInterval: 0, // キャッシュを無効化（常に最新データを取得）
      revalidateIfStale: true, // 古いデータでも再取得
      revalidateOnMount: true, // マウント時に必ず再取得
      refreshInterval: 0, // 自動更新は無効
      errorRetryCount: 2,
      errorRetryInterval: 3000,
    }
  )
  
  return {
    history: data ?? [],
    error,
    isLoading,
    refetch: () => mutate(undefined, { revalidate: true }) // 強制的に再取得
  }
}

/**
 * ポイント履歴のタイプに応じたアイコンと色を取得
 */
export function getPointHistoryStyle(type: PointHistory['type']) {
  switch (type) {
    case 'earn':
      return { icon: '🎯', color: 'text-green-600', bgColor: 'bg-green-100', label: '獲得' }
    case 'use':
      return { icon: '🎁', color: 'text-blue-600', bgColor: 'bg-blue-100', label: '使用' }
    case 'referral':
      return { icon: '👥', color: 'text-purple-600', bgColor: 'bg-purple-100', label: '招待' }
    case 'bonus':
      return { icon: '🎉', color: 'text-orange-600', bgColor: 'bg-orange-100', label: 'ボーナス' }
    default:
      return { icon: '💰', color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'その他' }
  }
}
