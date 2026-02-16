'use client'

import { Ticket, Gift, Utensils, Coffee } from 'lucide-react'

type Props = {
  schoolName: string
}

export default function SchoolCouponSection({ schoolName }: Props) {
  // モックデータ: 本来はDBから取得
  const coupons = [
    {
      id: 1,
      title: '学食 50円引き',
      shop: '大学会館食堂',
      description: '500円以上の注文で利用可能',
      icon: <Utensils size={20} className="text-orange-500" />,
      color: 'bg-orange-50 text-orange-600 border-orange-200'
    },
    {
      id: 2,
      title: 'コーヒー サイズアップ無料',
      shop: 'キャンパスカフェ',
      description: 'テスト期間中限定！',
      icon: <Coffee size={20} className="text-brown-500" />,
      color: 'bg-amber-50 text-amber-800 border-amber-200'
    },
    {
      id: 3,
      title: '教科書購入 5%ポイント還元',
      shop: '購買部',
      description: '新学期キャンペーン',
      icon: <Gift size={20} className="text-pink-500" />,
      color: 'bg-pink-50 text-pink-600 border-pink-200'
    }
  ]

  return (
    <div className="px-4 mb-8">
      <div className="flex items-center gap-2 mb-3">
        <Ticket className="text-blue-500" size={20} />
        <h2 className="text-lg font-bold text-gray-800">
          <span className="text-blue-600">{schoolName}生</span> 限定クーポン
        </h2>
      </div>

      <div className="space-y-3">
        {coupons.map((coupon) => (
          <div 
            key={coupon.id} 
            className={`relative p-4 rounded-xl border-2 border-dashed flex items-center gap-4 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer bg-white ${coupon.color.split(' ')[2]}`}
          >
            {/* 左側の穴（チケット風） */}
            <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-gray-50 border border-gray-200"></div>
            <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-gray-50 border border-gray-200"></div>

            <div className={`p-3 rounded-full ${coupon.color.split(' ')[0]}`}>
              {coupon.icon}
            </div>
            
            <div className="flex-1">
              <div className="text-[10px] font-bold text-gray-400 mb-0.5">{coupon.shop}</div>
              <h3 className="font-bold text-gray-800 text-sm leading-tight mb-1">{coupon.title}</h3>
              <p className="text-[10px] text-gray-500">{coupon.description}</p>
            </div>

            <button className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md hover:bg-blue-700 transition-colors">
              使う
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
