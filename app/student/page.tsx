'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, School } from '@/lib/supabase'
import StudentHeader from '@/components/student/StudentHeader'
import RankingSection from '@/components/student/RankingSection'
import SchoolCouponSection from '@/components/student/SchoolCouponSection'
import { ArrowLeft } from 'lucide-react'

export default function StudentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [school, setSchool] = useState<School | null>(null)
  const [studentCount, setStudentCount] = useState(0)

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // Get user profile to find school_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('school_id')
          .eq('id', user.id)
          .single()

        if (profile?.school_id) {
          // Get school details
          const { data: schoolData } = await supabase
            .from('schools')
            .select('*')
            .eq('id', profile.school_id)
            .single()
          
          if (schoolData) {
            setSchool(schoolData as School)

            // Get student count
            const { count } = await supabase
              .from('profiles')
              .select('*', { count: 'exact', head: true })
              .eq('school_id', profile.school_id)
            
            setStudentCount(count || 0)
          }
        }
      } catch (error) {
        console.error('Error fetching student data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStudentData()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header Navigation */}
      <div className="bg-white/90 backdrop-blur-md px-4 py-3 sticky top-0 z-50 border-b border-gray-100 flex items-center gap-3">
        <button 
          onClick={() => router.back()}
          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-bold text-lg text-gray-800">学生ポータル</h1>
      </div>

      <StudentHeader school={school} studentCount={studentCount} />
      
      {school ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <RankingSection schoolId={school.id} />
          <SchoolCouponSection schoolName={school.name} />
        </div>
      ) : (
        <div className="px-6 py-10 text-center text-gray-500">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-2">所属設定が必要です</h2>
            <p className="text-sm opacity-80 mb-4">
              プロフィールから学校を設定すると、<br/>
              ランキングや限定クーポンが利用できるようになります。
            </p>
            <button 
              onClick={() => router.push('/profile')}
              className="bg-blue-500 text-white font-bold py-2 px-6 rounded-full hover:bg-blue-600 transition-colors"
            >
              プロフィール設定へ
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
