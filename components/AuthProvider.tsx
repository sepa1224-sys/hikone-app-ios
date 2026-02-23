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
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [loginPhase, setLoginPhase] = useState<string>('')
  const [lastDeepLinkUrl, setLastDeepLinkUrl] = useState<string | null>(null)
  const pathname = usePathname()
  const cleanPathname = (pathname || '').replace(/\.html$/, '')
  const redirectedRef = useRef(false)

  const withTimeout = async <T,>(p: Promise<T>, ms: number, fallback: T): Promise<T> => {
    return new Promise<T>((resolve) => {
      const t = setTimeout(() => resolve(fallback), ms)
      p.then((v) => { clearTimeout(t); resolve(v) }).catch(() => { clearTimeout(t); resolve(fallback) })
    })
  }

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()
    return data ?? { role: 'general' }
  }

  const refreshProfile = async () => {
    if (!user?.id) { setProfile(null); return }
    const p = await withTimeout(fetchProfile(user.id), 5000, { role: 'general' } as any)
    setProfile(p)
  }

  useEffect(() => {
    if (!mounted) return
    let unsub: { unsubscribe: () => void } | null = null
    ;(async () => {
      const initialSession = await withTimeout<Session | null>(
        supabase.auth.getSession().then((r: any) => (r as { data: { session: Session | null } }).data.session),
        1200,
        null
      )
      setSession(initialSession)
      setUser(initialSession?.user ?? null)
      if (initialSession?.user) {
        const p = await withTimeout(fetchProfile(initialSession.user.id), 5000, { role: 'general' } as any)
        setProfile(p)
      } else {
        setProfile(null)
      }
      setLoading(false)

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: any, newSession: Session | null) => {
        setSession(newSession)
        setUser(newSession?.user ?? null)
        if (newSession?.user) {
          const p = await withTimeout(fetchProfile(newSession.user.id), 5000, { role: 'general' } as any)
          setProfile(p)
        } else {
          setProfile(null)
        }
        setLoading(false)
      })
      unsub = subscription
    })()
    return () => { try { unsub?.unsubscribe() } catch {} }
  }, [mounted])

  useEffect(() => {
    if (!mounted) return
    return
  }, [mounted])

  const signOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, refreshProfile, signOut, loginPhase, lastDeepLinkUrl, setLoginPhase, setLastDeepLinkUrl }}>
      {mounted ? children : null}
    </AuthContext.Provider>
  )
}
