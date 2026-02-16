'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Utensils, Bus, Home, LayoutGrid, UserCircle, Settings } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface BottomNavigationProps {
  onNavigate?: () => void
}

// =====================================================
// ナビゲーション項目の定義
// =====================================================
const NAV_ITEMS = [
  { href: '/taberu', label: '食べる', icon: Utensils },
  { href: '/ido', label: '移動', icon: Bus },
  { href: '/', label: 'ホーム', icon: Home, isCenter: true },
  { href: '/living', label: '暮らし', icon: LayoutGrid },
  { href: '/profile', label: '会員情報', icon: UserCircle, requiresAuth: true },
]

/**
 * 下部ナビゲーションバー
 * 5つのタブ: 食べる、移動、ホーム、暮らし、会員情報
 * 「会員情報」は未ログインの場合 /login に遷移
 */
export default function BottomNavigation({ onNavigate }: BottomNavigationProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null)
  const isMountedRef = useRef(true)
  

  // ログイン状態と管理者権限を確認
  useEffect(() => {
    let isMounted = true

    const checkAuth = async () => {
      if (!isMounted) return

      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        // AbortErrorの場合は無視
        if (error && error.name === 'AbortError') {
          return
        }
        
        if (!isMounted) return
        
        setIsLoggedIn(!!session)
        
        // ログインしている場合、管理者権限をチェック
        if (session?.user) {
          try {
            const { data, error: profileError } = await supabase
              .from('profiles')
              .select('is_admin')
              .eq('id', session.user.id)
              .single()
            
            // AbortErrorの場合は無視
            if (profileError && profileError.name === 'AbortError') {
              return
            }
            
            if (!isMounted) return
            
            setIsAdmin(data?.is_admin === true)
          } catch (err: any) {
            // AbortErrorの場合は無視
            if (err?.name === 'AbortError') {
              return
            }
            console.error('管理者権限チェックエラー:', err)
            if (isMounted) {
              setIsAdmin(false)
            }
          }
        } else {
          if (isMounted) {
            setIsAdmin(false)
          }
        }
      } catch (err: any) {
        // AbortErrorの場合は無視
        if (err?.name === 'AbortError') {
          return
        }
        console.error('認証チェックエラー:', err)
      }
    }
    
    checkAuth()

    // 認証状態の変化を監視
    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: import('@supabase/supabase-js').Session | null) => {
        if (!isMounted) return

        setIsLoggedIn(!!session)
        
        if (session?.user) {
          try {
            const { data, error: profileError } = await supabase
              .from('profiles')
              .select('is_admin')
              .eq('id', session.user.id)
              .single()
            
            // AbortErrorの場合は無視
            if (profileError && profileError.name === 'AbortError') {
              return
            }
            
            if (!isMounted) return
            
            setIsAdmin(data?.is_admin === true)
          } catch (err: any) {
            // AbortErrorの場合は無視
            if (err?.name === 'AbortError') {
              return
            }
            if (isMounted) {
              setIsAdmin(false)
            }
          }
        } else {
          if (isMounted) {
            setIsAdmin(false)
          }
        }
      })

      subscriptionRef.current = subscription
    } catch (err: any) {
      // AbortErrorの場合は無視
      if (err?.name !== 'AbortError') {
        console.error('認証状態監視設定エラー:', err)
      }
    }

    return () => {
      isMounted = false
      isMountedRef.current = false
      if (subscriptionRef.current) {
        try {
          subscriptionRef.current.unsubscribe()
          subscriptionRef.current = null
        } catch (err: any) {
          // AbortErrorの場合は無視
          if (err?.name !== 'AbortError') {
            console.error('サブスクリプション解除エラー:', err)
          }
        }
      }
    }
  }, [])

  const isActive = (href: string) => pathname === href

  // 会員情報ボタンのクリックハンドラ
  const handleProfileClick = (e: React.MouseEvent, item: typeof NAV_ITEMS[0]) => {
    if (item.requiresAuth && !isLoggedIn) {
      // イベントの競合停止: Next.jsの標準的な遷移処理を停止
      e.preventDefault()
      e.stopPropagation()
      
      onNavigate?.()
      
      // router.push の廃止: 強制的にリロードを伴う遷移を行う
      window.location.href = '/login'
    } else {
      onNavigate?.()
    }
  }

  if (pathname === '/running') {
    return null
  }

  return (
    <>
      <nav 
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 99999,
          height: '64px',
          backgroundColor: 'white',
          borderTop: '1px solid #f3f4f6',
          boxShadow: '0 -5px 15px rgba(0,0,0,0.05)',
        }}
      >
        <div className="relative flex items-center justify-between px-2 h-full max-w-md mx-auto">
          
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            
            // ホーム（中央）は特別なデザイン
            if (item.isCenter) {
              return (
                <Link 
                  key={item.href}
                  href={item.href} 
                  prefetch={false}
                  className="relative flex flex-col items-center w-16 h-full"
                  onClick={onNavigate}
                >
                  <div className="absolute -top-2 w-14 h-10 bg-white rounded-t-3xl border-t border-gray-50"></div>
                  <div className="relative -top-3 w-12 h-12 rounded-full flex items-center justify-center border-[4px] border-white shadow-lg active:scale-95 transition-all z-10 bg-[#FF0000]">
                    <Icon size={20} className="text-white" />
                  </div>
                  <span className="relative -top-2 text-[9px] font-black z-10 text-[#FF0000]">{item.label}</span>
                </Link>
              )
            }
            
            // 通常のナビゲーションアイテム
            // 「会員情報」は認証状態に応じて遷移先を制御
            return (
              <Link 
                key={item.href}
                href={item.requiresAuth && !isLoggedIn ? '/login' : item.href}
                prefetch={false}
                className="flex flex-col items-center justify-center flex-1 active:opacity-60 transition-opacity"
                onClick={(e) => handleProfileClick(e, item)}
              >
                <Icon size={20} className={isActive(item.href) ? 'text-[#ff0033]' : 'text-gray-400'} />
                <span className={`text-[9px] font-bold mt-1 ${isActive(item.href) ? 'text-[#ff0033]' : 'text-gray-400'}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}

        </div>
      </nav>
    </>
  )
}
