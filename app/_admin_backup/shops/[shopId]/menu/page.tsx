'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  ChevronLeft, Plus, Trash2, Utensils, Coffee, 
  IceCream, Wine, MoreHorizontal, Loader2, 
  AlertCircle, Check, Store
} from 'lucide-react'

// メニューアイテムの型定義
interface MenuItem {
  id: string
  shop_id: string
  name: string
  price: number
  description: string | null
  category: 'lunch' | 'dinner' | 'drink' | 'dessert' | 'other'
  is_available: boolean
  sort_order: number
  created_at: string
}

// カテゴリの定義
const CATEGORIES = [
  { value: 'lunch', label: 'ランチ', icon: Utensils, color: 'bg-orange-100 text-orange-600' },
  { value: 'dinner', label: 'ディナー', icon: Wine, color: 'bg-purple-100 text-purple-600' },
  { value: 'drink', label: 'ドリンク', icon: Coffee, color: 'bg-blue-100 text-blue-600' },
  { value: 'dessert', label: 'デザート', icon: IceCream, color: 'bg-pink-100 text-pink-600' },
  { value: 'other', label: 'その他', icon: MoreHorizontal, color: 'bg-gray-100 text-gray-600' },
] as const

export default function MenuManagementPage() {
  const params = useParams()
  const router = useRouter()
  const shopId = params.shopId as string
  
  // メニューリスト
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // フォーム
  const [formName, setFormName] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formCategory, setFormCategory] = useState<MenuItem['category']>('lunch')
  const [adding, setAdding] = useState(false)
  const [addResult, setAddResult] = useState<{ success: boolean; message: string } | null>(null)
  
  // 削除中のID
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  // メニュー一覧を取得
  const fetchMenuItems = useCallback(async () => {
    if (!shopId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const { data, error: fetchError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('shop_id', shopId)
        .order('category')
        .order('sort_order')
        .order('created_at', { ascending: false })
      
      if (fetchError) {
        console.error('メニュー取得エラー:', fetchError)
        setError('メニューの取得に失敗しました')
        return
      }
      
      setMenuItems(data || [])
    } catch (err) {
      console.error('メニュー取得エラー:', err)
      setError('予期しないエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }, [shopId])
  
  // 初回読み込み
  useEffect(() => {
    fetchMenuItems()
  }, [fetchMenuItems])
  
  // メニュー追加
  const handleAddMenu = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formName.trim()) {
      setAddResult({ success: false, message: 'メニュー名を入力してください' })
      return
    }
    
    if (!formPrice || parseInt(formPrice) < 0) {
      setAddResult({ success: false, message: '価格を正しく入力してください' })
      return
    }
    
    setAdding(true)
    setAddResult(null)
    
    try {
      const { data, error: insertError } = await supabase
        .from('menu_items')
        .insert({
          shop_id: shopId,
          name: formName.trim(),
          price: parseInt(formPrice),
          description: formDescription.trim() || null,
          category: formCategory,
          sort_order: menuItems.length
        })
        .select()
        .single()
      
      if (insertError) {
        console.error('メニュー追加エラー:', insertError)
        setAddResult({ success: false, message: 'メニューの追加に失敗しました' })
        return
      }
      
      // 成功
      setAddResult({ success: true, message: 'メニューを追加しました' })
      setFormName('')
      setFormPrice('')
      setFormDescription('')
      
      // リストを更新
      fetchMenuItems()
      
      // 成功メッセージを3秒後にクリア
      setTimeout(() => setAddResult(null), 3000)
    } catch (err) {
      console.error('メニュー追加エラー:', err)
      setAddResult({ success: false, message: '予期しないエラーが発生しました' })
    } finally {
      setAdding(false)
    }
  }
  
  // メニュー削除
  const handleDeleteMenu = async (menuId: string, menuName: string) => {
    if (!confirm(`「${menuName}」を削除しますか？\nこの操作は取り消せません。`)) {
      return
    }
    
    setDeletingId(menuId)
    
    try {
      const { error: deleteError } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', menuId)
      
      if (deleteError) {
        console.error('メニュー削除エラー:', deleteError)
        alert('メニューの削除に失敗しました')
        return
      }
      
      // リストを更新
      setMenuItems(prev => prev.filter(item => item.id !== menuId))
    } catch (err) {
      console.error('メニュー削除エラー:', err)
      alert('予期しないエラーが発生しました')
    } finally {
      setDeletingId(null)
    }
  }
  
  // カテゴリ情報を取得
  const getCategoryInfo = (category: MenuItem['category']) => {
    return CATEGORIES.find(c => c.value === category) || CATEGORIES[4]
  }
  
  // カテゴリでグループ化
  const groupedMenuItems = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, MenuItem[]>)
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-2xl mx-auto p-6 pb-24">
        {/* ヘッダー */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-black text-gray-800">メニュー管理</h1>
            <p className="text-xs text-gray-500 font-bold flex items-center gap-1">
              <Store size={12} />
              Shop ID: {shopId?.slice(0, 8)}...
            </p>
          </div>
        </div>
        
        {/* 追加フォーム */}
        <div className="bg-white rounded-[2rem] p-6 shadow-lg border border-gray-100 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Plus size={20} className="text-green-600" />
            </div>
            <h2 className="text-lg font-black text-gray-800">メニューを追加</h2>
          </div>
          
          <form onSubmit={handleAddMenu} className="space-y-4">
            {/* メニュー名 */}
            <div>
              <label className="text-sm font-black text-gray-700 mb-1 block">
                メニュー名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="例: 近江牛ハンバーグ定食"
                className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-900 placeholder:text-gray-400 focus:border-green-400 focus:bg-white focus:outline-none transition-all"
              />
            </div>
            
            {/* 価格 */}
            <div>
              <label className="text-sm font-black text-gray-700 mb-1 block">
                価格（円） <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="1200"
                  min="0"
                  className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 pr-12 font-bold text-gray-900 placeholder:text-gray-400 focus:border-green-400 focus:bg-white focus:outline-none transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">円</span>
              </div>
            </div>
            
            {/* 説明 */}
            <div>
              <label className="text-sm font-black text-gray-700 mb-1 block">
                説明（任意）
              </label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="地元産の近江牛を100%使用したジューシーなハンバーグ"
                rows={2}
                className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-900 placeholder:text-gray-400 focus:border-green-400 focus:bg-white focus:outline-none transition-all resize-none"
              />
            </div>
            
            {/* カテゴリ */}
            <div>
              <label className="text-sm font-black text-gray-700 mb-2 block">
                カテゴリ <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon
                  const isSelected = formCategory === cat.value
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setFormCategory(cat.value as MenuItem['category'])}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                        isSelected 
                          ? `${cat.color} ring-2 ring-offset-2 ring-current` 
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      <Icon size={16} />
                      {cat.label}
                    </button>
                  )
                })}
              </div>
            </div>
            
            {/* 結果メッセージ */}
            {addResult && (
              <div className={`p-3 rounded-xl flex items-center gap-2 ${
                addResult.success 
                  ? 'bg-green-50 text-green-700' 
                  : 'bg-red-50 text-red-700'
              }`}>
                {addResult.success ? <Check size={18} /> : <AlertCircle size={18} />}
                <span className="font-bold text-sm">{addResult.message}</span>
              </div>
            )}
            
            {/* 追加ボタン */}
            <button
              type="submit"
              disabled={adding}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white py-3 rounded-xl font-black transition-all active:scale-95 disabled:active:scale-100 flex items-center justify-center gap-2"
            >
              {adding ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  追加中...
                </>
              ) : (
                <>
                  <Plus size={20} />
                  メニューを追加
                </>
              )}
            </button>
          </form>
        </div>
        
        {/* メニュー一覧 */}
        <div className="bg-white rounded-[2rem] p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
              <Utensils size={20} className="text-orange-500" />
              メニュー一覧
            </h2>
            <span className="text-sm font-bold text-gray-400">
              {menuItems.length}件
            </span>
          </div>
          
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 size={32} className="animate-spin text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-400 font-bold">読み込み中...</p>
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
              <p className="text-sm text-red-500 font-bold">{error}</p>
              <button
                onClick={fetchMenuItems}
                className="mt-3 text-sm text-blue-500 font-bold underline"
              >
                再読み込み
              </button>
            </div>
          ) : menuItems.length === 0 ? (
            <div className="py-12 text-center">
              <span className="text-4xl opacity-30">🍽️</span>
              <p className="text-sm text-gray-400 font-bold mt-2">まだメニューがありません</p>
              <p className="text-xs text-gray-300 mt-1">上のフォームからメニューを追加してください</p>
            </div>
          ) : (
            <div className="space-y-6">
              {CATEGORIES.map((cat) => {
                const items = groupedMenuItems[cat.value]
                if (!items || items.length === 0) return null
                
                const Icon = cat.icon
                
                return (
                  <div key={cat.value}>
                    {/* カテゴリヘッダー */}
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${cat.color} mb-3`}>
                      <Icon size={16} />
                      <span className="font-black text-sm">{cat.label}</span>
                      <span className="text-xs font-bold opacity-60">({items.length})</span>
                    </div>
                    
                    {/* メニューリスト */}
                    <div className="space-y-2">
                      {items.map((item) => (
                        <div 
                          key={item.id}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-black text-gray-800 truncate">{item.name}</p>
                              {!item.is_available && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full">
                                  売切
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-xs text-gray-500 truncate mt-0.5">{item.description}</p>
                            )}
                          </div>
                          
                          {/* 価格 */}
                          <div className="text-right">
                            <p className="font-black text-orange-600">
                              ¥{item.price.toLocaleString()}
                            </p>
                          </div>
                          
                          {/* 削除ボタン */}
                          <button
                            onClick={() => handleDeleteMenu(item.id, item.name)}
                            disabled={deletingId === item.id}
                            className="p-2 bg-white hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors disabled:opacity-50"
                            title="削除"
                          >
                            {deletingId === item.id ? (
                              <Loader2 size={18} className="animate-spin" />
                            ) : (
                              <Trash2 size={18} />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
