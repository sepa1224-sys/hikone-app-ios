'use client'

import { useState, useEffect } from 'react'
import { getStampCard, getUserStamps } from '@/lib/actions/stamp'
import { ArrowLeft, Store, Gift, ScanLine, Info } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams } from 'next/navigation'

export default function StampCardDetailPage() {
  const params = useParams()
  const shopId = params.shopId as string

  const [card, setCard] = useState<any>(null)
  const [stamps, setStamps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchData() {
      if (!shopId) return

      try {
        const [cardRes, stampsRes] = await Promise.all([
          getStampCard(shopId),
          getUserStamps(shopId)
        ])

        if (cardRes.success && cardRes.card) {
          setCard(cardRes.card)
        } else {
          setError('スタンプカード情報の取得に失敗しました')
        }

        if (stampsRes.success && stampsRes.stamps) {
          setStamps(stampsRes.stamps)
        }
      } catch (e) {
        setError('データの読み込み中にエラーが発生しました')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [shopId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (error || !card) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4 flex items-center gap-2">
            <Info size={20} />
            {error || 'カードが見つかりません'}
        </div>
        <Link href="/stamp/cards" className="text-blue-600 underline">
          カード一覧に戻る
        </Link>
      </div>
    )
  }

  const currentCount = stamps.length
  const targetCount = card.target_count || 10
  const progress = Math.min((currentCount / targetCount) * 100, 100)
  const isComplete = currentCount >= targetCount

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white p-4 flex items-center shadow-sm relative z-10">
        <Link href="/stamp/cards" className="p-2 -ml-2 text-gray-600">
            <ArrowLeft size={24} />
        </Link>
        <h1 className="flex-1 text-center font-bold text-gray-800 mr-8">スタンプカード</h1>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-6">
        
        {/* Card Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="relative h-32 bg-gray-200">
                {card.shops?.image_url ? (
                    <Image 
                        src={card.shops.image_url} 
                        alt={card.shops.name}
                        fill
                        className="object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Store size={32} className="text-gray-400" />
                    </div>
                )}
                <div className="absolute inset-0 bg-black/30 flex items-end p-4">
                    <h2 className="text-white font-bold text-xl drop-shadow-md">
                        {card.shops?.name}
                    </h2>
                </div>
            </div>
            
            <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">現在のスタンプ</span>
                    <span className="text-2xl font-bold text-blue-600">
                        {currentCount} <span className="text-sm text-gray-400">/ {targetCount}</span>
                    </span>
                </div>
                
                {/* Progress Bar */}
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                        className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-blue-500'}`}
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {isComplete && (
                    <div className="mt-4 bg-orange-50 text-orange-800 p-3 rounded-xl text-sm flex items-center gap-2 animate-pulse">
                        <Gift size={20} className="shrink-0" />
                        <span className="font-bold">特典獲得条件を達成しました！</span>
                    </div>
                )}
            </div>
        </div>

        {/* Stamps Grid */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="grid grid-cols-5 gap-4">
                {Array.from({ length: targetCount }).map((_, i) => {
                    const isStamped = i < currentCount
                    const isLast = i === targetCount - 1
                    
                    return (
                        <div key={i} className="flex flex-col items-center gap-1">
                            <div className={`
                                w-10 h-10 rounded-full flex items-center justify-center border-2 
                                ${isStamped 
                                    ? 'bg-blue-100 border-blue-500 text-blue-600' 
                                    : 'bg-gray-50 border-gray-200 text-gray-300'
                                }
                                ${isLast && !isStamped ? 'border-dashed border-pink-300' : ''}
                            `}>
                                {isStamped ? (
                                    <ScanLine size={20} />
                                ) : isLast ? (
                                    <Gift size={20} className="text-pink-400" />
                                ) : (
                                    <span className="text-xs font-bold">{i + 1}</span>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>

        {/* Reward Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                <Gift size={18} className="text-pink-500" />
                特典内容
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
                {card.reward_description || 'スタンプを集めて素敵な特典をゲットしよう！'}
            </p>
        </div>

        {/* Action Button */}
        <div className="fixed bottom-6 left-4 right-4 max-w-lg mx-auto">
            <Link 
                href={`/stamp/scan?shopId=${shopId}`}
                className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
            >
                <ScanLine size={20} />
                スタンプを押す
            </Link>
        </div>
      </div>
    </div>
  )
}
