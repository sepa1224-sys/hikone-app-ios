'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Trophy, Medal, User, X, ChevronRight, Timer, Footprints } from 'lucide-react'
import Image from 'next/image'
import { useAuth } from '@/components/AuthProvider'

type Props = {
  schoolId: string
}

type RankingUser = {
  id: string
  username: string
  avatar_url: string | null
  total_distance: number
  rank: number
}

export default function RankingSection({ schoolId }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [rankingData, setRankingData] = useState<RankingUser[]>([])
  const [loading, setLoading] = useState(false)
  const { session, loading: authLoading } = useAuth()

  const fetchRanking = useCallback(async () => {
    setLoading(true)
    try {
      // 1. 同じ学校のプロフィールを取得
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('school_id', schoolId)

      if (profileError) throw profileError
      if (!profiles || profiles.length === 0) {
        setRankingData([])
        return
      }

      const typedProfiles = (profiles as { id: string; username?: string | null; avatar_url: string | null }[])
      const userIds = typedProfiles.map((p) => p.id)

      // 2. 今月の活動ログを取得
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      
      const { data: logs, error: logError } = await supabase
        .from('activity_logs')
        .select('user_id, distance')
        .in('user_id', userIds)
        .gte('created_at', firstDay)
        .eq('activity_type', 'run') // ランニングのみ

      if (logError) throw logError

      // 3. 集計
      const userDistances: Record<string, number> = {}
      ;(logs as { user_id: string; distance: number | string }[] | null)?.forEach((log) => {
        userDistances[log.user_id] = (userDistances[log.user_id] || 0) + Number(log.distance)
      })

      // 4. マージとソート
      const ranking = typedProfiles
        .map((profile) => ({
          id: profile.id,
          username: profile.username || '匿名ユーザー',
          avatar_url: profile.avatar_url,
          total_distance: userDistances[profile.id] || 0,
          rank: 0,
        }))
        .sort((a: RankingUser, b: RankingUser) => b.total_distance - a.total_distance)
        .map((item: RankingUser, index: number) => ({ ...item, rank: index + 1 }))
      // 距離0のユーザーは除外するか、下位に表示するか。今回は表示するが、0kmの場合は表示を変えるかも。
      // ランキングなので0kmも表示して「さあ走ろう！」と促すのもあり。
      // 上位のみ表示する場合は .filter(item => item.total_distance > 0)

      setRankingData(ranking)

    } catch (err) {
      console.error('ランキング取得エラー:', err)
    } finally {
      setLoading(false)
    }
  }, [schoolId])

  useEffect(() => {
    if (isOpen) {
      fetchRanking()
    }
  }, [isOpen, fetchRanking])

  return (
    <>
      <div className="px-4 mb-6">
        <button
          onClick={() => setIsOpen(true)}
          className="w-full bg-gradient-to-r from-orange-400 to-pink-500 text-white p-4 rounded-2xl shadow-lg relative overflow-hidden group active:scale-95 transition-all"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/20 rounded-full -mr-6 -mt-6 blur-xl group-hover:scale-110 transition-transform"></div>
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2.5 rounded-full backdrop-blur-sm">
                <Trophy size={24} className="text-yellow-200" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold opacity-90 text-orange-100">今月のランニング</div>
                <div className="text-xl font-black italic tracking-wider">RANKING!</div>
              </div>
            </div>
            <ChevronRight size={24} className="text-white/80" />
          </div>
        </button>
      </div>

      {/* ランキング詳細モーダル (Bottom Sheet風) */}
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
          {/* 背景オーバーレイ */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />
          
          {/* コンテンツ */}
          <div className="bg-white w-full max-w-md h-[85vh] sm:h-[80vh] rounded-t-[2rem] sm:rounded-[2rem] relative z-10 flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* ヘッダー */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white rounded-t-[2rem]">
              <div className="flex items-center gap-2">
                <Trophy className="text-orange-500" />
                <h2 className="text-xl font-black text-gray-800">学内ランキング</h2>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="bg-gray-100 p-2 rounded-full text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* リスト */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3 text-gray-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                  <span className="text-xs font-bold">集計中...</span>
                </div>
              ) : rankingData.length > 0 ? (
                rankingData.map((user) => (
                  <div 
                    key={user.id} 
                    className={`flex items-center gap-4 p-4 rounded-2xl border ${
                      user.rank === 1 ? 'bg-yellow-50 border-yellow-200 shadow-sm' : 
                      user.rank === 2 ? 'bg-gray-50 border-gray-200' :
                      user.rank === 3 ? 'bg-orange-50 border-orange-200' :
                      'bg-white border-gray-100'
                    }`}
                  >
                    {/* 順位バッジ */}
                    <div className={`w-10 h-10 flex items-center justify-center rounded-full font-black text-lg ${
                      user.rank === 1 ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-white shadow-md' :
                      user.rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white shadow-md' :
                      user.rank === 3 ? 'bg-gradient-to-br from-orange-300 to-orange-500 text-white shadow-md' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {user.rank}
                    </div>

                    {/* アバター */}
                    <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-200 border-2 border-white shadow-sm shrink-0">
                      {user.avatar_url ? (
                        <Image src={user.avatar_url} alt={user.username} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                          <User size={20} />
                        </div>
                      )}
                    </div>

                    {/* ユーザー情報 */}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 truncate">{user.username}</div>
                      <div className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                        <Footprints size={10} />
                        累計走行距離
                      </div>
                    </div>

                    {/* 記録 */}
                    <div className="text-right">
                      <div className="text-xl font-black text-gray-800 font-mono tracking-tighter">
                        {user.total_distance.toFixed(1)}
                        <span className="text-xs font-bold text-gray-400 ml-1">km</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-gray-400">
                  <p className="font-bold">まだデータがありません</p>
                  <p className="text-xs mt-2">一番乗りで走って記録を残そう！</p>
                </div>
              )}
            </div>
            
            {/* フッター（自分の順位など出すと良いが今回は省略） */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 rounded-b-[2rem] text-center text-[10px] text-gray-400">
              ※毎月1日にリセットされます
            </div>
          </div>
        </div>
      )}
    </>
  )
}
