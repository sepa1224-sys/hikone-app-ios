import { supabase } from '@/lib/supabase'

export type Mission = {
  id: string
  title: string
  description?: string
  mission_type: 'qr' | 'photo'
  points: number
  month: string
}

type Result<T> = { success: boolean; data?: T }

export async function getMissions(month: string): Promise<Result<Mission[]>> {
  try {
    const { data, error } = await supabase
      .from('monthly_missions')
      .select('id, title, description, mission_type, points, month')
      .eq('month', month)
      .order('created_at', { ascending: true })

    if (error) {
      return { success: false }
    }

    return { success: true, data: (data || []) as Mission[] }
  } catch {
    return { success: false }
  }
}

export async function getUserMissionStatus(): Promise<Result<Record<string, string>>> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: true, data: {} }
    }

    const { data, error } = await supabase
      .from('mission_submissions')
      .select('mission_id, status')
      .eq('user_id', user.id)

    if (error) {
      return { success: false }
    }

    const map: Record<string, string> = {}
    for (const row of data || []) {
      map[row.mission_id as string] = row.status as string
    }
    return { success: true, data: map }
  } catch {
    return { success: false }
  }
}
