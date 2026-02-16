'use client'

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  session: Session | null
  user: User | null
  profile: any | null
  loading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
  loginPhase: string
  lastDeepLinkUrl: string | null
  setLoginPhase: (phase: string) => void
  setLastDeepLinkUrl: (url: string | null) => void
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
  signOut: async () => {},
  loginPhase: '',
  lastDeepLinkUrl: null,
  setLoginPhase: () => {},
  setLastDeepLinkUrl: () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  
  const initialized = useRef(false)
  const isMountedRef = useRef(true)
  const sessionCacheRef = useRef<Session | null>(null)
  const [loginPhase, setLoginPhase] = useState<string>('')
  const [lastDeepLinkUrl, setLastDeepLinkUrl] = useState<string | null>(null)

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, is_student, school_name, is_official_student, grade')
        .eq('id', userId)
        .single()
      
      if (error) {
        if (error.code !== 'PGRST116') {
          console.error('🔐 [AuthProvider] プロフィール取得エラー:', error)
        }
        return null
      }
      return data
    } catch (err) {
      console.error('🔐 [AuthProvider] プロフィール取得例外:', err)
      return null
    }
  }

  const refreshProfile = async () => {
    if (user?.id) {
      const p = await fetchProfile(user.id)
      setProfile(p)
    }
  }

  useEffect(() => {
    isMountedRef.current = true
    if (initialized.current) return
    initialized.current = true
    
    ;(async () => {
      try {
        try {
          const raw = typeof window !== 'undefined' ? window.localStorage.getItem('sb-auth-token') : null
          if (raw) {
            const stored = JSON.parse(raw)
            const at = stored?.access_token
            const rt = stored?.refresh_token
            if (at && rt) {
              await supabase.auth.setSession({ access_token: at, refresh_token: rt } as any)
              setLoading(false)
              setLoginPhase('PHASE 5: Session Established')
              try { window.location.replace('/profile') } catch {}
            }
          }
        } catch {}
        const cap: any = (globalThis as any).Capacitor
        const appPlugin = cap?.Plugins?.App || cap?.App
        if (appPlugin?.addListener) {
          await appPlugin.addListener('appUrlOpen', (data: any) => {
            try {
              try { console.log('🔗 Deep Link Received:', data?.url) } catch {}
              const raw = data?.url || ''
              setLoginPhase('PHASE 3: DeepLink Received')
              setLastDeepLinkUrl(raw)
              let code: string | null = null
              let accessToken: string | null = null
              let refreshToken: string | null = null
              if (raw.startsWith('com.regionalportal.app://')) {
                const u = new URL(raw.replace('com.regionalportal.app://', 'http://dummy/'))
                code = u.searchParams.get('code')
                accessToken = u.searchParams.get('access_token')
                refreshToken = u.searchParams.get('refresh_token')
              } else if (raw.startsWith('hikoneapp://')) {
                const u = new URL(raw.replace('hikoneapp://', 'http://dummy/'))
                code = u.searchParams.get('code')
                accessToken = u.searchParams.get('access_token')
                refreshToken = u.searchParams.get('refresh_token')
              } else if (raw.startsWith('capacitor://')) {
                const u = new URL(raw.replace('capacitor://localhost', 'http://192.168.178.46:3000'))
                code = u.searchParams.get('code')
                accessToken = u.searchParams.get('access_token')
                refreshToken = u.searchParams.get('refresh_token')
              } else if (raw.startsWith('http://') || raw.startsWith('https://')) {
                const u = new URL(raw)
                code = u.searchParams.get('code')
                accessToken = u.searchParams.get('access_token')
                refreshToken = u.searchParams.get('refresh_token')
              }

              if (accessToken && refreshToken) {
                try { console.log('🔑 AuthProvider received tokens', { accessTokenLen: accessToken.length, hasRefresh: !!refreshToken, raw }) } catch {}
                ;(async () => {
                  let forceOff: any
                  try {
                    try { setLoading(true) } catch {}
                    setLoginPhase('PHASE 4: Exchanging Code')
                    try { 
                      forceOff = setTimeout(() => { 
                        try { setLoading(false) } catch {} 
                        try { window.location.href = '/profile' } catch {}
                        setTimeout(() => { try { window.location.reload() } catch {} }, 250)
                      }, 3000) 
                    } catch {}
                    try { console.log('🔐 [AuthProvider] Setting session from implicit tokens') } catch {}
                    const { data, error } = await supabase.auth.setSession({ access_token: accessToken!, refresh_token: refreshToken! }) as any
                    if (error) {
                      try { console.error('🔐 [AuthProvider] setSessionエラー:', { message: error.message, name: error.name }) } catch {}
                      try { window.alert(`認証エラー: ${error.message}`) } catch {}
                      setLoading(false)
                    } else {
                      try { console.log('🔐 [AuthProvider] setSession成功', { hasSession: !!data?.session, userId: data?.session?.user?.id }) } catch {}
                      try { console.log('🔐 セッションができた:', data?.session?.user?.id || 'unknown') } catch {}
                      try { window.alert('ログイン成功: セッションを確立しました') } catch {}
                      try { router.refresh() } catch {}
                      try {
                        const saveData = data?.session
                        if (saveData) {
                          try { window.localStorage.setItem('sb-auth-token', JSON.stringify(saveData)) } catch {}
                        }
                      } catch {}
                      setLoginPhase('PHASE 5: Session Established')
                      try { window.location.replace('/profile') } catch {}
                      setLoading(false)
                    }
                  } finally {
                    try { clearTimeout(forceOff) } catch {}
                    try { setLoading(false) } catch {}
                    try { window.location.replace('/profile') } catch {}
                    setTimeout(() => { try { window.location.reload() } catch {} }, 250)
                  }
                })()
                return
              }

              if (code) {
                try { console.log('🔑 AuthProvider received code:', code, 'raw:', raw) } catch {}
                try { console.log('🔑 鍵を受け取った:', code) } catch {}
                ;(async () => {
                  let forceOff: any
                  try {
                    try { setLoading(true) } catch {}
                    try { console.log('🚀 Supabaseに鍵を渡してセッションを要求中...') } catch {}
                    setLoginPhase('PHASE 4: Exchanging Code')
                    let data: any, error: any
                    try { 
                      forceOff = setTimeout(() => { 
                        try { setLoading(false) } catch {} 
                        try { window.location.href = '/profile' } catch {}
                        setTimeout(() => { try { window.location.reload() } catch {} }, 250)
                      }, 3000) 
                    } catch {}
                    try {
                      const res = await supabase.auth.exchangeCodeForSession(code) as any
                      data = res.data
                      error = res.error
                    } catch (e: any) {
                      try { window.alert('ERROR: ' + (e?.message || 'Unknown')) } catch {}
                      try { window.alert(JSON.stringify(e)) } catch {}
                      throw e
                    }
                    if (error) {
                      try { console.error('❌ 拒否された理由:', error.message) } catch {}
                      try { window.alert(`Auth Error: ${error.message}`) } catch {}
                      setLoading(false)
                    } else {
                      try { console.log('🔐 [AuthProvider] exchangeCode成功', { hasSession: !!data?.session, userId: data?.session?.user?.id }) } catch {}
                      try { console.log('📦 受け取ったセッション:', JSON.stringify(data?.session)) } catch {}
                      try { console.log('🔐 セッションができた:', data?.session?.user?.id || 'unknown') } catch {}
                      try { window.alert('ログイン成功: セッションを確立しました') } catch {}
                      try {
                        const at = data?.session?.access_token
                        const rt = data?.session?.refresh_token
                        if (at && rt) {
                          await supabase.auth.setSession({ access_token: at, refresh_token: rt } as any)
                        }
                      } catch {}
                      try { router.refresh() } catch {}
                      try {
                        const saveData = data?.session
                        if (saveData) {
                          try { window.localStorage.setItem('sb-auth-token', JSON.stringify(saveData)) } catch {}
                        }
                      } catch {}
                      setLoginPhase('PHASE 5: Session Established')
                      try { window.location.replace('/profile') } catch {}
                      setLoading(false)
                    }
                  } finally {
                    try { clearTimeout(forceOff) } catch {}
                    try { setLoading(false) } catch {}
                    try { console.log('🔐 [AuthProvider] Navigating to profile after exchange') } catch {}
                    try { window.location.replace('/profile') } catch {}
                    setTimeout(() => {
                      try { window.location.reload() } catch {}
                    }, 250)
                  }
                })()
                return
              }

              try { console.log('🔑 AuthProvider received no code. raw:', raw) } catch {}
              try { setLoading(false) } catch {}
              try { window.location.href = '/' } catch {}
              setTimeout(() => {
                try { window.location.reload() } catch {}
              }, 250)
            } catch {
              try { console.error('🔐 [AuthProvider] appUrlOpen handler exception') } catch {}
              try { setLoading(false) } catch {}
              try { window.location.reload() } catch {}
            }
          })
        }
      } catch {}
    })()

    const initAuth = async () => {
      // モバイル環境などで getSession がハングする場合があるため、タイムアウトを設ける
      // ★ 1.2秒でタイムアウト、切れた場合はキャッシュされた以前のセッションを優先表示
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth Timeout')), 1200)
      )

      try {
        try { console.log('🔐 [AuthProvider] getSession start') } catch {}
        const { data: { session: initialSession }, error } = await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise
        ]) as any
        if (error) { try { console.error('🔐 [AuthProvider] セッション取得エラー:', { message: error.message, name: error.name }) } catch {} }
        try { console.log('🔐 [AuthProvider] getSession result', { hasSession: !!initialSession, userId: initialSession?.user?.id }) } catch {}
        if (initialSession && isMountedRef.current) {
          sessionCacheRef.current = initialSession
          setSession(initialSession)
          setUser(initialSession.user)
          setLoading(false)
          const profileData = await fetchProfile(initialSession.user.id)
          if (isMountedRef.current) setProfile(profileData)
        }
      } catch (err) {
        // タイムアウト時: キャッシュされた以前のセッションを優先して表示
        const cached = sessionCacheRef.current
        if (cached && isMountedRef.current) {
          setSession(cached)
          setUser(cached.user)
          setLoading(false)
          const profileData = await fetchProfile(cached.user.id)
          if (isMountedRef.current) setProfile(profileData)
        }
      } finally {
        // 何があってもここでロードを終わらせる
        if (isMountedRef.current) {
          setLoading(false)
        }
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, newSession: Session | null) => {
        if (!isMountedRef.current) return

        try { console.log('🔐 [AuthProvider] onAuthStateChange fired', { event, hasSession: !!newSession, userId: newSession?.user?.id }) } catch {}
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          try { window.alert(`認証状態イベント: ${event} (user:${newSession?.user?.id || 'none'})`) } catch {}
        }
        if (newSession) sessionCacheRef.current = newSession
        else sessionCacheRef.current = null
        setSession(newSession)
        setUser(newSession?.user ?? null)
        try { console.log('Current Loading State:', loading, 'event:', event) } catch {}
        
        if (newSession?.user) {
          setLoading(false)
          if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
            try { router.refresh() } catch {}
          }
          if (event === 'SIGNED_IN') {
            try { window.location.href = '/' } catch {}
            setLoginPhase('PHASE 5: Session Established')
          }
          if (['TOKEN_REFRESHED', 'USER_UPDATED'].includes(event) && sessionCacheRef.current?.user && !loading) {
            const profileData = await fetchProfile(newSession.user.id)
            if (isMountedRef.current) setProfile(profileData)
          }
        } else {
          setProfile(null)
        }
        // 状態変更後も確実にロードをオフにする
        setLoading(false)
      })

      return () => {
        subscription.unsubscribe()
      }
    }

    const unsubscribePromise = initAuth()

    return () => {
      isMountedRef.current = false
      unsubscribePromise.then(unsubscribe => unsubscribe?.())
    }
  }, [router, pathname, loading])

  useEffect(() => {
    if (!loading) return
    const t = setTimeout(() => {
      if (isMountedRef.current) setLoading(false)
    }, 5000)
    return () => clearTimeout(t)
  }, [loading])
  
  useEffect(() => {
    try { console.log('Current Loading State:', loading) } catch {}
  }, [loading])

  const signOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, refreshProfile, signOut, loginPhase, lastDeepLinkUrl, setLoginPhase, setLastDeepLinkUrl }}>
      {children}
    </AuthContext.Provider>
  )
}
