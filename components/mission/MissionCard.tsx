'use client'

import { useState } from 'react'
import { Mission } from '@/lib/actions/missions'
import { QrCode, Camera, Coins, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import MissionAction from './MissionAction'

interface MissionCardProps {
  mission: Mission
  userId: string
  isCompleted?: boolean
  isPending?: boolean
  onUpdate?: () => void
}

export default function MissionCard({ mission, userId, isCompleted = false, isPending = false, onUpdate }: MissionCardProps) {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  
  const isDone = isCompleted || isPending

  return (
    <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all ${
      isCompleted ? 'border-green-200 bg-green-50/30' : 
      isPending ? 'border-yellow-200 bg-yellow-50/30' : 'border-gray-100'
    }`}>
      {/* カードヘッダー */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            {/* アイコン */}
            <div className={`shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${
              isCompleted ? 'bg-green-100 text-green-600' :
              isPending ? 'bg-yellow-100 text-yellow-600' :
              mission.mission_type === 'qr' ? 'bg-purple-100 text-purple-600' : 'bg-pink-100 text-pink-600'
            }`}>
              {mission.mission_type === 'qr' ? <QrCode size={28} /> : <Camera size={28} />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  mission.mission_type === 'qr' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-pink-50 text-pink-600 border-pink-100'
                }`}>
                  {mission.mission_type === 'qr' ? 'QRスキャン' : '写真投稿'}
                </span>
                
                {isCompleted && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 flex items-center gap-1">
                    <CheckCircle2 size={10} /> 完了済み
                  </span>
                )}
                {isPending && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200 flex items-center gap-1">
                    <Loader2 size={10} className="animate-spin" /> 承認待ち
                  </span>
                )}
              </div>
              
              <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1">{mission.title}</h3>
              
              <div className="flex items-center gap-1 text-amber-500 font-black">
                <Coins size={16} className="fill-amber-500" />
                <span>{mission.points} pt</span>
              </div>
            </div>
          </div>
        </div>

        {/* 説明文 */}
        <div className="mt-4 bg-gray-50 rounded-xl p-3 text-sm text-gray-600 leading-relaxed">
          {mission.description || '説明はありません'}
        </div>

        {/* アクションエリア */}
        {!isDone && (
          <div className="mt-5">
            {status === 'success' ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 text-green-800 animate-in fade-in slide-in-from-bottom-2">
                <CheckCircle2 size={24} className="text-green-600" />
                <p className="font-bold">{message}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {status === 'error' && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-red-800 text-sm animate-in fade-in">
                    <AlertCircle size={16} className="text-red-600 mt-0.5 shrink-0" />
                    <p>{message}</p>
                  </div>
                )}

                <MissionAction
                  missionId={mission.id}
                  userId={userId}
                  missionType={mission.mission_type}
                  onComplete={(success, msg) => {
                    if (success) {
                      setStatus('success')
                      setMessage(msg)
                      if (onUpdate) onUpdate()
                    } else {
                      setStatus('error')
                      setMessage(msg)
                    }
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
