import Link from 'next/link'
import { Home, Scan, Settings } from 'lucide-react'

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans">
      {children}
      
      {/* 店舗用ボトムナビゲーション */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-2 flex justify-around items-end z-50 h-[80px] pb-6">
        <Link href="/shop/dashboard" className="flex flex-col items-center group w-16">
          <Home size={24} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
          <span className="text-[10px] font-bold mt-1 text-gray-400 group-hover:text-blue-600 transition-colors">ホーム</span>
        </Link>
        
        <Link href="/shop/scan" className="relative -top-6">
          <div className="bg-blue-600 text-white p-4 rounded-full shadow-xl border-4 border-gray-50 transform transition-transform hover:scale-105 active:scale-95 flex items-center justify-center">
            <Scan size={28} />
          </div>
        </Link>
        
        <Link href="/profile" className="flex flex-col items-center group w-16">
          <Settings size={24} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
          <span className="text-[10px] font-bold mt-1 text-gray-400 group-hover:text-blue-600 transition-colors">設定</span>
        </Link>
      </nav>
    </div>
  )
}
