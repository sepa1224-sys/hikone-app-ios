'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabase'
import { Send, X, User, MessageCircle, Loader2 } from 'lucide-react'

export default function ChatRegistration({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0) // 0:名前, 1:町名, 2:通常チャット
  const [mounted, setMounted] = useState(false)
  const [name, setName] = useState('')
  const [town, setTown] = useState('')
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'hikonyan', text: 'こんにちは！ボク、ひこにゃんだニャ！' },
    { role: 'hikonyan', text: '君のことをもっと知りたいニャ。まずは「ニックネーム」を教えてほしいニャ！' }
  ])
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // クライアントサイドでのみマウント
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // メッセージが追加されたら一番下までスクロール
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  // チャットが開いている間のスクロール防止
  useEffect(() => {
    if (!mounted) return
    const originalStyle = window.getComputedStyle(document.body).overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalStyle
    }
  }, [mounted])

  const handleSend = async () => {
    if (!input.trim() || isTyping) return

    const userInput = input
    const newMessages = [...messages, { role: 'user', text: userInput }]
    setMessages(newMessages)
    setInput('')

    // --- ステップ0: 名前登録 ---
    if (step === 0) {
      setName(userInput)
      setIsTyping(true)
      setTimeout(() => {
        setMessages(prev => [...prev, 
          { role: 'hikonyan', text: `${userInput}さん、いい名前だニャ！` }, 
          { role: 'hikonyan', text: '次は、住んでいる「町名」を教えてほしいニャ！（例：本町、金亀町）' }
        ])
        setStep(1)
        setIsTyping(false)
      }, 800)
    } 
    // --- ステップ1: 町名登録 ---
    else if (step === 1) {
      setTown(userInput)
      setIsTyping(true)
      
      try {
        // Supabaseにプロフィール保存
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          throw new Error('ユーザー情報の取得に失敗しました。')
        }

        // profilesテーブルの更新
        const { error: updateError } = await supabase.from('profiles').update({ 
          full_name: name,
          city: '彦根市',
          detail_area: userInput,
          updated_at: new Date().toISOString()
        }).eq('id', user.id)

        if (updateError) {
          console.error('Profile Update Error:', updateError)
        }

        setTimeout(() => {
          setMessages(prev => [...prev, 
            { role: 'hikonyan', text: `${userInput}だニャ！覚えたニャ！` }, 
            { role: 'hikonyan', text: 'これで登録完了だぬ。これからは何でも話しかけてニャ！' }
          ])
          setStep(2) // AIチャットモードへ移行
          setIsTyping(false)
        }, 800)
      } catch (error: any) {
        console.error('Registration Error:', error)
        setIsTyping(false)
        setMessages(prev => [...prev, 
          { role: 'hikonyan', text: 'ちょっとエラーが出ちゃったニャ...でも大丈夫だぬ！' },
          { role: 'hikonyan', text: 'これからは何でも話しかけてニャ！' }
        ])
        setStep(2)
      }
    } 
    // --- ステップ2: 通常のAIチャットモード (API連携) ---
    else {
      setIsTyping(true)
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userInput }),
        })
        const data = await response.json()
        
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "ちょっと考え中だぬ..."
        setMessages(prev => [...prev, { role: 'hikonyan', text: aiText }])
      } catch (error) {
        console.error('Chat Error:', error)
        setMessages(prev => [...prev, { role: 'hikonyan', text: 'エラーだぬ...後で試してニャ。' }])
      } finally {
        setIsTyping(false)
      }
    }
  }

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 w-full h-[100dvh] bg-white z-[9999] flex flex-col overflow-hidden touch-none animate-in slide-in-from-bottom duration-300">
      {/* ヘッダー：h-16 shrink-0 で上に固定 */}
      <header className="h-16 shrink-0 bg-gradient-to-r from-red-500 to-orange-500 px-4 flex items-center justify-between text-white shadow-lg z-[10000] touch-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-2xl shadow-inner shrink-0">
            🐱
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-black leading-tight truncate">ひこにゃんAI</h1>
            <p className="text-[10px] opacity-90 font-bold truncate">チャットモード起動中</p>
          </div>
        </div>
        <button 
          onClick={onComplete}
          className="w-10 h-10 bg-black/10 hover:bg-black/20 rounded-full flex items-center justify-center transition-colors shrink-0"
          aria-label="閉じる"
        >
          <X size={24} />
        </button>
      </header>
      
      {/* メッセージエリア：flex-1 overflow-y-auto overscroll-contain でここだけが独立して動く */}
      <main className="flex-1 overflow-y-auto bg-[#fdf6e3] p-4 overscroll-contain touch-auto">
        <div className="max-w-2xl mx-auto space-y-6 pb-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex items-end gap-2 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 shadow-sm ${
                m.role === 'user' ? 'bg-blue-500' : 'bg-white border-2 border-red-200'
              }`}>
                {m.role === 'user' ? <User size={16} className="text-white" /> : '🐱'}
              </div>
              
              <div className={`relative max-w-[80%] p-4 rounded-2xl shadow-md font-bold text-sm leading-relaxed ${
                m.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-white text-gray-800 rounded-tl-none border-b-4 border-red-100'
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex items-end gap-2">
              <div className="w-8 h-8 rounded-full bg-white border-2 border-red-200 flex items-center justify-center text-sm shrink-0 shadow-sm">
                🐱
              </div>
              <div className="bg-white text-gray-400 p-4 rounded-2xl rounded-tl-none shadow-md border-b-4 border-red-50 px-6 flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-red-400" />
                <span className="text-xs font-black italic">入力中だニャ...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* 入力欄：shrink-0 でスマホの底に密着 */}
      <footer className="shrink-0 p-4 bg-white border-t border-gray-100 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-[10000] touch-auto" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 bg-gray-100 rounded-[2rem] p-1.5 pl-5 focus-within:ring-2 focus-within:ring-red-400 focus-within:bg-white transition-all border border-gray-200">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  handleSend()
                }
              }}
              disabled={isTyping}
              className="flex-1 bg-transparent border-none py-2 text-base text-gray-900 focus:outline-none disabled:opacity-50 font-bold placeholder:text-gray-400"
              placeholder={isTyping ? "考え中ニャ..." : "ひこにゃんにメッセージ..."}
            />
            <button 
              onClick={handleSend}
              disabled={isTyping || !input.trim()}
              className="bg-gradient-to-br from-red-500 to-orange-500 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform disabled:grayscale disabled:opacity-50 shrink-0"
            >
              <Send size={20} />
            </button>
          </div>
          <p className="text-[10px] text-center text-gray-400 mt-2 font-bold">
            Powered by Gemini API • (c) Hikone City
          </p>
        </div>
      </footer>
    </div>,
    document.body
  )
}
