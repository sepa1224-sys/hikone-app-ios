'use client'

import { X, Coins, Camera, QrCode } from 'lucide-react'
import { Mission } from '@/lib/actions/missions'
import MissionAction from './MissionAction'
import { useEffect } from 'react'

interface MissionModalProps {
  mission: Mission
  userId: string
  isOpen: boolean
  onClose: () => void
  isCompleted?: boolean
  isPending?: boolean
  isNextMonth?: boolean
  onUpdate?: () => void
}

export default function MissionModal({
  mission,
  userId,
  isOpen,
  onClose,
  isCompleted = false,
  isPending = false,
  isNextMonth = false,
  onUpdate
}: MissionModalProps) {
  // モーダル表示時に背面のスクロールを禁止する
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className={`relative h-32 flex items-center justify-center overflow-hidden ${
          mission.mission_type === 'qr' 
            ? 'bg-gradient-to-br from-purple-500 to-indigo-600' 
            : 'bg-gradient-to-br from-pink-500 to-rose-600'
        }`}>
          <div className="absolute top-0 right-0 p-4 z-20">
            <button 
              onClick={onClose}
              className="bg-black/20 hover:bg-black/30 text-white p-2 rounded-full transition-colors backdrop-blur-sm"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="text-center z-10 text-white flex flex-col items-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-md flex items-center justify-center mb-2 shadow-inner border border-white/30">
              {mission.mission_type === 'qr' ? (
                <QrCode className="w-8 h-8 text-white" />
              ) : (
                <Camera className="w-8 h-8 text-white" />
              )}
            </div>
            <div className="font-bold text-lg opacity-90 tracking-wider">
              {mission.mission_type === 'qr' ? 'QR SCAN' : 'PHOTO MISSION'}
            </div>
          </div>
          
          {/* 装飾背景 */}
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
        </div>

        {/* コンテンツ */}
        <div className="p-6">
          <h3 className="text-xl font-black text-gray-800 mb-2 text-center leading-tight">
            {mission.title}
          </h3>
          
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-600 px-4 py-1.5 rounded-full font-bold border border-amber-100 shadow-sm">
              <Coins size={18} className="fill-amber-500 text-amber-500" />
              <span>獲得ポイント {mission.points} PT</span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-5 mb-6 border border-gray-100 relative">
            <div className="absolute -top-3 left-4 bg-gray-200 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded">
              MISSION DETAILS
            </div>
            <p className="text-gray-700 leading-relaxed text-sm mt-1">
              {mission.description || '説明はありません'}
            </p>
          </div>

          {/* アクション */}
          <div className="space-y-3">
            {isCompleted ? (
              <div className="w-full py-4 bg-green-100 text-green-700 rounded-xl font-bold text-center border border-green-200 flex items-center justify-center gap-2 shadow-sm">
                <span>🎉 ミッションクリア！</span>
              </div>
            ) : isPending ? (
              <div className="w-full py-4 bg-yellow-100 text-yellow-700 rounded-xl font-bold text-center border border-yellow-200 flex items-center justify-center gap-2 shadow-sm">
                <span>⏳ 承認待ちです</span>
              </div>
            ) : isNextMonth ? (
              <div className="w-full py-4 bg-gray-100 text-gray-500 rounded-xl font-bold text-center border border-gray-200 flex items-center justify-center gap-2 shadow-sm">
                <span>📅 来月から開始できます</span>
              </div>
            ) : (
              <MissionAction 
                missionId={mission.id} 
                userId={userId} 
                missionType={mission.mission_type}
                onComplete={() => {
                  if (onUpdate) onUpdate()
                }} 
              />
            )}
            
            <button
              onClick={onClose}
              className="w-full py-3 text-gray-400 font-bold text-sm hover:text-gray-600 transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
