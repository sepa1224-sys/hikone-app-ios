'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const [message, setMessage] = useState('アプリに戻っています...')

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const code = params.get('code')
      const accessToken = hash.get('access_token')
      const refreshToken = hash.get('refresh_token')
      ;(async () => {
        try {
          await supabase.auth.getSession()
        } catch {}
      })()
      let url = ''
      if (accessToken && refreshToken) {
        url = `com.regionalportal.app://auth-callback?access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}`
      } else if (code) {
        url = `com.regionalportal.app://auth-callback?code=${code}`
      }
      if (url) {
        window.location.href = url
      } else {
        setMessage('認可情報が見つかりませんでした')
      }
    } catch {
      setMessage('認可情報の取得に失敗しました')
    }
  }, [])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: 16 }}>
      {message}
    </div>
  )
}
