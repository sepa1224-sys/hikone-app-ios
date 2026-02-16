'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import imageCompression from 'browser-image-compression'
import { useRouter } from 'next/navigation'
import { User, MapPin, LogOut, Edit, Mail, Calendar, UserCircle, Heart, Cake, MessageSquare, ChevronRight, Gift, Copy, Check, Share2, ExternalLink, Ticket, Loader2, Send, Users, UserPlus, X, Trash2, Coins, ArrowRight, Sparkles, Search, QrCode, Settings, History, Camera, Home, School, GraduationCap, Layout } from 'lucide-react'
import ProfileRegistrationModal from '@/components/ProfileRegistrationModal'
import BottomNavigation from '@/components/BottomNavigation'
import { usePoints, usePointHistory, getPointHistoryStyle, PointHistory } from '@/lib/hooks/usePoints'
import { applyReferralCode } from '@/lib/actions/referral'
import { useFriends, addFriend, removeFriend, searchUserByCode, Friend } from '@/lib/hooks/useFriends'
import { sendHikopo } from '@/lib/actions/transfer'
import { getUniversityStats, UniversityStats } from '@/lib/actions/stats'
import QRCode from 'react-qr-code'
import { formatFullLocation, formatShortLocation } from '@/lib/constants/shigaRegions'
import { ProfileSkeleton } from '@/components/Skeleton'
import { useAuth } from '@/components/AuthProvider'
import QRScanner from '@/components/QRScanner'

export default function ProfilePage() {
  const router = useRouter()
  
  // AuthProvider から認証状態を取得
  const { session, user: authUser, profile: authProfile, loading: authLoading, signOut } = useAuth()
  
  // デバッグ用アップロード機能
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleMissionPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!authUser) {
      alert('ユーザー情報が取得できません')
      return
    }

    try {
      setIsUploading(true)
      
      // 画像圧縮
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1200,
        useWebWorker: true
      }
      const compressedFile = await imageCompression(file, options)

      // ファイル名: ユーザーID/タイムスタンプ.jpg
      const fileName = `${authUser.id}/${Date.now()}.jpg`

      // Upload to mission-photos bucket
      const { error } = await supabase.storage
        .from('mission-photos')
        .upload(fileName, compressedFile)

      if (error) throw error

      alert('Storageへの保存に成功しました！')

    } catch (error: any) {
      console.error('Upload error:', error)
      // 詳細なエラー表示
      alert('詳細エラー: ' + JSON.stringify(error))
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }
  
  // マウント済みフラグ（ハイドレーションエラー防止）
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  
  // QRスキャナー用のステート
  const [showScanner, setShowScanner] = useState(false)
  
  // profile を取得または authProfile を使用
  useEffect(() => {
    if (authProfile) {
      setProfile(authProfile)
    }
  }, [authProfile])
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [generatingCode, setGeneratingCode] = useState(false)
  
  // 招待コード入力用のステート
  const [inputReferralCode, setInputReferralCode] = useState('')
  const [applyingCode, setApplyingCode] = useState(false)
  const [applyResult, setApplyResult] = useState<{ success: boolean; message: string } | null>(null)
  
  // SWRでポイント情報を取得（authUserを使用）
  const { points, referralCode: swrReferralCode, isLoading: pointsLoading, refetch: refetchPoints } = usePoints(authUser?.id ?? null)
  const { history: pointHistory, isLoading: historyLoading, refetch: refetchHistory } = usePointHistory(authUser?.id ?? null)
  
  // referralCode は SWR または profile から取得（どちらかが取得できれば表示）
  const referralCode = swrReferralCode || profile?.referral_code || null
  
  // デバッグログ
  useEffect(() => {
    console.log('🎫 [Profile] referralCode 状態:', {
      swrReferralCode,
      profileReferralCode: profile?.referral_code,
      finalReferralCode: referralCode,
      pointsLoading,
      authUserId: authUser?.id
    })
  }, [swrReferralCode, profile?.referral_code, referralCode, pointsLoading, authUser?.id])

  // ポイント表示のデバッグログ
  useEffect(() => {
    console.log('💰 [Profile] ポイント表示状態:', {
      pointsFromSWR: points,
      pointsFromProfile: profile?.points,
      pointsLoading,
      authUserId: authUser?.id,
      profileData: profile ? {
        id: profile.id,
        points: profile.points,
        pointsType: typeof profile.points
      } : null
    })
  }, [points, profile?.points, pointsLoading, authUser?.id, profile])
  
  // ポイント履歴の直接取得処理（プロフィール取得と同時に実行）
  useEffect(() => {
    const fetchHistoryDirectly = async () => {
      if (!authUser?.id) {
        console.log('📜 [HistoryFetch] ユーザーIDがないためスキップ')
        return
      }
      
      console.log('📜 [HistoryFetch] 取得開始')
      console.log('📜 [HistoryFetch] ユーザーID:', authUser.id)
      
      try {
        console.log('📜 [HistoryFetch] ユーザーID型確認:', {
          authUserId: authUser.id,
          authUserIdType: typeof authUser.id,
          authUserIdLength: authUser.id?.length,
          isString: typeof authUser.id === 'string'
        })
        
        const { data, error } = await supabase
          .from('point_history')
          .select('*')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false })
          .limit(10) // テスト用に10件まで取得
        
        console.log('📜 [HistoryFetch] 結果:', data, 'エラー:', error)
        
        if (error) {
          console.error('📜 [HistoryFetch] エラー詳細:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          })
        } else {
          console.log('📜 [HistoryFetch] 取得成功:', data?.length || 0, '件')
          if (data && data.length > 0) {
            console.log('📜 [HistoryFetch] 履歴サンプル:', data.slice(0, 3))
            // ユーザーIDの一致確認
            data.forEach((item, index) => {
              console.log(`📜 [HistoryFetch] 履歴[${index}] user_id:`, item.user_id, '型:', typeof item.user_id)
              console.log(`📜 [HistoryFetch] 履歴[${index}] user_id一致:`, item.user_id === authUser.id)
            })
          } else {
            console.log('📜 [HistoryFetch] 履歴が0件です（ユーザーID:', authUser.id, '）')
          }
        }
      } catch (err) {
        console.error('📜 [HistoryFetch] 例外エラー:', err)
      }
    }
    
    // 認証状態が確定してから実行
    if (!authLoading && authUser?.id) {
      fetchHistoryDirectly()
    }
  }, [authUser?.id, authLoading]) // user.idを依存配列に追加
  
  // ポイント履歴のデバッグログ
  useEffect(() => {
    console.log('📊 [Profile] ポイント履歴状態:', {
      historyCount: pointHistory.length,
      historyLoading,
      authUserId: authUser?.id,
      historyData: pointHistory.slice(0, 3).map(item => ({
        id: item.id,
        amount: item.amount,
        type: item.type,
        activity_type: (item as any).activity_type,
        description: item.description,
        created_at: item.created_at
      }))
    })
  }, [pointHistory, historyLoading, authUser?.id])
  
  // ページフォーカス時に履歴を再取得
  useEffect(() => {
    const handleFocus = () => {
      if (authUser?.id && !historyLoading) {
        console.log('📊 [Profile] ページフォーカス: 履歴を再取得')
        refetchHistory()
      }
    }
    
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [authUser?.id, historyLoading, refetchHistory])
  
  // プロフィール画面マウント時に強制的に履歴を再取得
  useEffect(() => {
    if (authUser?.id && !historyLoading) {
      console.log('📊 [Profile] マウント時: 履歴を強制再取得')
      // 少し遅延させてから再取得（SWRの初期化を待つ）
      setTimeout(() => {
        refetchHistory()
      }, 500)
    }
  }, [authUser?.id]) // マウント時とauthUser.idが変わった時のみ実行
  
  // フレンドリスト
  const { friends, isLoading: friendsLoading, addFriendToList, removeFriendFromList, refetch: refetchFriends } = useFriends(authUser?.id ?? null)
  
  // フレンド追加用のステート
  const [showAddFriendModal, setShowAddFriendModal] = useState(false)
  const [friendSearchCode, setFriendSearchCode] = useState('')
  const [friendSearchResult, setFriendSearchResult] = useState<{
    found: boolean
    userId?: string
    name?: string
    avatarUrl?: string
  } | null>(null)
  const [searchingFriend, setSearchingFriend] = useState(false)
  const [addingFriend, setAddingFriend] = useState(false)
  const [addFriendResult, setAddFriendResult] = useState<{ success: boolean; message: string } | null>(null)
  
  // クイック送金モーダル用のステート
  const [showQuickSendModal, setShowQuickSendModal] = useState(false)
  const [quickSendTarget, setQuickSendTarget] = useState<Friend | null>(null)
  const [quickSendAmount, setQuickSendAmount] = useState('')
  const [quickSending, setQuickSending] = useState(false)
  const [quickSendResult, setQuickSendResult] = useState<{ success: boolean; message: string } | null>(null)

  // 大学統計モーダル用のステート
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [universityStats, setUniversityStats] = useState<UniversityStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  // 大学統計を取得して表示
  const handleShowUniversityStats = async () => {
    console.log('👆 [Profile] 大学統計クリック: 処理開始')
    
    // 強制的にモーダルを表示（デバッグ用）
    setShowStatsModal(true)
    console.log('👆 [Profile] モーダル表示フラグを設定: true')

    if (!profile?.university_name) {
      console.log('👆 [Profile] 大学名がありません')
      return
    }

    setLoadingStats(true)
    console.log('👆 [Profile] 統計データ取得開始:', profile.university_name)
    
    try {
      const result = await getUniversityStats(profile.university_name)
      console.log('👆 [Profile] 統計データ取得完了:', result)
      
      if (result.success && result.data) {
        setUniversityStats(result.data)
      } else {
        console.error('Stats fetch error:', result.error)
      }
    } catch (err) {
      console.error('Stats fetch error:', err)
    } finally {
      setLoadingStats(false)
    }
  }

  // AuthProvider の状態が確定したらプロフィールを取得
  useEffect(() => {
    // AuthProvider がまだローディング中なら何もしない
    if (authLoading) return
    
    // セッションがない場合はログインページへ
    if (!session || !authUser) {
      router.push('/login')
      return
    }

    // すでにコンテキストにプロフィールがある場合はそれを使用
    if (authProfile) {
      setProfile(authProfile)
      return
    }
    
    // コンテキストにない場合のみ取得
    const abortController = new AbortController()
    fetchProfileData(abortController.signal)
    
    return () => {
      abortController.abort()
    }
  }, [authLoading, session, authUser, authProfile])

  // 生年月日を読みやすい形式に整形する関数
  const formatBirthday = (birthday: string | null | undefined): string => {
    if (!birthday) return ''
    try {
      const date = new Date(birthday)
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const day = date.getDate()
      return `${year}年${month}月${day}日`
    } catch {
      return birthday
    }
  }

  // 居住地を組み合わせて表示する関数（新フォーマット対応）
  const formatLocationDisplay = (
    location: string | null | undefined, 
    region: string | null | undefined,
    city: string | null | undefined,
    detailArea: string | null | undefined
  ): string => {
    // 新しいフォーマット関数を使用
    return formatFullLocation(
      location || null,
      region || null,
      city || null,
      detailArea || null
    )
  }
  
  // 短縮版（市区町村 + 詳細エリア）
  const formatShortLocationDisplay = (
    city: string | null | undefined,
    detailArea: string | null | undefined
  ): string => {
    return formatShortLocation(city || null, detailArea || null)
  }

  // プロフィールデータの取得
  const fetchProfileData = async (abortSignal?: AbortSignal) => {
    try {
      setLoading(true)
      
      // AuthProvider から取得した authUser を使用
      console.log('📋 [Profile] fetchProfileData: 現在のユーザー:', authUser ? {
        userId: authUser.id,
        email: authUser.email,
      } : 'なし')
      
      if (!authUser) {
        console.log('📋 [Profile] ユーザーがないためスキップ')
        setLoading(false)
        return
      }

      // AbortSignalがキャンセルされている場合は処理を中断
      if (abortSignal?.aborted) {
        console.log('📋 [Profile] リクエストがキャンセルされました')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*, is_student, school_name, is_official_student, grade')
        .eq('id', authUser.id)
        .single()

      // AbortSignalがキャンセルされている場合は処理を中断
      if (abortSignal?.aborted) {
        console.log('📋 [Profile] レスポンス取得後にキャンセルされました')
        return
      }

      if (data) {
        console.log('🎫 [Profile] プロフィール取得成功:', {
          id: data.id,
          referral_code: data.referral_code,
          points: data.points,
          pointsType: typeof data.points,
          pointsValue: data.points != null ? Number(data.points) : null,
          has_used_referral: data.has_used_referral
        })
        setProfile(data)
      } else {
        console.log('🎫 [Profile] プロフィールなし、デフォルト値を設定')
        // プロフィールがない場合でも、セッション情報を表示
        setProfile({
          id: authUser.id,
          full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'ユーザー',
          email: authUser.email,
          avatar_url: authUser.user_metadata?.avatar_url || null
        })
      }
      
      if (error) {
        console.error('🎫 [Profile] プロフィール取得エラー:', error)
        console.error('🎫 [Profile] エラーコード:', error.code)
        console.error('🎫 [Profile] エラーメッセージ:', error.message)
        
        // RLS権限エラーの場合の詳細ログ
        if (error.code === '42501' || error.message.includes('permission') || error.message.includes('policy')) {
          console.error('🎫 [Profile] ⚠️ RLS権限エラーの可能性があります')
          console.error('🎫 [Profile] 現在のユーザーID:', authUser.id)
          console.error('🎫 [Profile] RLSポリシーが正しく設定されているか確認してください')
        }
      }
    } catch (error: any) {
      // AbortErrorの場合は無視（コンポーネントのアンマウント時に発生する可能性がある）
      if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
        console.log('📋 [Profile] リクエストが中断されました（AbortError）')
        return
      }
      console.error('Profile fetch error:', error)
    } finally {
      // AbortSignalがキャンセルされていない場合のみローディング状態を解除
      if (!abortSignal?.aborted) {
        setLoading(false)
      }
    }
  }

  const handleLogout = async () => {
    if (confirm('ログアウトしますか？')) {
      console.log('📋 [Profile] ログアウト実行')
      await signOut() // AuthProvider の signOut を使用
      setProfile(null)
      router.refresh()
      router.push('/')
    }
  }

  // QRスキャン成功時の処理
  const handleScanSuccess = (code: string) => {
    setShowScanner(false)
    // 支払い画面へコードを渡して遷移
    router.push(`/pay?code=${code}`)
  }
  
  // 招待コードをコピー
  const handleCopyCode = async () => {
    if (referralCode) {
      try {
        await navigator.clipboard.writeText(referralCode)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('コピー失敗:', err)
      }
    }
  }
  
  // LINEでシェア
  const handleShareLine = () => {
    if (!referralCode) return
    const appUrl = 'https://hikone-portal.app'
    const message = `彦根のゴミ出しアプリを始めたよ！この招待コード【${referralCode}】を入力すると、500ヒコポがもらえるよ！ ${appUrl}`
    const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(message)}`
    window.open(lineUrl, '_blank')
  }
  
  // Xでシェア
  const handleShareX = () => {
    if (!referralCode) return
    const appUrl = 'https://hikone-portal.app'
    const message = `彦根のゴミ出しアプリを始めたよ！\n招待コード【${referralCode}】を入力すると500ヒコポもらえる！\n${appUrl}\n\n#彦根 #ひこにゃん #ゴミ出し`
    const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`
    window.open(xUrl, '_blank')
  }
  
  // ランダムな招待コードを生成（8桁英数字大文字）
  const generateRandomCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }
  
  // 招待コードを発行する
  const handleGenerateCode = async () => {
    if (!authUser?.id) return
    
    setGeneratingCode(true)
    try {
      // ランダムなコードを生成
      const newCode = generateRandomCode()
      console.log('🎫 新しい招待コードを生成:', newCode)
      
      // profiles テーブルに直接保存
      const { error } = await supabase
        .from('profiles')
        .update({ 
          referral_code: newCode,
          updated_at: new Date().toISOString() 
        })
        .eq('id', authUser.id)
      
      if (error) {
        console.error('コード発行エラー:', error)
        // 重複エラーの場合は再試行
        if (error.code === '23505') {
          alert('コードが重複しました。もう一度お試しください。')
        } else {
          alert('コードの発行に失敗しました')
        }
        return
      }
      
      console.log('✅ 招待コード発行成功:', newCode)
      
      // プロフィールとポイント情報を再取得
      await fetchProfileData()
      refetchPoints()
    } catch (err) {
      console.error('コード発行エラー:', err)
      alert('コードの発行に失敗しました')
    } finally {
      setGeneratingCode(false)
    }
  }
  
  // 日付をフォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${month}/${day} ${hours}:${minutes}`
  }
  
  // フレンド検索
  const handleSearchFriend = async () => {
    if (!friendSearchCode.trim()) return
    
    setSearchingFriend(true)
    setFriendSearchResult(null)
    setAddFriendResult(null)
    
    try {
      const result = await searchUserByCode(friendSearchCode.trim())
      setFriendSearchResult(result)
    } catch (err) {
      console.error('フレンド検索エラー:', err)
      setFriendSearchResult({ found: false })
    } finally {
      setSearchingFriend(false)
    }
  }
  
  // フレンド追加
  const handleAddFriend = async () => {
    if (!authUser?.id || !friendSearchCode.trim()) return
    
    setAddingFriend(true)
    setAddFriendResult(null)
    
    try {
      const result = await addFriend(authUser.id, friendSearchCode.trim())
      setAddFriendResult(result)
      
      if (result.success) {
        refetchFriends()
        setFriendSearchCode('')
        setFriendSearchResult(null)
        // 少し待ってからモーダルを閉じる
        setTimeout(() => {
          setShowAddFriendModal(false)
          setAddFriendResult(null)
        }, 1500)
      }
    } catch (err) {
      console.error('フレンド追加エラー:', err)
      setAddFriendResult({ success: false, message: '予期しないエラーが発生しました' })
    } finally {
      setAddingFriend(false)
    }
  }
  
  // フレンド削除
  const handleRemoveFriend = async (friendId: string) => {
    if (!authUser?.id) return
    if (!confirm('このフレンドを削除しますか？')) return
    
    try {
      const result = await removeFriend(authUser.id, friendId)
      if (result.success) {
        // 即座にローカルステートを更新
        removeFriendFromList(friendId)
      } else {
        alert(result.message)
      }
    } catch (err) {
      console.error('フレンド削除エラー:', err)
      alert('フレンドの削除に失敗しました')
    }
  }
  
  // クイック送金モーダルを開く
  const handleOpenQuickSend = (friend: Friend) => {
    setQuickSendTarget(friend)
    setQuickSendAmount('')
    setQuickSendResult(null)
    setShowQuickSendModal(true)
  }
  
  // クイック送金実行
  const handleQuickSend = async () => {
    if (!authUser?.id || !quickSendTarget?.referral_code || !quickSendAmount) return
    
    const amount = parseInt(quickSendAmount)
    if (isNaN(amount) || amount <= 0) {
      setQuickSendResult({ success: false, message: '💰 送金額を1ポイント以上で入力してください' })
      return
    }
    
    if (amount > points) {
      setQuickSendResult({ success: false, message: `😢 ヒコポが足りません！残高: ${points.toLocaleString()} pt` })
      return
    }
    
    setQuickSending(true)
    setQuickSendResult(null)
    
    try {
      const result = await sendHikopo(authUser.id, quickSendTarget.referral_code, amount)
      setQuickSendResult(result)
      
      if (result.success) {
        refetchPoints()
        refetchHistory()
        setQuickSendAmount('')
        // 少し待ってからモーダルを閉じる
        setTimeout(() => {
          setShowQuickSendModal(false)
          setQuickSendTarget(null)
          setQuickSendResult(null)
        }, 1500)
      }
    } catch (err) {
      console.error('クイック送金エラー:', err)
      setQuickSendResult({ success: false, message: '予期しないエラーが発生しました' })
    } finally {
      setQuickSending(false)
    }
  }
  
  // 招待コードを適用
  const handleApplyReferralCode = async () => {
    if (!authUser?.id) {
      alert('ログインが必要です')
      return
    }
    
    if (!inputReferralCode.trim()) {
      alert('招待コードを入力してください')
      return
    }
    
    setApplyingCode(true)
    setApplyResult(null)
    
    try {
      console.log('🎫 [Profile] 招待コード適用開始:', inputReferralCode.trim())
      const result = await applyReferralCode(authUser.id, inputReferralCode.trim())
      console.log('🎫 [Profile] 招待コード適用結果:', result)
      setApplyResult(result)
      
      if (result.success) {
        alert('🎉 招待コードを適用しました！500ポイントを獲得しました。')
        // 成功時：プロフィール、ポイント、履歴を再取得
        await fetchProfileData()
        refetchPoints()
        refetchHistory()
        setInputReferralCode('')
      } else {
        alert(`❌ エラー: ${result.message}`)
      }
    } catch (error) {
      console.error('招待コード適用エラー:', error)
      alert('⚠️ 予期しないエラーが発生しました。通信状況を確認してください。')
      setApplyResult({ success: false, message: '予期しないエラーが発生しました' })
    } finally {
      setApplyingCode(false)
    }
  }

  // AuthProvider がローディング中
  if (!isMounted || authLoading) {
    return <ProfileSkeleton />
  }
  
  // プロフィール取得中（セッションはあるがプロフィールデータがまだない場合）
  // ただし、無限ロードを防ぐため authLoading が false の場合は表示を許可する
  if (session && !profile && !authProfile) {
    // コンテキストにもプロフィールがなく、ローカルでも取得中の場合のみスケルトン
    // すでに取得試行が終わっている（authLoading=false）なら、空のプロフィールとして表示
    return <ProfileSkeleton />
  }
  
  // セッションがない場合（リダイレクト前の表示）
  if (!session) {
    return <ProfileSkeleton />
  }

  return (
    <div className="max-w-xl mx-auto p-6 pb-32 animate-in fade-in duration-500">
      <div className="space-y-6">
        {/* PayPay風のアクションボタンセクション */}
        <div className="grid grid-cols-1 gap-4">
          <button
            onClick={() => router.push('/pay')}
            className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-6 rounded-[2rem] font-black text-xl shadow-xl shadow-red-200/50 active:scale-95 transition-all flex flex-col items-center justify-center gap-2 border-b-4 border-red-800"
          >
            <div className="bg-white/20 p-3 rounded-full">
              <Camera size={32} />
            </div>
            <span>ひこポで払う（QR読み取り）</span>
          </button>

          <button
            onClick={() => router.push('/')}
            className="w-full bg-white hover:bg-gray-50 text-gray-700 font-bold py-4 rounded-[2rem] shadow-sm border border-gray-200 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Home size={20} />
            <span>ホームに戻る</span>
          </button>
        </div>

        {/* プロフィールヘッダー */}
        <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              {profile?.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt={profile.full_name || 'ユーザー'} 
                  className="w-20 h-20 rounded-full border-4 border-white/30 object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center border-4 border-white/30">
                  <UserCircle size={40} className="text-white" />
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-2xl font-black mb-1">
                  {profile?.full_name || 'ユーザー'}
                </h2>
                {/* 会員番号 */}
                {profile?.join_order && (
                  <p className="text-xs text-yellow-300 font-black mb-1 flex items-center gap-1">
                    <Ticket size={12} />
                    Member No. {String(profile.join_order).padStart(5, '0')}
                  </p>
                )}
                {profile?.email && (
                  <p className="text-sm text-white/80 font-bold flex items-center gap-1">
                    <Mail size={14} />
                    {profile.email}
                  </p>
                )}
              </div>
            </div>
            
            {/* ポイント表示 */}
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💰</span>
                  <span className="text-sm font-bold text-white/80">保有ポイント</span>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black">
                    {pointsLoading ? '...' : points.toLocaleString()}
                  </span>
                  <span className="text-sm font-bold ml-1">pt</span>
                </div>
              </div>
            </div>

            {/* 送金ボタン */}
            <div className="mt-4">
              <button
                onClick={() => router.push('/transfer')}
                className="w-full bg-white/20 hover:bg-white/30 text-white py-4 rounded-2xl font-black text-base backdrop-blur-md transition-all flex items-center justify-center gap-2 border border-white/30 active:scale-95"
              >
                <Send size={20} />
                <span>ひこポを送る（友達へ）</span>
              </button>
            </div>
            
            {/* ポイント交換 履歴ボタン */}
            <div className="mt-4 space-y-3">
              {/* ギフト券と交換するボタン */}
              <button
                onClick={() => router.push('/redeem')}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-blue-200/50 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <Gift size={24} />
                <span>ギフト券と交換する</span>
                <ArrowRight size={20} />
              </button>
              
              {/* 交換履歴 ギフト受取ボタン */}
              <button
                onClick={() => router.push('/redeem-history')}
                className="w-full bg-white/90 hover:bg-white text-gray-700 hover:text-gray-900 border-2 border-gray-200 hover:border-gray-300 py-4 rounded-2xl font-black text-base shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <History size={20} />
                <span>交換履歴 ギフト受取</span>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
        
        {/* 招待コードセクション */}
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-[2.5rem] p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Gift size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black">友達招待でポイントGET!</h3>
                <p className="text-xs text-white/80 font-bold">このコードで友達が登録すると500ptゲット！</p>
              </div>
            </div>
            
            {/* 招待コード表示 */}
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-4">
              <p className="text-xs text-white/70 font-bold mb-2 text-center">あなたの招待コード</p>
              
              {/* ローディング中でも referralCode があれば表示 */}
              {(pointsLoading && !referralCode) ? (
                <div className="flex items-center justify-center py-2">
                  <Loader2 size={24} className="animate-spin text-white/70" />
                </div>
              ) : referralCode ? (
                <>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-3xl font-black tracking-widest">
                      {referralCode}
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                      title="コードをコピー"
                    >
                      {copied ? (
                        <Check size={20} className="text-green-300" />
                      ) : (
                        <Copy size={20} className="text-white" />
                      )}
                    </button>
                  </div>
                  {copied && (
                    <p className="text-xs text-green-300 font-bold text-center mt-2 animate-pulse">
                      コピーしました！
                    </p>
                  )}
                </>
              ) : (
                <div className="text-center py-2">
                  <p className="text-white/70 text-sm font-bold mb-3">まだコードがありません</p>
                  <button
                    onClick={handleGenerateCode}
                    disabled={generatingCode}
                    className="bg-white hover:bg-gray-100 disabled:bg-white/50 text-purple-600 disabled:text-purple-400 px-6 py-2 rounded-xl font-black text-sm transition-all active:scale-95 disabled:active:scale-100 flex items-center justify-center gap-2 mx-auto"
                  >
                    {generatingCode ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        発行中...
                      </>
                    ) : (
                      <>
                        <Gift size={16} />
                        招待コードを発行する
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
            
            {/* QRコード表示（コードがある場合のみ） */}
            {referralCode && (
              <div className="bg-white rounded-2xl p-4 mb-4 shadow-inner">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <QrCode size={16} className="text-red-500" />
                  <p className="text-xs text-gray-600 font-black">このQRをスキャンしてヒコポを送る</p>
                </div>
                
                {/* QRコード with 赤いフレーム */}
                <div className="relative flex items-center justify-center">
                  {/* 赤いフレーム */}
                  <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg">
                    <div className="bg-white p-3 rounded-xl relative">
                      <QRCode
                        value={`hikopo:${referralCode}`}
                        size={160}
                        level="M"
                        fgColor="#1f2937"
                        bgColor="#ffffff"
                      />
                      {/* 中央のひこにゃんアイコン */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center border-2 border-red-500">
                          <span className="text-xl">⛑️</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <p className="text-[10px] text-gray-400 text-center mt-3 font-bold">
                  ヒコポ専用QRコード
                </p>
              </div>
            )}
            
            {/* シェアボタン（コードがある場合のみ表示） */}
            {referralCode && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleShareLine}
                  className="flex items-center justify-center gap-2 bg-[#06C755] hover:bg-[#05b34d] text-white py-3 rounded-xl font-black text-sm transition-colors shadow-lg active:scale-95"
                >
                  <ExternalLink size={16} />
                  LINEで送る
                </button>
                <button
                  onClick={handleShareX}
                  className="flex items-center justify-center gap-2 bg-black hover:bg-gray-800 text-white py-3 rounded-xl font-black text-sm transition-colors shadow-lg active:scale-95"
                >
                  <Share2 size={16} />
                  Xでシェア
                </button>
              </div>
            )}
            
            <p className="text-[10px] text-white/60 text-center mt-4">
              ※ 友達があなたのコードで登録すると、お互いに500ポイントもらえます
            </p>
          </div>
        </div>
        
        {/* 招待コード入力フォーム（未使用の場合のみ表示） */}
        {profile && !profile.has_used_referral && (
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2.5rem] p-6 text-white shadow-xl relative overflow-hidden z-30">
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/10 rounded-full" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Ticket size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black">招待コードを入力</h3>
                  <p className="text-xs text-white/80 font-bold">友達のコードを入れて500ptもらおう！</p>
                </div>
              </div>
              
              {/* 入力フォーム */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputReferralCode}
                    onChange={(e) => setInputReferralCode(e.target.value.toUpperCase())}
                    placeholder="招待コードを入力..."
                    maxLength={12}
                    className="flex-1 bg-white border-2 border-white/50 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 font-black text-center tracking-widest text-lg focus:outline-none focus:border-white focus:ring-2 focus:ring-white/30 transition-all"
                  />
                  <button
                    onClick={handleApplyReferralCode}
                    disabled={applyingCode || !inputReferralCode.trim()}
                    className="bg-white hover:bg-gray-100 disabled:bg-white/50 text-emerald-600 disabled:text-emerald-400 px-6 py-3 rounded-xl font-black text-sm transition-all active:scale-95 disabled:active:scale-100 flex items-center gap-2"
                  >
                    {applyingCode ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Check size={18} />
                    )}
                    適用
                  </button>
                </div>
                
                {/* 結果メッセージ */}
                {applyResult && (
                  <div className={`p-3 rounded-xl text-center font-bold text-sm ${
                    applyResult.success 
                      ? 'bg-green-400/30 text-green-100' 
                      : 'bg-red-400/30 text-red-100'
                  }`}>
                    {applyResult.message}
                  </div>
                )}
              </div>
              
              <p className="text-[10px] text-white/60 text-center mt-4">
                ※ 招待コードは一度だけ使用できます
              </p>
            </div>
          </div>
        )}

        {/* プロフィール情報カード */}
        <div className="bg-white rounded-[2.5rem] p-6 shadow-lg border border-gray-100 space-y-6">
          {/* 基本情報 */}
          <div className="space-y-4">
            <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
              <User size={20} className="text-orange-500" />
              基本情報
            </h3>
            
            <div className="space-y-4">
              {/* お名前 */}
              {profile?.full_name && (
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-sm font-bold text-gray-500 flex items-center gap-2">
                    <User size={16} className="text-orange-500" />
                    お名前
                  </span>
                  <span className="text-sm font-black text-gray-800">{profile.full_name}</span>
                </div>
              )}

              {/* 学校情報（学生の場合） */}
              {profile?.is_student && (
                <div 
                  className={`flex items-center justify-between py-3 border-b border-gray-100 ${profile.university_name ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''}`}
                  onClick={() => {
                    console.log('👆 [Profile] 学校行divをクリック')
                    if (profile.university_name) {
                      handleShowUniversityStats()
                    } else {
                      console.log('👆 [Profile] 大学名がないため反応しません')
                    }
                  }}
                >
                  <span className="text-sm font-bold text-gray-500 flex items-center gap-2">
                    <School size={16} className="text-orange-500" />
                    学校 学年
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-black text-gray-800">
                      {profile.university_name || profile.school_name || '未設定'} 
                      {profile.grade && ` ${profile.grade}`}
                    </span>
                    {profile.university_name && (
                      <ChevronRight size={14} className="text-gray-400" />
                    )}
                  </div>
                </div>
              )}

              {/* 性別 */}
              {profile?.gender && (
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-sm font-bold text-gray-500 flex items-center gap-2">
                    <UserCircle size={16} className="text-orange-500" />
                    性別
                  </span>
                  <span className="text-sm font-black text-gray-800">{profile.gender}</span>
                </div>
              )}

              {/* 生年月日 */}
              {profile?.birthday && (
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-sm font-bold text-gray-500 flex items-center gap-2">
                    <Cake size={16} className="text-orange-500" />
                    生年月日
                  </span>
                  <span className="text-sm font-black text-gray-800">{formatBirthday(profile.birthday)}</span>
                </div>
              )}

              {/* 居住地（統合表示）- prefecture または location を使用 */}
              {(profile?.prefecture || profile?.location || profile?.city) && (
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-sm font-bold text-gray-500 flex items-center gap-2">
                    <MapPin size={16} className="text-orange-500" />
                    居住地
                  </span>
                  <span className="text-sm font-black text-black text-right max-w-[200px]">
                    {formatLocationDisplay(
                      profile?.prefecture || profile?.location,
                      profile?.region,
                      profile?.city,
                      profile?.selected_area || profile?.detail_area
                    )}
                  </span>
                </div>
              )}
              
              {/* 興味関心 */}
              {profile?.interests && profile.interests.length > 0 && (
                <div className="py-3 border-b border-gray-100">
                  <span className="text-sm font-bold text-gray-500 block mb-3 flex items-center gap-2">
                    <Heart size={16} className="text-orange-500" />
                    興味関心
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((interest: string, index: number) => (
                      <span 
                        key={index}
                        className="bg-orange-100 text-orange-600 px-3 py-1.5 rounded-full text-xs font-black"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 編集ボタン */}
          <button
            onClick={() => {
              if (authUser) {
                setShowProfileModal(true)
              }
            }}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-[1.5rem] font-black shadow-xl shadow-orange-200 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <Edit size={20} />
            <span>プロフィールを編集</span>
          </button>
        </div>

        {/* ポイント履歴 */}
        <div className="bg-white rounded-[2.5rem] p-6 shadow-lg border border-gray-100">
          <h3 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-xl">📊</span>
            ポイント履歴
          </h3>
          
          {historyLoading ? (
            <div className="py-8 text-center">
              <div className="animate-spin text-2xl mb-2">🐱</div>
              <p className="text-sm text-gray-400 font-bold">読み込み中...</p>
            </div>
          ) : pointHistory.length === 0 ? (
            <div className="py-8 text-center">
              <span className="text-4xl opacity-30">📭</span>
              <p className="text-sm text-gray-400 font-bold mt-2">履歴はまだありません</p>
              <p className="text-xs text-gray-300 mt-1">チャレンジや招待でポイントを貯めよう！</p>
              <p className="text-[10px] text-gray-400 mt-2 font-bold">
                ユーザーID: {authUser?.id || '未取得'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {[...pointHistory]
                // created_atで降順ソート（最新が上）
                .sort((a, b) => {
                  const dateA = new Date(a.created_at).getTime()
                  const dateB = new Date(b.created_at).getTime()
                  return dateB - dateA // 降順
                })
                // activity_typeに関係なく全ての履歴を表示
                .map((item: PointHistory) => {
                  const style = getPointHistoryStyle(item.type)
                  // 日付をフォーマット（1月27日形式）
                  const formatHistoryDate = (dateString: string) => {
                    const date = new Date(dateString)
                    const month = date.getMonth() + 1
                    const day = date.getDate()
                    return `${month}月${day}日`
                  }
                  // アクティビティタイプに基づいて表示テキストとアイコンを決定
                  const activityType = (item as any).activity_type
                  let displayText = item.description
                  let displayIcon = style.icon
                  
                  if (activityType === 'running') {
                    displayText = 'ランニング'
                    displayIcon = '🏃‍♂️'
                  } else if (activityType === 'redemption') {
                    displayText = 'ポイント交換'
                    displayIcon = '🎁'
                  }
                  
                  // 走行距離の取得（ランニングの場合のみ）
                  const runningDistance = activityType === 'running' && (item as any).distance != null
                    ? Number((item as any).distance)
                    : null
                  
                  // ポイントの色：プラスは緑、マイナスは赤
                  const pointColor = item.amount >= 0
                    ? 'text-green-600'
                    : 'text-red-500'
                  
                  return (
                    <div 
                      key={item.id}
                      className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                    >
                      <div className={`w-12 h-12 ${style.bgColor} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                        <span className="text-xl">{displayIcon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-gray-800 truncate mb-1">{displayText}</p>
                        <p className="text-xs text-gray-500 font-bold">{formatHistoryDate(item.created_at)}</p>
                      </div>
                      <div className={`text-right flex-shrink-0 ${pointColor}`}>
                        {/* ランニングの場合は距離とポイントをセットで表示 */}
                        {runningDistance !== null ? (
                          <>
                            <p className="text-sm font-black mb-0.5">
                              {runningDistance.toFixed(2)}km
                            </p>
                            <p className="text-base font-black">
                              +{item.amount.toLocaleString()}
                            </p>
                            <p className="text-[10px] font-bold opacity-70">pt</p>
                          </>
                        ) : (
                          <>
                            <p className="text-base font-black">
                              {item.amount >= 0 ? '+' : ''}{item.amount.toLocaleString()}
                            </p>
                            <p className="text-[10px] font-bold opacity-70">pt</p>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
        
        {/* フレンドリスト（簡易表示 + リンク） */}
        <div className="bg-white rounded-[2.5rem] p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
              <Users size={20} className="text-indigo-500" />
              フレンド
            </h3>
            <button
              onClick={() => router.push('/friends')}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-600 rounded-lg font-bold text-xs transition-colors"
            >
              <UserPlus size={14} />
              管理
            </button>
          </div>
          
          {friendsLoading ? (
            <div className="py-4 text-center">
              <Loader2 size={24} className="animate-spin text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-400 font-bold">読み込み中...</p>
            </div>
          ) : friends.length === 0 ? (
            <div className="py-4 text-center">
              <span className="text-4xl opacity-30">👥</span>
              <p className="text-sm text-gray-400 font-bold mt-2">まだフレンドがいません</p>
              <button
                onClick={() => router.push('/friends')}
                className="mt-3 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold text-sm transition-colors"
              >
                フレンドを追加する
              </button>
            </div>
          ) : (
            <>
              {/* フレンドプレビュー（最大3人） */}
              <div className="space-y-2 mb-4">
                {friends.slice(0, 3).map((friend) => (
                  <div 
                    key={friend.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                  >
                    {/* アバター */}
                    {friend.avatar_url ? (
                      <img 
                        src={friend.avatar_url} 
                        alt="" 
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <UserCircle size={24} className="text-indigo-500" />
                      </div>
                    )}
                    
                    {/* 名前 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-gray-800 truncate">
                        {friend.full_name || friend.referral_code || 'ユーザー'}
                      </p>
                      {friend.full_name && friend.referral_code && (
                        <p className="text-[10px] text-gray-400 font-bold">{friend.referral_code}</p>
                      )}
                    </div>
                    
                    {/* 送金ボタン */}
                    <button
                      onClick={() => handleOpenQuickSend(friend)}
                      className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-600 rounded-lg transition-colors flex items-center gap-1 font-bold text-xs"
                      title="ひこポを送る"
                    >
                      <Send size={14} />
                      送る
                    </button>
                  </div>
                ))}
              </div>
              
              {/* すべて見るリンク */}
              <button
                onClick={() => router.push('/friends')}
                className="w-full py-3 bg-gray-50 hover:bg-indigo-50 text-indigo-600 rounded-xl font-black text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Users size={16} />
                フレンド一覧を見る（{friends.length}人）
                <ChevronRight size={16} />
              </button>
            </>
          )}
        </div>
        
        {/* メニューリンク */}
        <div className="bg-white rounded-[2.5rem] p-6 shadow-lg border border-gray-100">
          <h3 className="text-lg font-black text-gray-800 mb-4">メニュー</h3>
          
          <div className="space-y-3">
            {/* フレンド一覧 */}
            <button
              onClick={() => router.push('/friends')}
              className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-purple-50 rounded-2xl transition-colors group"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <Users size={20} className="text-purple-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-black text-gray-800">フレンド一覧</p>
                <p className="text-xs text-gray-500 font-bold">フレンドの追加 管理 送金</p>
              </div>
              <ChevronRight size={20} className="text-gray-400 group-hover:text-purple-500 transition-colors" />
            </button>
            
            {/* ひこポを送る */}
            <button
              onClick={() => router.push('/transfer')}
              className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-amber-50 rounded-2xl transition-colors group"
            >
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                <Send size={20} className="text-amber-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-black text-gray-800">ひこポを送る</p>
                <p className="text-xs text-gray-500 font-bold">友達にポイントをプレゼント</p>
              </div>
              <ChevronRight size={20} className="text-gray-400 group-hover:text-amber-500 transition-colors" />
            </button>
            
            {/* お問い合わせ 目安箱 */}
            <button
              onClick={() => router.push('/contact')}
              className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-blue-50 rounded-2xl transition-colors group"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <MessageSquare size={20} className="text-blue-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-black text-gray-800">お問い合わせ 目安箱</p>
                <p className="text-xs text-gray-500 font-bold">アプリや街へのご意見 ご提案</p>
              </div>
              <ChevronRight size={20} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
            </button>

            {/* 管理者ダッシュボード（is_adminがtrueの場合のみ表示） */}
            {profile?.is_admin === true && (
              <button
                onClick={() => router.push('/admin')}
                className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-indigo-50 rounded-2xl transition-colors group border-2 border-indigo-200"
              >
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                  <Settings size={20} className="text-indigo-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-black text-gray-800">管理者ダッシュボード</p>
                  <p className="text-xs text-gray-500 font-bold">システム設定と申請管理</p>
                </div>
                <ChevronRight size={20} className="text-gray-400 group-hover:text-indigo-500 transition-colors" />
              </button>
            )}

            {/* 大学掲示板（大学生の場合のみ表示） */}
            {profile?.user_type === '大学生' && profile?.university_name && (
              <button
                onClick={() => router.push('/board')}
                className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-green-50 rounded-2xl transition-colors group border-2 border-green-200"
              >
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <Layout size={20} className="text-green-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-black text-gray-800">{profile.university_name} 掲示板</p>
                  <p className="text-xs text-gray-500 font-bold">同じ大学の学生と交流しよう</p>
                </div>
                <ChevronRight size={20} className="text-gray-400 group-hover:text-green-500 transition-colors" />
              </button>
            )}
          </div>
        </div>

        {/* デバッグ用アップロード機能 */}
        <div className="bg-white rounded-[2.5rem] p-6 shadow-lg border border-gray-100 mb-6">
          <h3 className="text-lg font-black text-gray-800 mb-4">デバッグ: 写真アップロード</h3>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleMissionPhotoUpload}
            className="hidden"
            accept="image/*"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full py-3 bg-gray-800 text-white rounded-xl font-black flex items-center justify-center gap-2"
          >
            {isUploading ? <Loader2 className="animate-spin" /> : <Camera />}
            写真をアップロード
          </button>
        </div>

        {/* ログアウトボタン */}
        <div className="pt-4 pb-8">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-gray-400 font-bold text-sm hover:text-red-500 transition-colors py-3"
          >
            <LogOut size={18} />
            ログアウト
          </button>
        </div>
      </div>

      {/* 大学統計モーダル */}
      {showStatsModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowStatsModal(false)}
          />
          
          <div className="relative bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 z-[10001]">
            {/* ヘッダー */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                  <School size={20} className="text-orange-500" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-800">{profile?.university_name}</h3>
                  <p className="text-xs text-gray-500 font-bold">学生統計情報</p>
                </div>
              </div>
              <button
                onClick={() => setShowStatsModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            
            {loadingStats ? (
              <div className="py-8 text-center">
                <Loader2 size={32} className="animate-spin text-orange-500 mx-auto mb-3" />
                <p className="text-sm text-gray-400 font-bold">データを集計中...</p>
              </div>
            ) : universityStats ? (
              <div className="space-y-6">
                {/* 合計人数 */}
                <div className="text-center p-4 bg-orange-50 rounded-2xl">
                  <p className="text-sm text-gray-500 font-bold mb-1">登録学生数</p>
                  <p className="text-4xl font-black text-orange-600">
                    {universityStats.totalCount}
                    <span className="text-base text-gray-500 ml-1">人</span>
                  </p>
                </div>
                
                {/* 学年別内訳 */}
                <div>
                  <h4 className="text-sm font-black text-gray-700 mb-3 flex items-center gap-2">
                    <GraduationCap size={16} />
                    学年別内訳
                  </h4>
                  <div className="space-y-2">
                    {universityStats.gradeBreakdown.map((item) => (
                      <div key={item.grade} className="flex items-center gap-3">
                        <div className="w-16 text-xs font-bold text-gray-500">{item.grade}</div>
                        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-orange-400 rounded-full"
                            style={{ 
                              width: `${(item.count / universityStats.totalCount) * 100}%` 
                            }}
                          />
                        </div>
                        <div className="w-10 text-right text-sm font-black text-gray-800">
                          {item.count}人
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 font-bold">
                データが見つかりませんでした
              </div>
            )}
            
            <button
              onClick={() => setShowStatsModal(false)}
              className="w-full mt-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-black transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* プロフィール編集モーダル */}
      {showProfileModal && authUser && (
        <ProfileRegistrationModal
          userId={authUser.id}
          userEmail={authUser.email}
          userFullName={authUser.user_metadata?.full_name || authUser.user_metadata?.name || profile?.full_name}
          onComplete={async () => {
            setShowProfileModal(false)
            // 最新のプロフィールデータを再取得（キャッシュクリア）
            console.log('📋 [Profile] モーダル閉じ後、最新データを再取得')
            await fetchProfileData()
            // ポイント情報も再取得
            refetchPoints()
          }}
        />
      )}
      
      {/* フレンド追加モーダル */}
      {showAddFriendModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAddFriendModal(false)}
          />
          
          <div className="relative bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            {/* ヘッダー */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <UserPlus size={20} className="text-indigo-500" />
                </div>
                <h3 className="text-lg font-black text-gray-800">フレンド追加</h3>
              </div>
              <button
                onClick={() => setShowAddFriendModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            
            {/* 検索フォーム */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-black text-gray-700 mb-2 block">招待コードで検索</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={friendSearchCode}
                    onChange={(e) => setFriendSearchCode(e.target.value.toUpperCase())}
                    placeholder="招待コードを入力"
                    maxLength={12}
                    className="flex-1 bg-white border-2 border-gray-200 rounded-xl px-4 py-3 font-black text-center tracking-widest text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all"
                  />
                  <button
                    onClick={handleSearchFriend}
                    disabled={searchingFriend || !friendSearchCode.trim()}
                    className="px-4 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 text-white rounded-xl font-black transition-colors"
                  >
                    {searchingFriend ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <Search size={20} />
                    )}
                  </button>
                </div>
              </div>
              
              {/* 検索結果 */}
              {friendSearchResult && (
                <div className={`p-4 rounded-xl ${
                  friendSearchResult.found 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  {friendSearchResult.found ? (
                    <div className="flex items-center gap-3">
                      {friendSearchResult.avatarUrl ? (
                        <img 
                          src={friendSearchResult.avatarUrl} 
                          alt="" 
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center">
                          <UserCircle size={28} className="text-green-600" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-black text-green-700">{friendSearchResult.name}</p>
                        <p className="text-xs text-green-500 font-bold">ユーザーが見つかりました</p>
                      </div>
                      <Check size={20} className="text-green-500" />
                    </div>
                  ) : (
                    <p className="text-sm font-black text-red-600 text-center">
                      このコードのユーザーが見つかりません
                    </p>
                  )}
                </div>
              )}
              
              {/* 結果メッセージ */}
              {addFriendResult && (
                <div className={`p-3 rounded-xl text-center ${
                  addFriendResult.success 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <p className={`text-sm font-black ${
                    addFriendResult.success ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {addFriendResult.message}
                  </p>
                </div>
              )}
              
              {/* 追加ボタン */}
              <button
                onClick={handleAddFriend}
                disabled={addingFriend || !friendSearchResult?.found}
                className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 text-white rounded-2xl font-black transition-all active:scale-95 disabled:active:scale-100 flex items-center justify-center gap-2"
              >
                {addingFriend ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    追加中...
                  </>
                ) : (
                  <>
                    <UserPlus size={20} />
                    フレンドに追加
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* クイック送金モーダル */}
      {showQuickSendModal && quickSendTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowQuickSendModal(false)}
          />
          
          <div className="relative bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            {/* ヘッダー */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles size={32} className="text-amber-500" />
              </div>
              <h3 className="text-xl font-black text-gray-800 mb-1">ひこポを送る</h3>
              <p className="text-sm text-gray-500 font-bold">
                残高: <span className="text-amber-600">{points.toLocaleString()}</span> pt
              </p>
            </div>
            
            {/* 送り先 */}
            <div className="bg-gray-50 rounded-2xl p-4 mb-4">
              <p className="text-xs text-gray-500 font-bold mb-2">送り先</p>
              <div className="flex items-center gap-3">
                {quickSendTarget.avatar_url ? (
                  <img 
                    src={quickSendTarget.avatar_url} 
                    alt="" 
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-amber-200 rounded-full flex items-center justify-center">
                    <UserCircle size={28} className="text-amber-600" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-black text-gray-800">
                    {quickSendTarget.full_name || 'ユーザー'}
                  </p>
                  <p className="text-xs text-gray-400 font-bold">{quickSendTarget.referral_code}</p>
                </div>
              </div>
            </div>
            
            {/* 金額入力 */}
            <div className="mb-4">
              <label className="text-sm font-black text-gray-700 mb-2 block">送金額</label>
              <div className="relative">
                <input
                  type="number"
                  value={quickSendAmount}
                  onChange={(e) => setQuickSendAmount(e.target.value)}
                  placeholder="0"
                  min="1"
                  max={points}
                  className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 pr-12 font-black text-2xl text-center text-gray-900 placeholder:text-gray-400 focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-200 focus:outline-none transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">pt</span>
              </div>
              
              {/* クイック金額 */}
              <div className="flex gap-2 mt-2">
                {[100, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setQuickSendAmount(String(Math.min(amt, points)))}
                    disabled={points < amt}
                    className="flex-1 py-2 bg-amber-100 hover:bg-amber-200 disabled:bg-gray-100 disabled:text-gray-400 text-amber-700 rounded-lg font-black text-xs transition-colors"
                  >
                    {amt}
                  </button>
                ))}
              </div>
            </div>
            
            {/* 結果メッセージ */}
            {quickSendResult && (
              <div className={`p-3 rounded-xl text-center mb-4 ${
                quickSendResult.success 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <p className={`text-sm font-black ${
                  quickSendResult.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {quickSendResult.message}
                </p>
              </div>
            )}
            
            {/* ボタン */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowQuickSendModal(false)}
                className="py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-black transition-colors flex items-center justify-center gap-2"
              >
                <X size={18} />
                キャンセル
              </button>
              <button
                onClick={handleQuickSend}
                disabled={quickSending || !quickSendAmount || parseInt(quickSendAmount) <= 0}
                className="py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-xl font-black transition-all active:scale-95 disabled:active:scale-100 flex items-center justify-center gap-2"
              >
                {quickSending ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
                送金
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 大学統計モーダル */}
      {showStatsModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowStatsModal(false)}
          />
          
          <div className="relative bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            {/* ヘッダー */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <School size={32} className="text-blue-500" />
              </div>
              <h3 className="text-xl font-black text-gray-800 mb-1">
                {loadingStats ? '集計中...' : universityStats?.universityName || '大学統計'}
              </h3>
              <p className="text-sm text-gray-500 font-bold">登録ユーザー数</p>
            </div>

            {loadingStats ? (
              <div className="py-8 text-center">
                <Loader2 size={32} className="animate-spin text-blue-500 mx-auto mb-2" />
                <p className="text-sm text-gray-400 font-bold">データを取得しています...</p>
              </div>
            ) : universityStats ? (
              <div className="space-y-6">
                {/* 合計人数 */}
                <div className="text-center">
                  <span className="text-4xl font-black text-blue-600">
                    {universityStats.totalCount}
                  </span>
                  <span className="text-sm font-bold text-gray-500 ml-1">人</span>
                </div>

                {/* 学年別内訳 */}
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-xs text-gray-500 font-bold mb-3 flex items-center gap-1">
                    <Users size={12} />
                    学年別内訳
                  </p>
                  <div className="space-y-2">
                    {universityStats.gradeBreakdown.map((item, index) => (
                      <div key={index} className="flex items-center justify-between py-1 border-b border-gray-100 last:border-0">
                        <span className="text-sm font-bold text-gray-700">{item.grade}</span>
                        <span className="text-sm font-black text-gray-900">{item.count}人</span>
                      </div>
                    ))}
                    {universityStats.gradeBreakdown.length === 0 && (
                      <p className="text-center text-gray-400 text-xs py-2">データがありません</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-red-500 font-bold">
                データの取得に失敗しました
              </div>
            )}
            
            {/* 閉じるボタン */}
            <div className="mt-6">
              <button
                onClick={() => setShowStatsModal(false)}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-black transition-colors flex items-center justify-center gap-2"
              >
                <X size={18} />
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 下部ナビゲーション */}
      <BottomNavigation />

      {/* QRスキャナーモーダル */}
      {showScanner && (
        <QRScanner
          onScanSuccess={handleScanSuccess}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}
