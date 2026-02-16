'use client'

import { useState, useEffect } from 'react'
import QRScanner from '@/components/shop/QRScanner'
import { grantStamp, getStampCard, getUserStamps } from '@/lib/actions/stamp'
import { ArrowLeft, MapPin, CheckCircle2, AlertCircle, Loader2, Store, Gift, ScanLine } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'

export default function ScanContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryShopId = searchParams.get('shopId')

  const [status, setStatus] = useState<'idle' | 'locating' | 'granting' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [shopName, setShopName] = useState('')
  
  // Success state data
  const [card, setCard] = useState<any>(null)
  const [stamps, setStamps] = useState<any[]>([])

  // クエリパラメータでshopIdが渡された場合の処理
  useEffect(() => {
    if (queryShopId) {
       // 自動では開始せず、ユーザーにボタンを押させる（誤操作防止）
    }
  }, [queryShopId])

  const handleScan = async (shopId: string) => {
    if (status !== 'idle') return

    // ID形式チェック（簡易）
    if (!shopId || shopId.length < 10) return

    setStatus('locating')
    setMessage('位置情報を確認中...')

    if (!navigator.geolocation) {
      setStatus('error')
      setMessage('お使いの端末は位置情報に対応していません')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setStatus('granting')
        setMessage('スタンプを押しています...')
        
        const { latitude, longitude } = position.coords
        
        try {
          const result = await grantStamp(shopId, latitude, longitude)
          
          if (result.success) {
            // Fetch updated card data for display
            const [cardRes, stampsRes] = await Promise.all([
              getStampCard(shopId),
              getUserStamps(shopId)
            ])

            if (cardRes.success && cardRes.card && stampsRes.success && stampsRes.stamps) {
              setCard(cardRes.card)
              setStamps(stampsRes.stamps)
              setShopName(result.shopName || cardRes.card.shops?.name || '')
              setStatus('success')
              setMessage(result.message || 'スタンプを獲得しました！')
            } else {
              // Fallback if data fetch fails
              setStatus('success')
              setMessage(result.message || 'スタンプを獲得しました！（カード情報の更新に失敗しました）')
              if (result.shopName) setShopName(result.shopName)
            }
          } else {
            setStatus('error')
            setMessage(result.message || 'エラーが発生しました')
          }
        } catch (e) {
          setStatus('error')
          setMessage('通信エラーが発生しました')
        }
      },
      (error) => {
        console.error(error)
        setStatus('error')
        setMessage('位置情報の取得に失敗しました。位置情報の利用を許可してください。')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const reset = () => {
    setStatus('idle')
    setMessage('')
    setShopName('')
    setCard(null)
    setStamps([])
    // クエリパラメータがある場合は戻るボタンなどでリストに戻る想定だが、リセット時はスキャンモードへ
    router.replace('/stamp/scan')
  }

  // Render helper for stamp card
  const renderStampCard = () => {
    if (!card) return null

    const currentCount = stamps.length
    const targetCount = card.target_count || 10
    const progress = Math.min((currentCount / targetCount) * 100, 100)
    const isComplete = currentCount >= targetCount

    return (
      <div className="w-full max-w-sm mx-auto bg-white rounded-2xl shadow-lg overflow-hidden mb-8 border border-gray-100">
        <div className="relative h-24 bg-gray-200">
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
                <h2 className="text-white font-bold text-lg drop-shadow-md">
                    {card.shops?.name}
                </h2>
            </div>
        </div>
        
        <div className="p-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 font-bold">現在のスタンプ</span>
                <span className="text-xl font-black text-blue-600">
                    {currentCount} <span className="text-xs text-gray-400 font-bold">/ {targetCount}</span>
                </span>
            </div>
            
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
                <div 
                    className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-blue-500'}`}
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: targetCount }).map((_, i) => {
                    const isStamped = i < currentCount
                    const isLast = i === targetCount - 1
                    
                    return (
                        <div key={i} className="flex flex-col items-center gap-1">
                            <div className={`
                                w-8 h-8 rounded-full flex items-center justify-center border-2 
                                ${isStamped 
                                    ? 'bg-blue-100 border-blue-500 text-blue-600' 
                                    : 'bg-gray-50 border-gray-200 text-gray-300'
                                }
                                ${isLast && !isStamped ? 'border-dashed border-pink-300' : ''}
                            `}>
                                {isStamped ? (
                                    <ScanLine size={14} />
                                ) : isLast ? (
                                    <Gift size={14} className="text-pink-400" />
                                ) : (
                                    <span className="text-[10px] font-bold">{i + 1}</span>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
            
            {isComplete && (
                <div className="mt-4 bg-orange-50 text-orange-800 p-2 rounded-lg text-xs font-bold flex items-center gap-2 animate-pulse">
                    <Gift size={16} className="shrink-0" />
                    <span>特典獲得条件を達成しました！</span>
                </div>
            )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white p-4 flex items-center shadow-sm relative z-10">
        <Link href="/" className="p-2 -ml-2 text-gray-600">
            <ArrowLeft size={24} />
        </Link>
        <h1 className="flex-1 text-center font-bold text-gray-800 mr-8">スタンプ獲得</h1>
      </div>

      <div className="flex-1 p-6 flex flex-col items-center max-w-lg mx-auto w-full">
        
        {/* Status Display */}
        {status === 'idle' && (
          <div className="w-full space-y-4">
            {queryShopId ? (
               <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
                  <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Store size={32} className="text-blue-500" />
                  </div>
                  <p className="font-bold text-gray-800 mb-2">店舗でスタンプを押す</p>
                  <p className="text-sm text-gray-500 mb-8">
                    位置情報を確認してスタンプを獲得します。<br/>
                    店舗にいることを確認してください。
                  </p>
                  
                  <button 
                    onClick={() => handleScan(queryShopId)}
                    className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                  >
                    <MapPin size={20} />
                    ここ（現在地）でスタンプ！
                  </button>

                  <div className="mt-6 border-t pt-6">
                    <p className="text-xs text-gray-400 mb-2">または</p>
                    <button 
                      onClick={() => router.replace('/stamp/scan')}
                      className="text-gray-500 text-sm font-bold underline"
                    >
                      QRコードをスキャンする
                    </button>
                  </div>
               </div>
            ) : (
              <div className="bg-white p-6 rounded-2xl shadow-sm text-center">
                <p className="font-bold text-gray-800 mb-2">店舗のQRコードをスキャン</p>
                <p className="text-xs text-gray-500 mb-6">
                  カメラへのアクセスと位置情報を許可してください。<br/>
                  店舗から半径50m以内でスタンプを獲得できます。
                </p>
                
                <QRScanner onScan={handleScan} />
              </div>
            )}
          </div>
        )}

        {status === 'locating' && (
          <div className="text-center mt-20">
            <div className="bg-blue-100 p-6 rounded-full inline-block mb-6 animate-pulse">
              <MapPin size={48} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">位置情報を確認中</h2>
            <p className="text-gray-500">{message}</p>
          </div>
        )}

        {status === 'granting' && (
          <div className="text-center mt-20">
            <div className="bg-blue-100 p-6 rounded-full inline-block mb-6">
              <Loader2 size={48} className="text-blue-600 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">処理中</h2>
            <p className="text-gray-500">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center w-full animate-in zoom-in duration-300 pb-10">
            <div className="flex items-center justify-center gap-2 mb-4">
                <CheckCircle2 size={32} className="text-green-600" />
                <h2 className="text-2xl font-black text-gray-800">GET!</h2>
            </div>
            
            <p className="font-bold text-lg text-green-600 mb-6">{message}</p>
            
            {/* スタンプカード表示 */}
            {renderStampCard()}
            
            <button 
              onClick={reset}
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 transition mb-3"
            >
              続けてスキャンする
            </button>
            
            <button 
              onClick={() => router.push('/')} 
              className="w-full bg-white border-2 border-gray-200 text-gray-600 font-bold py-4 rounded-xl hover:bg-gray-50 transition"
            >
              ホームに戻る
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center w-full mt-10 animate-in shake duration-300">
            <div className="bg-red-100 p-6 rounded-full inline-block mb-6">
              <AlertCircle size={48} className="text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">エラー</h2>
            <p className="text-red-600 font-bold mb-8 px-4">{message}</p>
            
            <button 
              onClick={reset}
              className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-black transition"
            >
              もう一度試す
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
