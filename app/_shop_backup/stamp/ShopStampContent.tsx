'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import QRCode from 'react-qr-code'
import { ArrowLeft, Save, Stamp, Info, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { getShopStampSettings, updateShopStampSettings } from '@/lib/actions/shop'

export default function ShopStampContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const impersonateShopId = searchParams.get('impersonateShopId') || undefined

  const [shopId, setShopId] = useState<string | null>(null)
  const [shopName, setShopName] = useState<string | null>(null)
  const [targetCount, setTargetCount] = useState(10)
  const [reward, setReward] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    if (!user) return
    
    async function fetchData() {
      try {
        const { success, data, shopId: fetchedShopId, shopName: fetchedShopName, message } = await getShopStampSettings(user!.id, impersonateShopId)
        
        if (!success) {
          console.error('Failed to fetch stamp settings:', message)
          // エラー時の処理（必要なら）
          setLoading(false)
          return
        }

        if (fetchedShopId) setShopId(fetchedShopId)
        if (fetchedShopName) setShopName(fetchedShopName)

        if (data) {
          setTargetCount(data.target_count)
          setReward(data.reward_description)
        }
      } catch (error) {
        console.error('Error fetching stamp settings:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [user, impersonateShopId])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setMessage(null)
    
    const { success, message: resMessage } = await updateShopStampSettings(
      user.id, 
      { target_count: targetCount, reward_description: reward },
      impersonateShopId
    )
      
    if (!success) {
      setMessage({ type: 'error', text: resMessage || '保存に失敗しました' })
    } else {
      setMessage({ type: 'success', text: '設定を保存しました！' })
    }
    setSaving(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
    </div>
  )

  const backLink = impersonateShopId 
    ? `/shop/settings?impersonateShopId=${impersonateShopId}` 
    : "/shop/dashboard"

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
       {/* Header */}
       <div className="bg-white p-4 shadow-sm flex items-center mb-6 sticky top-0 z-10">
         <Link href={backLink} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition">
            <ArrowLeft size={24} />
         </Link>
         <h1 className="font-bold text-lg text-gray-800 ml-2">スタンプカード管理{impersonateShopId && ' (代理編集)'}</h1>
       </div>

       {impersonateShopId && (
        <div className="bg-red-50 border-b border-red-200 p-3 mb-6 -mt-6 flex items-center justify-center gap-2 text-red-700 font-bold text-sm">
          <ShieldAlert size={18} />
          管理者として {shopName ? `[${shopName}]` : `(Shop ID: ${impersonateShopId})`} を編集中
        </div>
      )}

       <div className="max-w-md mx-auto px-4 space-y-6">
         {/* QR Code Section */}
         <div className="bg-white p-6 rounded-2xl shadow-sm text-center">
           <h2 className="font-bold text-gray-800 mb-4 text-lg">店舗用QRコード</h2>
           <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800 mb-6 flex items-start text-left gap-3">
             <Info className="shrink-0 mt-0.5" size={18} />
             <p>お客様にこのQRコードを読み取ってもらうことで、来店スタンプを付与できます。</p>
           </div>
           
           {shopId ? (
             <div className="bg-white p-4 border-2 border-dashed border-gray-200 rounded-xl inline-block mx-auto">
               <div className="bg-white p-2">
                 <QRCode value={shopId} size={200} />
               </div>
             </div>
           ) : (
             <p className="text-red-500">店舗IDが取得できませんでした</p>
           )}
           <p className="mt-4 text-xs text-gray-400 font-mono">ID: {shopId}</p>
         </div>

         {/* Settings Section */}
         <div className="bg-white p-6 rounded-2xl shadow-sm">
           <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
             <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
               <Stamp size={20} />
             </div>
             <h2 className="font-bold text-gray-800 text-lg">カード設定</h2>
           </div>
           
           <div className="space-y-6">
             <div>
               <label className="block text-sm font-bold text-gray-700 mb-2">ゴールまでのスタンプ数</label>
               <div className="relative">
                 <select 
                   value={targetCount}
                   onChange={(e) => setTargetCount(Number(e.target.value))}
                   className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl appearance-none font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                 >
                   {[5, 10, 15, 20, 30].map(n => (
                     <option key={n} value={n}>{n}個</option>
                   ))}
                 </select>
                 <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                   ▼
                 </div>
               </div>
             </div>

             <div>
               <label className="block text-sm font-bold text-gray-700 mb-2">特典内容（ゴール時のプレゼント）</label>
               <textarea
                 value={reward}
                 onChange={(e) => setReward(e.target.value)}
                 placeholder="例: ドリンク1杯無料、お会計から10%OFFなど"
                 className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl h-32 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none resize-none"
               />
             </div>

             <button
               onClick={handleSave}
               disabled={saving}
               className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 active:scale-[0.98] transition flex items-center justify-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-70 disabled:cursor-not-allowed"
             >
               {saving ? (
                 <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
               ) : (
                 <>
                   <Save size={20} />
                   設定を保存
                 </>
               )}
             </button>
             
             {message && (
               <div className={`p-4 rounded-xl text-sm font-bold text-center animate-in fade-in slide-in-from-bottom-2 ${
                 message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
               }`}>
                 {message.text}
               </div>
             )}
           </div>
         </div>
       </div>
    </div>
  )
}
