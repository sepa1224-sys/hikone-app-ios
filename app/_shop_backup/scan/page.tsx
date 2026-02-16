'use client'

import { useState } from 'react'
import QRScanner from '@/components/shop/QRScanner'
import { processPayment } from '@/lib/actions/shop'
import { useAuth } from '@/components/AuthProvider'
import { CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ShopScanPage() {
  const { user } = useAuth()
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [amount, setAmount] = useState(100)

  const handleScan = async (userId: string) => {
    if (status === 'processing' || status === 'success') return
    
    // QRコードの形式チェック（UUIDかどうかなど）
    // 簡易的に文字列長チェック
    if (!userId || userId.length < 10) {
        return // 無効なQRは無視
    }

    if (!user) {
        setStatus('error')
        setMessage('店舗ログインが必要です')
        return
    }

    setStatus('processing')
    setMessage('決済処理中...')

    try {
      const result = await processPayment(user.id, userId, amount)
      if (result.success) {
        setStatus('success')
        setMessage(`決済完了！ 残高: ${result.newPoints}pt`)
        // 3秒後にリセット
        setTimeout(() => {
            setStatus('idle')
            setMessage('')
        }, 3000)
      } else {
        setStatus('error')
        setMessage(result.message || 'エラーが発生しました')
      }
    } catch (e) {
      setStatus('error')
      setMessage('通信エラーが発生しました')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー */}
      <div className="bg-white p-4 flex items-center shadow-sm relative z-10">
        <Link href="/shop/dashboard" className="p-2 -ml-2 text-gray-600">
            <ArrowLeft size={24} />
        </Link>
        <h1 className="flex-1 text-center font-bold text-gray-800 mr-8">QR決済スキャン</h1>
      </div>

      <div className="flex-1 p-6 flex flex-col items-center max-w-lg mx-auto w-full">
        {/* 金額設定 */}
        <div className="w-full bg-white rounded-2xl p-4 shadow-sm mb-6">
            <p className="text-xs font-bold text-gray-400 mb-2 text-center">決済金額を設定</p>
            <div className="flex items-center justify-center gap-2 mb-4">
                <input 
                    type="number" 
                    value={amount} 
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="text-4xl font-black text-center w-32 border-b-2 border-blue-500 focus:outline-none text-blue-600 bg-transparent"
                />
                <span className="text-lg font-bold text-gray-500 mt-2">pt</span>
            </div>
            <div className="flex justify-center gap-2">
                {[100, 300, 500, 1000].map((val) => (
                    <button 
                        key={val}
                        onClick={() => setAmount(val)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                            amount === val 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        {val}
                    </button>
                ))}
            </div>
        </div>

        {/* スキャナーエリア */}
        <div className="w-full relative">
            {status === 'success' ? (
                <div className="bg-green-50 rounded-3xl p-8 text-center border-4 border-green-100 animate-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="text-green-600 w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-black text-green-800 mb-2">決済完了！</h2>
                    <p className="font-bold text-green-700">{message}</p>
                    <button 
                        onClick={() => setStatus('idle')}
                        className="mt-6 px-6 py-2 bg-green-600 text-white rounded-full font-bold shadow-lg hover:bg-green-700 transition-colors"
                    >
                        続けてスキャン
                    </button>
                </div>
            ) : status === 'error' ? (
                <div className="bg-red-50 rounded-3xl p-8 text-center border-4 border-red-100 animate-in shake duration-300">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="text-red-600 w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-black text-red-800 mb-2">エラー</h2>
                    <p className="font-bold text-red-700">{message}</p>
                    <button 
                        onClick={() => {
                            setStatus('idle')
                            setMessage('')
                        }}
                        className="mt-6 px-6 py-2 bg-red-600 text-white rounded-full font-bold shadow-lg hover:bg-red-700 transition-colors"
                    >
                        もう一度試す
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-3xl p-4 shadow-lg border-4 border-white overflow-hidden relative">
                    <QRScanner onScan={handleScan} />
                    
                    {/* スキャン中のオーバーレイ装飾 */}
                    <div className="absolute inset-0 pointer-events-none border-[30px] border-white/50 rounded-3xl z-10"></div>
                    {status === 'processing' && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
                            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="font-black text-blue-600 animate-pulse">決済処理中...</p>
                        </div>
                    )}
                </div>
            )}
        </div>
        
        <p className="text-center text-xs text-gray-400 font-bold mt-6">
            お客様の会員証QRコードを枠内に映してください
        </p>
      </div>
    </div>
  )
}
