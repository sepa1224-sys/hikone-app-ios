'use client'

import { useState } from 'react'
import { Mission } from '@/lib/actions/missions'
import { 
  Trophy, 
  Star, 
  Gift, 
  CheckCircle2, 
  Camera, 
  QrCode, 
  Utensils, 
  MapPin, 
  Mountain, 
  Heart,
  Bike,
  Coffee,
  ShoppingBag
} from 'lucide-react'
import MissionModal from './MissionModal'
import { useRouter } from 'next/navigation'
import MonthlyChallengeModal from './MonthlyChallengeModal'

interface MissionStampCardProps {
  missions: Mission[]
  userId: string
  userMissionStatuses: Record<string, string>
  onMissionSelect?: (mission: Mission) => void
  isNextMonth?: boolean
}

export default function MissionStampCard({ missions, userId, userMissionStatuses, onMissionSelect, isNextMonth = false }: MissionStampCardProps) {
  const router = useRouter()
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null)
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false)

  // 完了状態の判定
  const isCompleted = (id: string) => {
    return userMissionStatuses[id] === 'approved'
  }

  // 審査中（未決）判定
  const isPending = (id: string) => {
    return userMissionStatuses[id] === 'pending'
  }

  // 達成数計算
  const completedCount = missions.filter(m => isCompleted(m.id)).length
  const totalCount = Math.max(missions.length, 10) // 最低10個の枠を表示
  const progressPercentage = (completedCount / totalCount) * 100

  // ミッションタイプやタイトルに応じたアイコン選択
  const getMissionIcon = (mission: Mission) => {
    if (mission.mission_type === 'photo') return <Camera className="w-6 h-6" />
    if (mission.title.includes('食べる') || mission.title.includes('カフェ')) return <Utensils className="w-6 h-6" />
    if (mission.title.includes('山') || mission.title.includes('登')) return <Mountain className="w-6 h-6" />
    if (mission.title.includes('城') || mission.title.includes('観光')) return <MapPin className="w-6 h-6" />
    
    // デフォルト
    return <QrCode className="w-6 h-6" />
  }

  // グリッドを埋めるためのプレースホルダー作成
  const placeholdersCount = Math.max(0, 10 - missions.length)
  const placeholders = Array(placeholdersCount).fill(null)

  return (
    <>
      <div className="w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        {/* ヘッダー部分 */}
        <div className={`relative bg-gradient-to-r ${
          isNextMonth ? 'from-blue-400 to-indigo-400' : 'from-orange-500 to-yellow-400'
        } p-6 text-white overflow-hidden`}>
          {/* 背景の装飾星 */}
          <Star className="absolute -top-4 -right-4 w-24 h-24 text-yellow-300 opacity-50 rotate-12" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2 opacity-90">
              <Trophy className="w-4 h-4" />
              <span className="text-sm font-bold">
                {isNextMonth ? '来月のマンスリー チャレンジ（予告）' : '今月のマンスリー チャレンジ'}
              </span>
            </div>
            <h2 className="text-xl font-bold leading-tight mb-1">
              豪華景品：近江牛食べ比べセット
            </h2>
            <p className="text-sm opacity-90">(抽選で1名様)</p>
          </div>
        </div>

        {/* 進捗 グリッド部分 */}
        <div className="p-6">
          {isNextMonth && missions.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Star className="w-8 h-8 text-gray-300" />
              </div>
              <p className="font-bold text-gray-400 text-sm">来月のミッションは準備中です</p>
              <p className="text-xs text-gray-400 mt-1">公開までしばらくお待ちください</p>
            </div>
          ) : (
            <>
              {/* 進捗状況 */}
              <div className={`mb-6 ${isNextMonth ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-bold text-gray-500">達成数</span>
              <span className="text-xl font-black text-orange-500">
                {completedCount} <span className="text-gray-400 text-sm">/ {totalCount}</span>
              </span>
            </div>
            
            {/* プログレスバー */}
            <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden mb-3">
              <div 
                className="h-full bg-gradient-to-r from-orange-400 to-yellow-400 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-orange-600">
              <Gift className="w-4 h-4" />
              <span>あと{Math.max(0, 5 - completedCount)}つクリアで500円商品券ゲット！</span>
            </div>
          </div>

              {/* ミッショングリッド */}
              <div className={`grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 ${isNextMonth ? 'opacity-80' : ''}`}>
                {/* 実際のミッション */}
                {missions.map((mission, index) => {
                  const completed = isCompleted(mission.id)
                  const pending = isPending(mission.id)
                  
                  return (
                    <button
                      key={mission.id}
                      onClick={() => {
                        if (onMissionSelect) {
                          onMissionSelect(mission)
                        } else {
                          setSelectedMission(mission)
                        }
                      }}
                      className={`
                        aspect-square rounded-xl flex flex-col items-center justify-center p-2 gap-2 transition-all active:scale-95
                        ${completed
                          ? 'bg-emerald-50 border-2 border-emerald-400'
                          : pending
                          ? 'bg-yellow-50 border-2 border-yellow-400'
                          : isNextMonth
                            ? 'bg-gray-50 border border-gray-200 border-dashed'
                            : 'bg-white border border-gray-200 hover:border-orange-200 hover:shadow-sm'
                        }
                      `}
                    >
                  {completed ? (
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-500">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  ) : pending ? (
                    <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-500">
                      <span className="text-xs font-bold">審査中</span>
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                      {getMissionIcon(mission)}
                    </div>
                  )}
                  
                  <span className={`
                    text-[10px] font-bold text-center line-clamp-1 w-full
                    ${completed ? 'text-emerald-700' : pending ? 'text-yellow-700' : 'text-gray-500'}
                  `}>
                    {mission.title}
                  </span>
                </button>
              )
            })}

                {/* プレースホルダー（数が足りない場合） */}
                {placeholders.map((_, i) => (
                  <div
                    key={`placeholder-${i}`}
                    className="aspect-square rounded-xl border border-gray-100 bg-gray-50 flex flex-col items-center justify-center p-2 gap-2 opacity-50"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-300">
                      <Star className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-300 text-center">
                      Coming Soon
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* フッター */}
        <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
          {userId ? (
            <button 
              onClick={() => setIsChallengeModalOpen(true)}
              className="text-sm font-bold text-orange-500 flex items-center justify-center gap-1 hover:text-orange-600 transition-colors mx-auto"
            >
              <span>ミッションの詳細をチェック</span>
              <span className="text-lg">›</span>
            </button>
          ) : (
            <button 
              onClick={() => router.push('/login')}
              className="text-sm font-bold text-orange-500 flex items-center justify-center gap-1 hover:text-orange-600 transition-colors mx-auto"
            >
              <span>ログインしてチャレンジに参加</span>
              <span className="text-lg">›</span>
            </button>
          )}
        </div>
      </div>

      <MonthlyChallengeModal 
        isOpen={isChallengeModalOpen}
        onClose={() => setIsChallengeModalOpen(false)}
      />

      {selectedMission && !onMissionSelect && (
        <MissionModal
          mission={selectedMission}
          userId={userId}
          isOpen={!!selectedMission}
          onClose={() => setSelectedMission(null)}
          isCompleted={isCompleted(selectedMission.id)}
          isPending={isPending(selectedMission.id)}
        />
      )}
    </>
  )
}
