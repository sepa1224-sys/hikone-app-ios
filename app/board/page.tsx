'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { getPosts, createPost, Post } from '@/lib/actions/board'
import BottomNavigation from '@/components/BottomNavigation'
import { 
  ChevronLeft, Send, Loader2, UserCircle, 
  MessageSquare, School, AlertCircle, Layout
} from 'lucide-react'

export default function BoardPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [newPostContent, setNewPostContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 初期データ取得
  useEffect(() => {
    const fetchPosts = async () => {
      if (authLoading) return
      
      if (!user || !profile) {
        router.push('/login')
        return
      }

      // 大学名がない、または大学生でない場合はアクセス制限
      // (ただし、すでにプロフィール画面でボタンを出し分けているので、
      // ここでは厳密な制限というよりは、データがない場合のハンドリングを行う)
      if (!profile.university_name) {
        setLoading(false)
        return
      }

      try {
        const result = await getPosts(profile.university_name)
        if (result.success && result.data) {
          setPosts(result.data)
        } else {
          setError(result.error || '投稿の取得に失敗しました')
        }
      } catch (err) {
        console.error(err)
        setError('予期しないエラーが発生しました')
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [authLoading, user, profile, router])

  // 投稿送信
  const handlePost = async () => {
    if (!newPostContent.trim() || !profile?.university_name) return

    setPosting(true)
    setError(null)

    try {
      const result = await createPost(newPostContent.trim(), profile.university_name)
      
      if (result.success && result.data) {
        // 新しい投稿をリストの先頭に追加 (Optimistic update的な挙動)
        // サーバーからのレスポンスには profile 情報が含まれていない場合があるため、
        // クライアント側で補完するか、再取得する必要がある。
        // ここでは簡易的に現在のユーザー情報を使って表示用データを作成する
        const newPost: Post = {
          ...result.data,
          profiles: {
            full_name: profile.full_name || '自分',
            avatar_url: profile.avatar_url,
            grade: profile.grade
          }
        }
        setPosts([newPost, ...posts])
        setNewPostContent('')
      } else {
        setError(result.error || '投稿に失敗しました')
      }
    } catch (err) {
      console.error(err)
      setError('予期しないエラーが発生しました')
    } finally {
      setPosting(false)
    }
  }

  // 日付フォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    // 24時間以内なら「XX時間前」
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000))
      if (hours === 0) {
        const minutes = Math.floor(diff / (60 * 1000))
        return `${minutes}分前`
      }
      return `${hours}時間前`
    }
    
    return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-green-600" size={32} />
      </div>
    )
  }

  if (!profile?.university_name) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
          <School size={32} className="text-gray-400" />
        </div>
        <h2 className="text-xl font-black text-gray-800 mb-2">大学が設定されていません</h2>
        <p className="text-gray-500 font-bold mb-6">
          掲示板を利用するには、プロフィール設定で<br/>大学名を登録してください。
        </p>
        <button
          onClick={() => router.push('/profile')}
          className="bg-green-600 text-white px-6 py-3 rounded-xl font-black shadow-lg active:scale-95 transition-all"
        >
          プロフィール設定へ
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F0F4F8]"> {/* 少し青みがかったグレー背景 */}
      <div className="max-w-xl mx-auto pb-24 relative min-h-screen">
        
        {/* ヘッダー */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md shadow-sm px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft size={24} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-lg font-black text-gray-800 flex items-center gap-2">
              <School size={18} className="text-green-600" />
              {profile.university_name} 掲示板
            </h1>
            <p className="text-[10px] text-gray-500 font-bold">同じ大学の学生と交流しよう</p>
          </div>
        </header>

        {/* コンテンツエリア */}
        <main className="p-4 space-y-4">
          
          {/* 投稿フォーム */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0 overflow-hidden">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UserCircle size={24} className="text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="大学のみんなにメッセージを送ろう..."
                  className="w-full bg-gray-50 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 resize-none"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-400">
                {newPostContent.length} / 500
              </span>
              <button
                onClick={handlePost}
                disabled={!newPostContent.trim() || posting}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-xl font-black text-sm flex items-center gap-2 transition-all active:scale-95 disabled:active:scale-100 shadow-md disabled:shadow-none"
              >
                {posting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                投稿する
              </button>
            </div>
            {error && (
              <div className="mt-3 p-2 bg-red-50 text-red-600 text-xs font-bold rounded-lg flex items-center gap-2">
                <AlertCircle size={14} />
                {error}
              </div>
            )}
          </div>

          {/* 投稿一覧 */}
          <div className="space-y-3">
            {posts.length === 0 ? (
              <div className="text-center py-10 opacity-60">
                <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Layout size={32} className="text-gray-400" />
                </div>
                <p className="text-gray-500 font-bold">まだ投稿がありません</p>
                <p className="text-xs text-gray-400 mt-1">最初の投稿をしてみよう！</p>
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-start gap-3 mb-2">
                    {/* アバター */}
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0 overflow-hidden">
                      {post.profiles?.avatar_url ? (
                        <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-indigo-50">
                          <UserCircle size={24} className="text-indigo-300" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-gray-800 text-sm">
                            {post.profiles?.full_name || '名無しさん'}
                          </span>
                          {post.profiles?.grade && (
                            <span className="bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                              {post.profiles.grade}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-gray-400">
                          {formatDate(post.created_at)}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm mt-1 whitespace-pre-wrap leading-relaxed">
                        {post.content}
                      </p>
                    </div>
                  </div>
                  
                  {/* アクションボタン（将来的にいいね機能などをつける場所） */}
                  {/* 
                  <div className="flex items-center gap-4 mt-2 ml-13 pl-10 border-t border-gray-50 pt-2">
                    <button className="flex items-center gap-1 text-gray-400 hover:text-pink-500 transition-colors">
                      <Heart size={14} />
                      <span className="text-xs font-bold">0</span>
                    </button>
                  </div> 
                  */}
                </div>
              ))
            )}
          </div>

        </main>
      </div>
      <BottomNavigation />
    </div>
  )
}
