'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Store, ArrowLeft } from 'lucide-react'

export default function ShopStaffHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const [isShopStaff, setIsShopStaff] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          setLoading(false)
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle()

        setIsShopStaff(profile?.role === 'shop')
      } catch (error) {
        console.error('Role check error:', error)
      } finally {
        setLoading(false)
      }
    }

    checkRole()
  }, [])

  // 店舗ページ(/shop/*)以外にいる場合のみ表示
  const isGeneralPage = !pathname?.startsWith('/shop')

  if (loading || !isShopStaff || !isGeneralPage) return null

  return (
    <div className="sticky top-0 left-0 right-0 z-[100] bg-slate-900 text-white px-4 py-2 shadow-md flex items-center justify-between animate-in slide-in-from-top">
      <div className="flex items-center gap-2">
        <Store size={18} />
        <span className="text-xs font-bold">店舗スタッフとして閲覧中</span>
      </div>
      <button 
        onClick={() => router.push('/shop/dashboard')}
        className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-xs font-bold transition-colors"
      >
        <ArrowLeft size={14} />
        店舗ダッシュボードに戻る
      </button>
    </div>
  )
}
