'use client'
import { supabase } from '@/lib/supabase'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
 
 export default function AppUrlListener() {
 const router = useRouter()
 useEffect(() => {
   let mounted = true
   try {
     try { console.log('Initial URL:', typeof window !== 'undefined' ? window.location.href : '') } catch {}
     const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
     const hash = new URLSearchParams(typeof window !== 'undefined' ? (window.location.hash || '').replace(/^#/, '') : '')
     const code = params.get('code')
     const accessToken = hash.get('access_token')
     const refreshToken = hash.get('refresh_token')
    if (!code && !accessToken) {
      return () => { mounted = false }
    }
     ;(async () => {
       if (code) {
         const { data, error } = await (supabase.auth.exchangeCodeForSession(code) as any)
         if (!error) {
           try { const cap: any = (globalThis as any).Capacitor; const browser = cap?.Browser; if (browser?.close) await browser.close() } catch {}
           try { window.localStorage.setItem('sb-auth-token', JSON.stringify(data?.session)) } catch {}
           if (mounted) { try { router.push('/profile') } catch {} }
         } else {
           try { console.log('Auth Error:', error.message) } catch {}
         }
       } else if (accessToken) {
         const { data, error } = await (supabase.auth.setSession({ access_token: accessToken!, refresh_token: (refreshToken || '')! }) as any)
         if (!error) {
           try { const cap: any = (globalThis as any).Capacitor; const browser = cap?.Browser; if (browser?.close) await browser.close() } catch {}
           try { window.localStorage.setItem('sb-auth-token', JSON.stringify(data?.session)) } catch {}
           if (mounted) { try { router.push('/profile') } catch {} }
         } else {
           try { console.log('Auth Error:', error.message) } catch {}
         }
       }
     })()
   } catch {}
   return () => { mounted = false }
 }, [])
 return null
 }

let __appUrlListenerInitialized = false
try {
  const cap: any = (globalThis as any).Capacitor
  const appPlugin = cap?.Plugins?.App || cap?.App
  if (appPlugin?.addListener && !__appUrlListenerInitialized) {
    __appUrlListenerInitialized = true
    let handled = false
    appPlugin.addListener('appUrlOpen', async (data: any) => {
      try { console.log('DeepLink Received:', data?.url || '') } catch {}
      const raw = typeof data?.url === 'string' ? data.url : ''
      if (!raw) return
      ;(globalThis as any).__sb_auth_lock = true
      let code: string | null = null
      let accessToken: string | null = null
      let refreshToken: string | null = null
      let idToken: string | null = null
      try {
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
        } else if (raw.startsWith('com.googleusercontent.apps')) {
          const normalized = raw.replace(/^com\.googleusercontent\.apps[^:]*:/, 'http://dummy')
          const u = new URL(normalized)
          const hash = new URLSearchParams((u.hash || '').replace(/^#/, ''))
          idToken = hash.get('id_token')
          accessToken = hash.get('access_token')
        } else if (raw.startsWith('capacitor://')) {
          const u = new URL(raw.replace('capacitor://localhost', 'http://localhost'))
          code = u.searchParams.get('code')
          accessToken = u.searchParams.get('access_token')
          refreshToken = u.searchParams.get('refresh_token')
        } else if (raw.startsWith('http://') || raw.startsWith('https://')) {
          const u = new URL(raw)
          code = u.searchParams.get('code')
          accessToken = u.searchParams.get('access_token')
          refreshToken = u.searchParams.get('refresh_token')
          const hash = new URLSearchParams((u.hash || '').replace(/^#/, ''))
          idToken = idToken || hash.get('id_token')
          accessToken = accessToken || hash.get('access_token')
        }
      } catch {}

      if (handled) return
      if (!code && !accessToken && !idToken) {
        ;(globalThis as any).__sb_auth_lock = false
        return
      }
      if (code) {
        handled = true
        try {
          const { data, error } = await (supabase.auth.exchangeCodeForSession(code) as any)
          if (error) {
            try { console.log('Auth Error:', error.message) } catch {}
          } else {
            try { const cap: any = (globalThis as any).Capacitor; const browser = cap?.Browser; if (browser?.close) await browser.close() } catch {}
            try { console.log('📦 受け取ったセッション:', JSON.stringify(data?.session)) } catch {}
            try { window.localStorage.setItem('sb-auth-token', JSON.stringify(data?.session)) } catch {}
          }
        } catch (e: any) {
          try { console.log('Auth Error:', e?.message || 'Unknown') } catch {}
        }
        ;(globalThis as any).__sb_auth_lock = false
        return
      }
      if (accessToken) {
        handled = true
        try {
          const { data, error } = await supabase.auth.setSession({ access_token: accessToken!, refresh_token: (refreshToken || '')! }) as any
          if (error) {
            try { console.log('Auth Error:', error.message) } catch {}
          } else {
            try { const cap: any = (globalThis as any).Capacitor; const browser = cap?.Browser; if (browser?.close) await browser.close() } catch {}
            try { window.localStorage.setItem('sb-auth-token', JSON.stringify(data?.session)) } catch {}
          }
        } catch (e: any) {
          try { console.log('Auth Error:', e?.message || 'Unknown') } catch {}
        }
        ;(globalThis as any).__sb_auth_lock = false
        return
      }
      if (idToken) {
        handled = true
        try {
          const { data, error } = await (supabase.auth.signInWithIdToken({
            provider: 'google',
            token: idToken!
          }) as any)
          if (error) {
            try { console.log('Auth Error:', error.message) } catch {}
          } else {
            try { const cap: any = (globalThis as any).Capacitor; const browser = cap?.Browser; if (browser?.close) await browser.close() } catch {}
            try { window.localStorage.setItem('sb-auth-token', JSON.stringify(data?.session)) } catch {}
          }
        } catch (e: any) {
          try { console.log('Auth Error:', e?.message || 'Unknown') } catch {}
        }
        ;(globalThis as any).__sb_auth_lock = false
        return
      }
      ;(globalThis as any).__sb_auth_lock = false
    })
  }
} catch {}
