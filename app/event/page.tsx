'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { 
  Camera, Upload, CheckCircle, Trophy, Calendar, MapPin, 
  ArrowLeft, Sparkles, Gift, Clock, Image as ImageIcon, X,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import BottomNavigation from '@/components/BottomNavigation'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface Event {
  id: string
  title: string
  description: string
  prize_amount: number
  start_date: string
  end_date: string
  location: string
  image_url?: string
  status: 'active' | 'upcoming' | 'ended'
}

interface Submission {
  id: string
  event_id: string
  user_id: string
  image_url: string
  created_at: string
}

export default function EventPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [user, setUser] = useState<any>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)

  // ユーザー認証状態を確認
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
    }
    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // イベントと投稿を取得
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      
      // アクティブなイベントを取得
      // ★ Supabase テーブル未作成のため一時的にコメントアウト
      /*
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'active')
        .order('end_date', { ascending: true })
      
      if (eventsError) {
        console.error('イベント取得エラー:', eventsError)
      */
        // デモ用のモックデータ
        setEvents([
          {
            id: 'demo-1',
            title: '彦根城 冬の絶景フォトコンテスト',
            description: '雪化粧の彦根城、冬の琵琶湖、イルミネーションなど、彦根の冬の魅力を写真に収めてください！',
            prize_amount: 5000,
            start_date: '2026-01-01',
            end_date: '2026-02-28',
            location: '彦根市内',
            status: 'active'
          },
          {
            id: 'demo-2',
            title: 'ひこにゃんベストショット',
            description: 'ひこにゃんの可愛い瞬間を撮影！毎月優秀作品を表彰します。',
            prize_amount: 3000,
            start_date: '2026-01-01',
            end_date: '2026-12-31',
            location: '彦根城周辺',
            status: 'active'
          }
        ])
      /*
      } else {
        setEvents(eventsData || [])
      }
      */

      // ユーザーの投稿を取得
      if (user) {
        const { data: submissionsData } = await supabase
          .from('event_submissions')
          .select('*')
          .eq('user_id', user.id)
        
        setSubmissions(submissionsData || [])
      }

      setLoading(false)
    }

    fetchData()
  }, [user])

  // 投稿済みかチェック
  const hasSubmitted = (eventId: string) => {
    return submissions.some(s => s.event_id === eventId)
  }

  // ファイル選択
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // ファイルサイズチェック（10MB以下）
      if (file.size > 10 * 1024 * 1024) {
        setError('ファイルサイズは10MB以下にしてください')
        return
      }
      
      // 画像タイプチェック
      if (!file.type.startsWith('image/')) {
        setError('画像ファイルを選択してください')
        return
      }

      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setError('')
    }
  }

  // 写真をアップロード
  const handleUpload = async () => {
    if (!selectedEvent || !selectedFile || !user) {
      setError('イベントを選択し、写真を選んでください')
      return
    }

    setUploading(true)
    setError('')
    setSuccess('')

    let currentStep = '開始'

    try {
      // ファイル名を生成
      currentStep = 'ファイル名生成'
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${user.id}/${selectedEvent.id}/${Date.now()}.${fileExt}`

      // Supabase Storageにアップロード
      currentStep = 'Storage保存'
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('event-photos')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // 公開URLを取得
      currentStep = '公開URL取得'
      const { data: { publicUrl } } = supabase.storage
        .from('event-photos')
        .getPublicUrl(fileName)

      // event_submissions テーブルに保存
      currentStep = 'DB保存'
      /* ★ Supabase テーブル未作成のため一時的にコメントアウト
      const { error: insertError } = await supabase
        .from('event_submissions')
        .insert({
          event_id: selectedEvent.id,
          user_id: user.id,
          image_url: publicUrl,
        })

      if (insertError) throw insertError
      */
      
      // デモ用：DB保存スキップして成功とする
      console.log('★ DB保存スキップ（テーブル未作成）', { event_id: selectedEvent.id, image_url: publicUrl })

      // 成功
      const successMsg = '投稿が完了しました！審査結果をお待ちください。'
      setSuccess(successMsg)
      alert(successMsg)
      
      setSubmissions([...submissions, {
        id: 'new',
        event_id: selectedEvent.id,
        user_id: user.id,
        image_url: publicUrl,
        created_at: new Date().toISOString()
      }])
      setSelectedFile(null)
      setPreviewUrl(null)
      setSelectedEvent(null)

    } catch (err: any) {
      console.error(`❌ [Upload] Error at step: ${currentStep}`, err)
      let errorMessage = err?.message || ''
      if (!errorMessage) errorMessage = JSON.stringify(err)
      
      const fullErrorMsg = `Upload Error (${currentStep}): ${errorMessage}`
      alert(fullErrorMsg)
      setError(fullErrorMsg)
    } finally {
      setUploading(false)
    }
  }

  // 日付フォーマット
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  // 残り日数
  const getDaysLeft = (endDate: string) => {
    const end = new Date(endDate)
    const now = new Date()
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 pb-24">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-500 text-white p-6 pt-10 pb-12 rounded-b-[40px] shadow-lg">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/" className="p-2 bg-white/20 rounded-full">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-black flex items-center gap-2">
              <Trophy size={24} />
              フォトコンテスト
            </h1>
            <p className="text-sm opacity-80 mt-1">写真を投稿して賞金をゲット！</p>
          </div>
        </div>

        {/* 賞金バッジ */}
        <div className="flex items-center justify-center">
          <div className="bg-yellow-400 text-yellow-900 px-6 py-3 rounded-2xl font-black text-lg flex items-center gap-2 shadow-lg transform -rotate-2">
            <Gift size={24} />
            最大賞金 5,000円
            <Sparkles size={20} />
          </div>
        </div>
      </div>

      <div className="px-4 -mt-6 space-y-6">
        {/* 未ログイン警告 */}
        {!user && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm font-bold text-amber-800">ログインが必要です</p>
              <p className="text-xs text-amber-600 mt-1">
                写真を投稿するには
                <Link href="/login" prefetch={false} className="underline font-bold ml-1">ログイン</Link>
                してください
              </p>
            </div>
          </div>
        )}

        {/* 成功メッセージ */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle className="text-green-500" size={20} />
            <p className="text-sm font-bold text-green-800">{success}</p>
          </div>
        )}

        {/* エラーメッセージ */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
            <AlertCircle className="text-red-500" size={20} />
            <p className="text-sm font-bold text-red-800">{error}</p>
          </div>
        )}

        {/* イベント一覧 */}
        {loading ? (
          <div className="text-center py-10">
            <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-sm text-gray-500 mt-3">読み込み中...</p>
          </div>
        ) : (
          events.map((event) => {
            const submitted = hasSubmitted(event.id)
            const daysLeft = getDaysLeft(event.end_date)
            const isSelected = selectedEvent?.id === event.id

            return (
              <div 
                key={event.id}
                className={`bg-white rounded-3xl overflow-hidden shadow-xl border-2 transition-all ${
                  isSelected ? 'border-purple-500 scale-[1.02]' : 'border-white'
                }`}
              >
                {/* イベントヘッダー */}
                <div className="relative">
                  {event.image_url ? (
                    <img src={event.image_url} alt={event.title} className="w-full h-40 object-cover" />
                  ) : (
                    <div className="w-full h-40 bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                      <Camera size={48} className="text-white/50" />
                    </div>
                  )}
                  
                  {/* 賞金バッジ */}
                  <div className="absolute top-3 right-3 bg-yellow-400 text-yellow-900 px-3 py-1.5 rounded-full font-black text-sm flex items-center gap-1 shadow-lg">
                    <Trophy size={14} />
                    ¥{event.prize_amount.toLocaleString()}
                  </div>

                  {/* 残り日数 */}
                  <div className="absolute bottom-3 left-3 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <Clock size={12} />
                    あと{daysLeft}日
                  </div>

                  {/* 投稿済みバッジ */}
                  {submitted && (
                    <div className="absolute inset-0 bg-green-500/80 flex items-center justify-center">
                      <div className="text-white text-center">
                        <CheckCircle size={48} className="mx-auto mb-2" />
                        <p className="font-black text-lg">投稿済み</p>
                        <p className="text-sm opacity-80">審査結果をお待ちください</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* イベント詳細 */}
                <div className="p-5">
                  <h3 className="text-lg font-black text-gray-800 mb-2">{event.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{event.description}</p>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      {formatDate(event.start_date)} 〜 {formatDate(event.end_date)}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin size={14} />
                      {event.location}
                    </div>
                  </div>

                  {/* アクションボタン */}
                  {!submitted && user && (
                    <button
                      onClick={() => setSelectedEvent(isSelected ? null : event)}
                      className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                        isSelected
                          ? 'bg-purple-600 text-white'
                          : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                      }`}
                    >
                      <Camera size={18} />
                      {isSelected ? '選択中' : '写真を投稿する'}
                    </button>
                  )}

                  {submitted && (
                    <div className="w-full py-3 rounded-xl bg-green-100 text-green-600 font-bold text-center flex items-center justify-center gap-2">
                      <CheckCircle size={18} />
                      投稿済み
                    </div>
                  )}
                </div>

                {/* 写真アップロードエリア（選択時） */}
                {isSelected && !submitted && user && (
                  <div className="border-t border-gray-100 p-5 bg-purple-50">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    {previewUrl ? (
                      <div className="relative mb-4">
                        <img 
                          src={previewUrl} 
                          alt="プレビュー" 
                          className="w-full h-48 object-cover rounded-xl"
                        />
                        <button
                          onClick={() => {
                            setSelectedFile(null)
                            setPreviewUrl(null)
                          }}
                          className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-32 border-2 border-dashed border-purple-300 rounded-xl flex flex-col items-center justify-center gap-2 text-purple-500 hover:bg-purple-100 transition-colors mb-4"
                      >
                        <ImageIcon size={32} />
                        <span className="text-sm font-bold">タップして写真を選択</span>
                        <span className="text-xs opacity-60">または撮影</span>
                      </button>
                    )}

                    <button
                      onClick={handleUpload}
                      disabled={!selectedFile || uploading}
                      className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-black rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all shadow-lg"
                    >
                      {uploading ? (
                        <>
                          <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                          アップロード中...
                        </>
                      ) : (
                        <>
                          <Upload size={18} />
                          この写真を投稿する
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}

        {/* イベントがない場合 */}
        {!loading && events.length === 0 && (
          <div className="text-center py-16">
            <Trophy size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-bold">現在開催中のイベントはありません</p>
            <p className="text-sm text-gray-400 mt-2">新しいイベントをお楽しみに！</p>
          </div>
        )}

        {/* 注意事項 */}
        <div className="bg-gray-100 rounded-2xl p-4 text-xs text-gray-500">
          <p className="font-bold mb-2">投稿時の注意事項</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>他者の著作権を侵害する写真は投稿しないでください</li>
            <li>人物が写っている場合は許可を得てください</li>
            <li>投稿した写真はアプリ内で使用される場合があります</li>
            <li>審査結果は後日メールでお知らせします</li>
          </ul>
        </div>
      </div>

      <BottomNavigation />
    </div>
  )
}
