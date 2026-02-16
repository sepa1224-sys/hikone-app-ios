'use client'

import { X, Trophy, Gift, Calendar, Star } from 'lucide-react'

interface MonthlyChallengeModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function MonthlyChallengeModal({ isOpen, onClose }: MonthlyChallengeModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative h-32 bg-gradient-to-br from-orange-400 to-yellow-400 p-6 flex flex-col justify-end overflow-hidden">
          <Star className="absolute -top-6 -right-6 w-32 h-32 text-yellow-300 opacity-40 rotate-12" />
          <Star className="absolute top-4 left-4 w-12 h-12 text-yellow-300 opacity-60 -rotate-12" />
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/20 p-2 rounded-full text-white hover:bg-white/30 transition-colors backdrop-blur-sm"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="relative z-10 text-white">
            <div className="flex items-center gap-2 mb-1 opacity-90">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-bold tracking-wider">MONTHLY CHALLENGE</span>
            </div>
            <h2 className="text-2xl font-black">今月のチャレンジ</h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-orange-500" />
              達成条件
            </h3>
            <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
              <p className="text-gray-700 font-medium leading-relaxed">
                期間中にミッションを<span className="text-orange-600 font-bold text-lg mx-1">5つ</span>クリアして、
                スタンプを集めよう！
              </p>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Gift className="w-5 h-5 text-pink-500" />
              クリア特典
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-4 bg-white border border-gray-100 p-3 rounded-2xl shadow-sm">
                <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center text-2xl">
                  🥩
                </div>
                <div>
                  <p className="font-bold text-gray-800">近江牛食べ比べセット</p>
                  <p className="text-xs text-gray-500">抽選で1名様</p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-white border border-gray-100 p-3 rounded-2xl shadow-sm">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center text-2xl">
                  🎫
                </div>
                <div>
                  <p className="font-bold text-gray-800">500円分商品券</p>
                  <p className="text-xs text-gray-500">達成者全員にプレゼント！</p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg active:scale-95 transition-transform shadow-lg"
          >
            チャレンジを続ける
          </button>
        </div>
      </div>
    </div>
  )
}
