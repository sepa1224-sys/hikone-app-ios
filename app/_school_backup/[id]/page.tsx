'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Users, Trophy, TrendingUp, Medal, Ticket, Store } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getSchoolRanking, getSchoolGradeDistribution } from '@/lib/actions/student'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

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

export default function SchoolDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const schoolId = params.id as string
  
  // TODO: Fetch school details, stats, and rankings using schoolId
  const schoolName = "滋賀大学" // Placeholder

  const [ranking, setRanking] = useState<RankingUser[]>([])
  const [distribution, setDistribution] = useState<GradeDistribution[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rankingData, distributionData] = await Promise.all([
          getSchoolRanking(schoolId),
          getSchoolGradeDistribution(schoolId)
        ])
        setRanking(rankingData)
        setDistribution(distributionData)
      } catch (error) {
        console.error('Failed to fetch school data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [schoolId])

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

  return (
    <div className="min-h-screen bg-blue-50/30 pb-24">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md px-4 py-3 sticky top-0 z-50 border-b border-gray-100 flex items-center gap-3">
        <button 
          onClick={() => router.back()}
          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-black text-lg text-gray-800">{schoolName}</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Users size={16} className="text-blue-500" />
              <span className="text-xs font-bold text-gray-400">総人数</span>
            </div>
            <p className="text-2xl font-black text-gray-800">1,240<span className="text-sm font-bold text-gray-400 ml-1">人</span></p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-green-500" />
              <span className="text-xs font-bold text-gray-400">月間走行</span>
            </div>
            <p className="text-2xl font-black text-gray-800">4,580<span className="text-sm font-bold text-gray-400 ml-1">km</span></p>
          </div>
        </div>

        {/* Grade Distribution */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users size={18} className="text-indigo-500" />
            学年別分布
          </h2>
          <div className="h-48 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">読み込み中...</div>
            ) : distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
                <p>データがまだありません</p>
                <p className="text-xs text-indigo-500 font-bold">最初のデータ投稿者になりませんか？</p>
              </div>
            )}
          </div>
        </div>

        {/* Rankings */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Trophy size={18} className="text-amber-500" />
            校内ランキング (月間)
          </h2>
          <div className="space-y-3">
            {loading ? (
              // Skeleton loading
              [1, 2, 3].map((rank) => (
                <div key={rank} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                   <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                   <div className="flex-1 space-y-2">
                     <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                     <div className="h-3 w-16 bg-gray-100 rounded animate-pulse"></div>
                   </div>
                </div>
              ))
            ) : ranking.length > 0 ? (
              ranking.slice(0, 3).map((user) => (
                <div key={user.id} className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-white border border-gray-100 rounded-xl shadow-sm">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg shadow-sm border-2 ${
                    user.rank === 1 ? 'bg-yellow-100 text-yellow-600 border-yellow-200' :
                    user.rank === 2 ? 'bg-slate-100 text-slate-600 border-slate-200' :
                    'bg-orange-100 text-orange-600 border-orange-200'
                  }`}>
                    {user.rank}
                  </div>
                  
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden relative border border-gray-100">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.nickname} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Users size={20} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="font-bold text-gray-800 text-sm line-clamp-1">{user.nickname}</p>
                    <p className="text-xs text-gray-500 font-medium">走行距離</p>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-black text-lg text-indigo-600">{user.distance.toFixed(1)}</p>
                    <p className="text-[10px] text-gray-400 font-bold">km</p>
                  </div>
                </div>
              ))
            ) : (
               <div className="p-4 text-center text-gray-400 text-sm">
                 今月のランキングデータはまだありません
               </div>
            )}
          </div>
        </div>

        {/* School Exclusive Coupon */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 shadow-lg text-white">
           <h2 className="font-bold mb-4 flex items-center gap-2">
             <Ticket size={18} className="text-yellow-300" />
             {schoolName}生限定クーポン
           </h2>
           
           <div className="bg-white text-gray-800 rounded-xl p-4 shadow-md flex gap-4 relative overflow-hidden">
             {/* Left Ticket Stub Style */}
             <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-indigo-500 rounded-full -ml-2"></div>
             <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-indigo-600 rounded-full -mr-2"></div>
             <div className="border-r border-dashed border-gray-300 pr-4 flex flex-col items-center justify-center min-w-[80px]">
                <Store size={32} className="text-indigo-500 mb-1" />
                <span className="text-[10px] font-bold text-gray-400">OFF</span>
             </div>
             
             <div className="flex-1">
               <p className="text-xs font-bold text-indigo-500 bg-indigo-50 inline-block px-2 py-0.5 rounded-full mb-1">
                 地域カフェ
               </p>
               <h3 className="font-black text-lg leading-tight mb-1">お会計から100円OFF</h3>
               <p className="text-xs text-gray-500">
                 有効期限: 2026年3月末まで
               </p>
             </div>
           </div>
           
           <p className="text-center text-xs mt-3 text-indigo-100 opacity-80">
             ※注文時に学生証を提示してください
           </p>
        </div>
      </div>
    </div>
  )
}
