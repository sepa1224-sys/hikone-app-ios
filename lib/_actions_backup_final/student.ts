'use server'

import { createClient as createServiceClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

type RankingUser = {
  id: string
  nickname: string
  avatar_url: string | null
  distance: number
  rank: number
}

type GradeDistribution = {
  name: string
  value: number
}

export async function getSchoolRanking(schoolId: string): Promise<RankingUser[]> {
  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)

  // 1. Get students of the school
  const { data: students, error: studentError } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .eq('school_id', schoolId)

  if (studentError || !students || students.length === 0) {
    console.error('Error fetching students:', studentError)
    return []
  }

  const studentIds = students.map(s => s.id)

  // 2. Get activity logs for this month
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  
  const { data: logs, error: logError } = await supabase
    .from('activity_logs')
    .select('user_id, distance')
    .in('user_id', studentIds)
    .gte('created_at', startOfMonth)
    .eq('activity_type', 'run')

  if (logError) {
    console.error('Error fetching activity logs:', logError)
    return []
  }

  // 3. Aggregate distance per user
  const distanceMap: Record<string, number> = {}
  logs?.forEach(log => {
    distanceMap[log.user_id] = (distanceMap[log.user_id] || 0) + Number(log.distance)
  })

  // 4. Sort and format
  const ranking = students
    .map(student => ({
      id: student.id,
      nickname: student.full_name || '匿名ユーザー',
      avatar_url: student.avatar_url,
      distance: distanceMap[student.id] || 0,
      rank: 0
    }))
    .filter(user => user.distance > 0) // Only show users with activity? User said "Top 3", maybe 0 is ok if not enough users, but usually ranking implies activity.
    .sort((a, b) => b.distance - a.distance)
    .slice(0, 5) // Get Top 5 just in case
    .map((user, index) => ({
      ...user,
      rank: index + 1
    }))

  return ranking
}

export async function getSchoolGradeDistribution(schoolId: string): Promise<GradeDistribution[]> {
  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('grade')
    .eq('school_id', schoolId)
    .not('grade', 'is', null)

  if (error) {
    console.error('Error fetching grade distribution:', error)
    return []
  }

  if (!profiles || profiles.length === 0) {
    return []
  }

  const counts: Record<string, number> = {}
  profiles.forEach(p => {
    if (p.grade) {
      const key = `${p.grade}年生`
      counts[key] = (counts[key] || 0) + 1
    }
  })

  // Convert to array
  return Object.entries(counts).map(([name, value]) => ({
    name,
    value
  })).sort((a, b) => a.name.localeCompare(b.name))
}
