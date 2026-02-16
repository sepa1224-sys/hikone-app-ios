'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Server Actions用のクライアント作成ヘルパー
const createClient = () => {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}

export type MissionType = 'qr' | 'photo'

export interface Mission {
  id: string
  title: string
  description: string | null
  mission_type: MissionType
  points: number
  month: string
  created_at: string
}

export interface MissionSubmission {
  id: string
  user_id: string
  mission_id: string
  status: 'pending' | 'approved' | 'rejected'
  image_url: string | null
  reviewer_comment: string | null
  created_at: string
}

export interface CreateMissionParams {
  title: string
  description?: string
  mission_type: MissionType
  points: number
  month: string
}

export interface ActionResult {
  success: boolean
  message: string
  error?: string
  data?: any
}

/**
 * ミッションを新規作成する
 */
export async function createMission(params: CreateMissionParams): Promise<ActionResult> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('monthly_missions')
      .insert({
        title: params.title,
        description: params.description,
        mission_type: params.mission_type,
        points: params.points,
        month: params.month
      })
      .select()
      .single()

    if (error) {
      console.error('Create Mission Error:', error)
      return { success: false, message: 'ミッションの作成に失敗しました', error: error.message }
    }

    return { success: true, message: 'ミッションを作成しました', data }
  } catch (err: any) {
    console.error('Create Mission Exception:', err)
    return { success: false, message: '予期せぬエラーが発生しました', error: err.message }
  }
}

/**
 * ミッション一覧を取得する
 */
export async function getMissions(month?: string): Promise<ActionResult> {
  try {
    const supabase = createClient()
    let query = supabase
      .from('monthly_missions')
      .select('*')
      .order('created_at', { ascending: false })

    if (month) {
      query = query.eq('month', month)
    }

    const { data, error } = await query

    if (error) {
      console.error('Get Missions Error:', error)
      return { success: false, message: 'ミッションの取得に失敗しました', error: error.message }
    }

    return { success: true, message: '取得成功', data: data as Mission[] }
  } catch (err: any) {
    console.error('Get Missions Exception:', err)
    return { success: false, message: '予期せぬエラーが発生しました', error: err.message }
  }
}

/**
 * ミッションを削除する
 */
export async function deleteMission(id: string): Promise<ActionResult> {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('monthly_missions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete Mission Error:', error)
      return { success: false, message: 'ミッションの削除に失敗しました', error: error.message }
    }

    return { success: true, message: 'ミッションを削除しました' }
  } catch (err: any) {
    console.error('Delete Mission Exception:', err)
    return { success: false, message: '予期せぬエラーが発生しました', error: err.message }
  }
}

/**
 * ログインユーザーのミッション投稿状況を取得する
 */
export async function getUserMissionStatus(): Promise<ActionResult> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
       return { success: false, message: 'ユーザーが見つかりません' }
    }

    const { data, error } = await supabase
      .from('mission_submissions')
      .select('mission_id, status')
      .eq('user_id', user.id)

    if (error) {
      console.error('Get Mission Status Error:', error)
      return { success: false, message: 'ステータスの取得に失敗しました', error: error.message }
    }

    // Map形式に変換
    const statusMap: Record<string, string> = {}
    data.forEach((item: any) => {
      statusMap[item.mission_id] = item.status
    })

    return { success: true, message: '取得成功', data: statusMap }
  } catch (err: any) {
    console.error('Get Mission Status Exception:', err)
    return { success: false, message: '予期せぬエラーが発生しました', error: err.message }
  }
}
