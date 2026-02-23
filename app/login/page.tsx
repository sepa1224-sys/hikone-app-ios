'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff, UserPlus, LogIn, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { Capacitor } from '@capacitor/core'
import { FirebaseAuthentication } from '@capacitor-firebase/authentication'
import '@/lib/firebase'

// Googleアイコン（SVG）
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
)

// LINEアイコン（SVG）
const LineIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path
      fill="#06C755"
      d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.019 9.614.39.086.923.264 1.058.608.12.308.079.791.037 1.096-.053.396-.242 1.487-.242 1.487s-.086.533.136.786c.219.253.868.203 1.156-.027 3.515-2.822 6.541-6.179 6.541-6.179 3.504-2.195 5.292-4.524 5.292-7.385"
    />
    <path
      fill="#fff"
      d="M16.92 11.23h-1.636a.434.434 0 01-.434-.434v-2.31c0-.239.195-.434.434-.434h.619c.239 0 .434.195.434.434v1.275h.583c.239 0 .434.195.434.434v.601a.434.434 0 01-.434.434zm-3.328 0h-2.17a.434.434 0 01-.434-.434v-2.31c0-.239.195-.434.434-.434h.619c.239 0 .434.195.434.434v1.876h1.117c.239 0 .434.195.434.434v.601a.434.434 0 01-.434.434zm-3.864 0h-1.077a.434.434 0 01-.434-.434v-2.31c0-.239.195-.434.434-.434h.619c.239 0 .434.195.434.434v2.31c0 .239.195 .434 .434 .434h.458c.239 0 .434.195.434.434v-.002zm-3.842-1.033l1.176-1.602c.039-.053.059-.117.059-.181v-.383a.434.434 0 00-.434-.434h-1.636a.434.434 0 00-.434.434v2.31c0 .239.195 .434 .434 .434h.619a.434.434 0 00.434-.434v-1.189h.016l-1.176 1.602a.31.31 0 00-.059.181v.383c0 .239.195 .434 .434 .434h1.636a.434.434 0 00.434-.434v-2.31a.434.434 0 00-.434-.434h-.619a.434.434 0 00-.434.434v1.189h-.016z"
    />
  </svg>
)


export default function LoginPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // AuthProvider から認証状態を取得
  const { session, loading: authLoading, loginPhase, lastDeepLinkUrl, setLoginPhase } = useAuth()
  if (!mounted) return null
  
  const [isLogin, setIsLogin] = useState(true) // true: ログイン, false: 新規登録
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [lineLoading, setLineLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null)
  const [forceEnabled, setForceEnabled] = useState(false)
  const isWeb = !Capacitor.isNativePlatform()
  const hasUser = !!session?.user || !!firebaseUid
  
  
  
  
  
  // 既にログイン済みの場合はプロフィールページへリダイレクト
  

  // メール/パスワードでのログイン 登録
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        setSuccess('ログインしました')
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSuccess('登録用メールを送信しました')
      }
      try {
        router.push('/profile')
      } catch {}
    } catch (err: any) {
      setError(err?.message || '認証に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // Googleでサインイン（ネイティブの小窓→IDトークン→Supabase）
  const handleGoogleSignIn = async (e: React.MouseEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setGoogleLoading(true)
    try {
      if (isWeb) {
        const redirectTo = `${location.origin}/auth/callback`
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo }
        })
        if (error) throw error
        if (data?.url) {
          window.location.href = data.url
        }
      } else {
        const res = await FirebaseAuthentication.signInWithGoogle()
        const tokenRes = await FirebaseAuthentication.getIdToken({ forceRefresh: true })
        const token = (tokenRes as any)?.token || (tokenRes as any)?.idToken
        setFirebaseUid((res as any)?.user?.uid || null)
        if (!token) throw new Error('IDトークンの取得に失敗しました')
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token
        })
        if (error) throw error
        setSuccess('ログインしました')
        try {
          router.push('/profile')
        } catch {}
      }
    } catch (err: any) {
      setError(err?.message || 'Google認証に失敗しました')
    } finally {
      setGoogleLoading(false)
    }
  }

  // DeepLink結果の処理は AppUrlListener に委譲

  // LINEでサインイン（Supabase OAuth）
  const handleLineSignIn = async (e: React.MouseEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLineLoading(true)
    try {
      const redirectTo = isWeb ? `${location.origin}/auth/callback` : 'com.regionalportal.app://auth-callback'
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'line' as any,
        options: { redirectTo }
      })
      if (error) throw error
      if (data?.url) {
        window.location.href = data.url
      }
    } catch (err: any) {
      setError(err?.message || 'LINE認証に失敗しました')
    } finally {
      setLineLoading(false)
    }
  }
  
  

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex flex-col">
      {forceEnabled && (
        <div className="p-4">
          <button
            onClick={() => {
              console.log('🔐 [Login] Firebase UID:', firebaseUid)
              try {
                router.push('/home')
              } catch {
                try { router.push('/') } catch {}
              }
            }}
            className="w-full py-3 bg-yellow-100 text-yellow-800 font-bold rounded-xl border border-yellow-300 hover:bg-yellow-200 transition"
          >
            【開発用】ネイティブアプリ画面へ強制移動
          </button>
        </div>
      )}
      {/* ヘッダー */}
      <div className="p-4">
        <Link href="/" prefetch={false} className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
          <span className="text-sm font-bold">ホームに戻る</span>
        </Link>
      </div>
      {isWeb && (
        <div
          style={{
            background: '#007bff',
            color: 'white',
            padding: 20,
            textAlign: 'center',
            fontWeight: 'bold',
            cursor: 'pointer',
            border: '3px solid yellow',
          }}
          onClick={() => {
            try { (window as any).location.href = 'hikoneapp://home' } catch {}
          }}
        >
          【ここをタップしてアプリに戻る】
        </div>
      )}

      {/* メインコンテンツ */}
      <div className="flex-1 flex items-center justify-center px-6 pb-20">
        <div className="w-full max-w-sm">
          {/* ロゴ タイトル */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-lg">
              <span className="text-3xl">🏯</span>
            </div>
            <h1 className="text-2xl font-black text-gray-800">彦根くらしアプリ</h1>
            <p className="text-sm text-gray-500 mt-1">
              {isLogin ? 'アカウントにログイン' : '新規アカウント作成'}
            </p>
          </div>

          {/* LINEでサインインボタン */}
          <button
            onClick={handleLineSignIn}
            disabled={lineLoading}
            className="w-full py-4 bg-[#06C755] text-white font-bold rounded-2xl shadow-sm flex items-center justify-center gap-3 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 mb-4"
          >
            {lineLoading ? (
              '接続中...'
            ) : (
              <>
                <LineIcon />
                LINEでログイン
              </>
            )}
          </button>

          {/* Googleでサインインボタン */}
          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full py-4 bg-white border border-gray-200 text-gray-700 font-bold rounded-2xl shadow-sm flex items-center justify-center gap-3 hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-60 mb-6"
          >
            {googleLoading ? (
              '接続中...'
            ) : (
              <>
                <GoogleIcon />
                Googleでサインイン
              </>
            )}
          </button>
          
          {/* リアルタイム進行状況モニター */}
          <div className="mb-6">
            <div className="text-red-600 font-black text-xl text-center">
              {loginPhase || 'PHASE 0: Idle'}
            </div>
            {lastDeepLinkUrl && (
              <div className="mt-2 text-xs font-mono break-all text-gray-600">
                {lastDeepLinkUrl}
              </div>
            )}
          </div>

          {/* 区切り線 */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="text-xs text-gray-400 font-medium">または</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          {/* フォーム */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* メールアドレス */}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                placeholder="メールアドレス"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
              />
            </div>

            {/* パスワード */}
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="パスワード"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-12 pr-12 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* エラーメッセージ */}
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl text-center">
                {error}
              </div>
            )}

            {/* 成功メッセージ */}
            {success && (
              <div className="p-3 bg-green-50 text-green-600 text-xs font-bold rounded-xl text-center">
                {success}
              </div>
            )}

            {/* 送信ボタン */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-red-500 to-orange-500 text-white font-black rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {loading ? (
                '処理中...'
              ) : isLogin ? (
                <>
                  <LogIn size={18} /> メールでログイン
                </>
              ) : (
                <>
                  <UserPlus size={18} /> メールで新規登録
                </>
              )}
            </button>
          </form>

          {/* 切り替えリンク */}
          <div className="text-center mt-6">
            <button
              onClick={() => {
                setIsLogin(!isLogin)
                setError('')
                setSuccess('')
              }}
              className="text-sm font-bold text-gray-500 hover:text-red-500 transition-colors"
            >
              {isLogin ? 'アカウントをお持ちでない方はこちら' : 'すでにアカウントをお持ちの方はこちら'}
            </button>
          </div>

          {/* ゲストとして続ける */}
          <div className="text-center mt-4">
            <Link
              href="/"
              className="text-xs font-medium text-gray-400 hover:text-gray-600 underline"
            >
              ログインせずに使う（一部機能制限あり）
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
