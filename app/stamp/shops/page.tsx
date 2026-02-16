'use client'

import { useState, useEffect } from 'react'
import { getStampShops } from '@/lib/actions/stamp'
import { ArrowLeft, Store, MapPin, Gift, ScanLine } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function StampShopsPage() {
  const [shops, setShops] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchShops() {
      const result = await getStampShops()
      if (result.success && result.shops) {
        setShops(result.shops)
      }
      setLoading(false)
    }
    fetchShops()
  }, [])

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
        <h1 className="flex-1 text-center font-bold text-gray-800 mr-8">スタンプ実施店</h1>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-4">
        {shops.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="bg-gray-200 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Store size={32} className="text-gray-400" />
            </div>
            <p className="font-bold">スタンプ実施店がありません</p>
            <p className="text-xs mt-2">現在準備中です</p>
          </div>
        ) : (
          shops.map((shop) => (
            <div 
              key={shop.id} 
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition"
            >
              <div className="relative h-40 w-full bg-gray-200">
                {shop.imageUrl ? (
                  <Image 
                    src={shop.imageUrl} 
                    alt={shop.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Store size={40} className="text-gray-400" />
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded-full text-xs font-bold text-gray-700 shadow-sm flex items-center gap-1">
                    <Gift size={12} className="text-pink-500" />
                    {shop.targetCount}個で特典
                </div>
              </div>
              
              <div className="p-4">
                <h3 className="font-bold text-lg text-gray-800">{shop.name}</h3>
                <div className="flex items-center text-gray-500 text-xs mt-1 mb-3">
                  <MapPin size={12} className="mr-1" />
                  {shop.address || '住所未登録'}
                </div>
                
                <div className="bg-orange-50 text-orange-800 p-3 rounded-xl text-sm mb-4 flex items-start gap-2">
                    <Gift size={16} className="mt-0.5 shrink-0" />
                    <span className="font-bold">{shop.reward}</span>
                </div>

                <div className="flex gap-2">
                    <Link 
                        href={`/shop/${shop.id}`}
                        className="flex-1 bg-gray-100 text-gray-700 font-bold py-2 rounded-lg text-center text-sm hover:bg-gray-200 transition"
                    >
                        店舗詳細
                    </Link>
                    <Link 
                        href={`/stamp/scan?shopId=${shop.id}`}
                        className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-lg text-center text-sm hover:bg-blue-700 transition flex items-center justify-center gap-2"
                    >
                        <ScanLine size={16} />
                        スキャン
                    </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
