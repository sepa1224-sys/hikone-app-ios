'use client'

import { useEffect, useState } from 'react'
import { getMyActiveStampCards, getAvailableStampCards, registerStampCard } from '@/lib/actions/stamp'
import { useAuth } from '@/components/AuthProvider'
import { ArrowLeft, Stamp, Store, Plus } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function MyStampCardsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [activeCards, setActiveCards] = useState<any[]>([])
  const [availableCards, setAvailableCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCards() {
      if (!user) return
      
      const [activeRes, availableRes] = await Promise.all([
        getMyActiveStampCards(),
        getAvailableStampCards()
      ])

      if (activeRes.success && activeRes.cards) {
        setActiveCards(activeRes.cards)
      }

      if (availableRes.success && availableRes.cards) {
        setAvailableCards(availableRes.cards)
      }
      
      setLoading(false)
    }
    fetchCards()
  }, [user])

  const handleRegister = async (shopId: string) => {
    setRegistering(shopId)
    const result = await registerStampCard(shopId)
    
    if (result.success) {
      // 成功したら画面をリロードして最新状態にする
      router.refresh()
      // クライアント側の状態も更新（リロードが走るまでの繋ぎとして）
      const targetCard = availableCards.find(c => c.shopId === shopId)
      if (targetCard) {
        setAvailableCards(prev => prev.filter(c => c.shopId !== shopId))
        setActiveCards(prev => [{
            ...targetCard, 
            stampCount: 0, 
            lastStampedAt: new Date().toISOString()
        }, ...prev])
      }
    } else {
      alert(result.message || '登録に失敗しました')
    }
    setRegistering(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white p-4 flex items-center shadow-sm relative z-10 sticky top-0">
        <Link href="/" className="p-2 -ml-2 text-gray-600">
            <ArrowLeft size={24} />
        </Link>
        <h1 className="flex-1 text-center font-bold text-gray-800 mr-8">スタンプカード一覧</h1>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-8">
        
        {/* マイカード（使用中）エリア */}
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Stamp size={20} className="text-blue-600" />
            マイカード
          </h2>
          
          {activeCards.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500 text-sm">使用中のカードはありません</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeCards.map((card) => (
                <Link 
                  key={card.shopId} 
                  href={`/stamp/card/${card.shopId}`} 
                  className="block bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden relative shrink-0">
                      {card.thumbnailUrl ? (
                        <Image 
                          src={card.thumbnailUrl} 
                          alt={card.shopName}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Store size={24} className="text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800">{card.shopName}</h3>
                      <div className="flex items-center gap-1 mt-1">
                        <div className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md text-xs font-bold flex items-center gap-1">
                          <Stamp size={12} />
                          {card.stampCount} / {card.targetCount}
                        </div>
                        <span className="text-[10px] text-gray-400">
                          最終: {new Date(card.lastStampedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* 新しいカードを探すエリア */}
        <section>
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Store size={20} className="text-green-600" />
                新しいカードを探す
            </h2>

            {availableCards.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-500 text-sm">現在登録可能な新しいカードはありません</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {availableCards.map((card) => (
                        <div key={card.shopId} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-gray-100 rounded-xl overflow-hidden relative shrink-0">
                                    {card.thumbnailUrl ? (
                                        <Image 
                                            src={card.thumbnailUrl} 
                                            alt={card.shopName}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Store size={20} className="text-gray-400" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-800 truncate">{card.shopName}</h3>
                                    <p className="text-xs text-gray-500 truncate">{card.reward || '特典あり'}</p>
                                </div>
                                <button
                                    onClick={() => handleRegister(card.shopId)}
                                    disabled={registering === card.shopId}
                                    className="bg-green-600 text-white text-xs font-bold py-2 px-4 rounded-full shadow hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-1 shrink-0"
                                >
                                    {registering === card.shopId ? (
                                        <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></div>
                                    ) : (
                                        <Plus size={14} />
                                    )}
                                    利用開始
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>

      </div>
    </div>
  )
}
