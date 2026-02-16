'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { ArrowLeft, Store, Save, Loader2, Camera, Trash2, Plus, X, Lock, CreditCard, Utensils, Image as ImageIcon, ShieldAlert, Clock, Banknote } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { updateShopBasicInfo, updateShopImages, getMenuItems, upsertMenuItem, deleteMenuItem, getShopSettings, uploadShopImageAction, getShopStampSettings, updateShopBankInfo, uploadMenuImageAction, updateShopOpeningHours } from '@/lib/actions/shop'
import { updateStampCardSettings } from '@/lib/actions/stamp'
import Image from 'next/image'
import { Stamp } from 'lucide-react'

// 画像圧縮用の簡易関数
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img')
    const reader = new FileReader()
    reader.onload = (e) => {
      img.src = e.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        const maxWidth = 1200
        const scale = maxWidth / img.width
        canvas.width = maxWidth
        canvas.height = img.height * scale
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Compression failed'))
        }, 'image/jpeg', 0.8)
      }
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const CATEGORY_MAIN_OPTIONS = [
  '和食', '洋食', '中華', 'イタリアン', 'フレンチ', 
  'カフェ', '居酒屋', 'バー', 'ラーメン', 'カレー', 
  '焼肉', '寿司', '韓国料理', 'エスニック', 'その他'
]

const MEAL_TYPE_OPTIONS = [
  'ランチ', 'ディナー', 'ランチ・ディナー', 'モーニング', 'テイクアウトのみ', 'その他'
]

const PRICE_RANGE_OPTIONS = [
  '~1,000円',
  '1,000円~2,000円',
  '2,000円~3,000円',
  '3,000円~5,000円',
  '5,000円~10,000円',
  '10,000円~'
]

function ShopSettingsContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const impersonateShopId = searchParams.get('impersonateShopId') || undefined
  
  // Data States
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingBank, setSavingBank] = useState(false)
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentShopId, setCurrentShopId] = useState<string | undefined>(undefined)

  // Basic Info State
  const [address, setAddress] = useState('') // Read-only
  const [shopName, setShopName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('') // Private owner phone
  const [phone, setPhone] = useState('') // Public customer phone
  const [transactionPassword, setTransactionPassword] = useState('')
  
  // Genre Info State
  const [categoryMain, setCategoryMain] = useState('')
  const [categorySub, setCategorySub] = useState('')
  const [mealType, setMealType] = useState('')
  const [priceRange, setPriceRange] = useState('')
  
  // Bank Info State
  const [bankInfo, setBankInfo] = useState({
    bankName: '',
    branchName: '',
    accountType: 'ordinary' as 'ordinary' | 'current',
    accountNumber: '',
    accountHolder: ''
  })

  // Opening Hours State
  const [openingHours, setOpeningHours] = useState<any>({
    mon: { open: '09:00', close: '18:00', is_closed: false },
    tue: { open: '09:00', close: '18:00', is_closed: false },
    wed: { open: '09:00', close: '18:00', is_closed: false },
    thu: { open: '09:00', close: '18:00', is_closed: false },
    fri: { open: '09:00', close: '18:00', is_closed: false },
    sat: { open: '10:00', close: '20:00', is_closed: false },
    sun: { open: '10:00', close: '20:00', is_closed: true }
  })

  // Photo State
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [galleryUrls, setGalleryUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  // Menu State
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [editingItem, setEditingItem] = useState<any | null>(null) // null means adding new or not editing

  // Stamp Card State
  const [stampTargetCount, setStampTargetCount] = useState(10)
  const [stampRewardDescription, setStampRewardDescription] = useState('')

  useEffect(() => {
    if (!user) return
    
    // [Init Fix] Shop IDを確実に取得する
    // getShopSettingsの一部として取得されるが、念のため独立しても確認する
    // Note (2026-02-12): サーバー側で暗黙的ID解決を行うようになったため、
    // ここでIDが取れなくても保存処理自体は user.id (owner_id) 経由で成功します。
    // currentShopId は主にフロントエンドでの表示やチェック用として機能します。
    async function ensureShopId() {
       if (currentShopId) return
       
       if (!impersonateShopId) {
          const { data: shop } = await supabase
            .from('shops')
            .select('id')
            .eq('owner_id', user!.id)
            .single()
          if (shop?.id) {
             console.log('[Init] Shop ID resolved:', shop.id)
             setCurrentShopId(shop.id)
          }
       }
    }
    ensureShopId()

    async function fetchData() {
      try {
        setLoading(true)
        const userId = user!.id

        // Admin Check
        if (impersonateShopId) {
          setIsAdmin(true)
        } else {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single()
          if (userProfile?.role === 'admin') {
            setIsAdmin(true)
          }
        }

        // Use the centralized data fetching function that supports impersonation
        const { success, data, message } = await getShopSettings(userId, impersonateShopId)
        
        if (!success || !data) {
          console.error('Failed to fetch shop settings:', message)
          setMessage({ type: 'error', text: message || 'データ取得に失敗しました' })
          return
        }

        // 1. Set Shop Data
        if (data.shop) {
          setShopName(data.shop.name || '')
          setAddress(data.shop.address || '')
          setPhoneNumber(data.shop.phone_number || '')
          setPhone(data.shop.phone || '')
          setCategoryMain(data.shop.category_main || '')
          setCategorySub(data.shop.category_sub || '')
          setMealType(data.shop.meal_type || '')
          setThumbnailUrl(data.shop.thumbnail_url || null)
          setGalleryUrls(data.shop.gallery_urls || [])
          if (data.shop.id) {
            setCurrentShopId(data.shop.id)
          }

          // Set Opening Hours
          if (data.shop.opening_hours) {
            try {
              // Try to parse if it's a JSON string
              const parsed = typeof data.shop.opening_hours === 'string' && data.shop.opening_hours.startsWith('{')
                ? JSON.parse(data.shop.opening_hours)
                : (typeof data.shop.opening_hours === 'object' ? data.shop.opening_hours : null)
              
              if (parsed) {
                 setOpeningHours((prev: any) => ({ ...prev, ...parsed }))
              }
            } catch (e) {
              console.error('Failed to parse opening_hours')
            }
          }
        }

        // 2. Set Profile Data (Transaction Password)
        if (data.profile) {
          setTransactionPassword(data.profile.transaction_password || '')
        }

        // 3. Set Bank Data
        if (data.bank) {
          setBankInfo({
            bankName: data.bank.bank_name || '',
            branchName: data.bank.branch_name || '',
            accountType: (data.bank.account_type as any) || 'ordinary',
            accountNumber: data.bank.account_number || '',
            accountHolder: data.bank.account_holder || ''
          })
        }

        // 4. Fetch Menu Items (Separate call as it might return array)
        const { success: menuSuccess, data: menuData } = await getMenuItems(userId, impersonateShopId)
        if (menuSuccess && menuData) {
          setMenuItems(menuData)
        }

        // 5. Fetch Stamp Settings
        const { success: stampSuccess, data: stampData } = await getShopStampSettings(userId, impersonateShopId)
        if (stampSuccess && stampData) {
          setStampTargetCount(stampData.target_count || 10)
          setStampRewardDescription(stampData.reward_description || '')
        }

      } catch (error) {
        console.error('Error fetching data:', error)
        setMessage({ type: 'error', text: 'エラーが発生しました' })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, impersonateShopId])

  // --- Handlers ---

  const handleSaveShopInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSaving(true)
    setMessage(null)

    try {
      console.log('[Debug] handleSaveShopInfo: Saving basic info')

      const result = await updateShopBasicInfo(user.id, {
        name: shopName,
        address: address,
        phoneNumber,
        phone,
        transactionPassword,
        categoryMain,
        categorySub,
        mealType,
        priceRange,
      }, impersonateShopId)
      
      if (result.success) {
        setMessage({ type: 'success', text: result.message || '店舗情報を保存しました' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: result.message || '保存に失敗しました' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'エラーが発生しました' })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveOpeningHours = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSaving(true)
    setMessage(null)

    try {
      // Pass object directly (Server Action handles serialization/parsing)
      const result = await updateShopOpeningHours(user.id, openingHours, impersonateShopId)

      if (result.success) {
        setMessage({ type: 'success', text: result.message || '営業時間を保存しました' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: result.message || '保存に失敗しました' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'エラーが発生しました' })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveBankInfo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user) return

    setSavingBank(true)
    setMessage(null)

    // Admin impersonation check
    const formData = new FormData(e.currentTarget)
    const formImpersonateId = formData.get('impersonateShopId') as string
    // Only use impersonate ID if it's explicitly provided (Admin case)
    const targetImpersonateId = formImpersonateId || impersonateShopId || undefined

    console.log('[Debug] handleSaveBankInfo: Saving bank info', { 
      targetImpersonateId,
      user_id: user.id
    })

    try {
      // Updated signature: bankInfo first, then optional impersonateShopId
      // Server will resolve shop ID from user.id if impersonateShopId is missing
      const result = await updateShopBankInfo(bankInfo, targetImpersonateId)
      
      if (result.success) {
        setMessage({ type: 'success', text: result.message || '口座情報を保存しました' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: result.message || '保存に失敗しました' })
      }
    } catch (error) {
      console.error('Error saving bank info:', error)
      setMessage({ type: 'error', text: 'エラーが発生しました' })
    } finally {
      setSavingBank(false)
    }
  }

  const handleSaveStampSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSaving(true)
    setMessage(null)

    try {
      const result = await updateStampCardSettings(user.id, {
        targetCount: stampTargetCount,
        rewardDescription: stampRewardDescription
      }, impersonateShopId)

      if (result.success) {
        setMessage({ type: 'success', text: result.message || 'スタンプ設定を保存しました' })
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: result.message || '保存に失敗しました' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'エラーが発生しました' })
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (file: File, type: 'thumbnail' | 'gallery') => {
    if (!user) return
    setUploading(true)
    try {
      const compressedBlob = await compressImage(file)
      
      // Server Actionを使用してアップロード (Admin代理編集時のRLS回避のため)
      const formData = new FormData()
      formData.append('file', compressedBlob, file.name)
      
      const result = await uploadShopImageAction(formData, impersonateShopId)
      
      if (!result.success || !result.publicUrl) {
        throw new Error(result.message || 'アップロードに失敗しました')
      }

      const publicUrl = result.publicUrl

      if (type === 'thumbnail') {
        setThumbnailUrl(publicUrl)
        await updateShopImages(user.id, publicUrl, undefined, impersonateShopId)
      } else {
        const newGallery = [...galleryUrls, publicUrl]
        setGalleryUrls(newGallery)
        await updateShopImages(user.id, undefined, newGallery, impersonateShopId)
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      alert('アップロードに失敗しました: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const removeGalleryImage = async (index: number) => {
    if (!user) return
    const newGallery = [...galleryUrls]
    newGallery.splice(index, 1)
    setGalleryUrls(newGallery)
    await updateShopImages(user.id, undefined, newGallery, impersonateShopId)
  }

  // Menu Handlers
  const handleSaveMenuItem = async (item: any, file?: File) => {
    if (!user) return
    
    // Upload image if selected
    if (file) {
       try {
         const formData = new FormData()
         formData.append('file', await compressImage(file), file.name)
         const uploadRes = await uploadMenuImageAction(formData, impersonateShopId)
         
         if (uploadRes.success && uploadRes.publicUrl) {
            item.image_url = uploadRes.publicUrl
         } else {
            alert('画像アップロードに失敗しましたが、テキストのみ保存を試みます')
         }
       } catch (e) {
         console.error(e)
         alert('画像処理エラー')
       }
    }

    const { success } = await upsertMenuItem(user.id, item, impersonateShopId)
    if (success) {
      // Refresh menu
      const { success: fetchSuccess, data } = await getMenuItems(user.id, impersonateShopId)
      if (fetchSuccess && data) setMenuItems(data)
      setEditingItem(null)
    } else {
      alert('保存に失敗しました')
    }
  }

  const handleDeleteMenuItem = async (id: string) => {
    if (!user || !confirm('本当に削除しますか？')) return
    
    const { success } = await deleteMenuItem(user.id, id, impersonateShopId)
    if (success) {
      const { success: fetchSuccess, data } = await getMenuItems(user.id, impersonateShopId)
      if (fetchSuccess && data) setMenuItems(data)
    } else {
      alert('削除に失敗しました')
    }
  }

  if (!user) {
    return <div className="p-8 text-center">ログインが必要です</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
      {/* ヘッダー */}
      <div className="bg-white p-4 flex items-center shadow-sm sticky top-0 z-20">
        <Link href={impersonateShopId ? "/admin" : "/shop/dashboard"} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="flex-1 text-center font-bold text-gray-800 mr-8">店舗設定{impersonateShopId && ' (代理編集)'}</h1>
      </div>

      {impersonateShopId && (
        <div className="bg-red-50 border-b border-red-200 p-3 flex items-center justify-center gap-2 text-red-700 font-bold text-sm">
          <ShieldAlert size={18} />
          管理者として {shopName ? `[${shopName}]` : `(Shop ID: ${impersonateShopId})`} を編集中
        </div>
      )}

      <div className="flex-1 p-4 max-w-2xl mx-auto w-full space-y-6">
        
        {/* --- 1. 写真管理 (優先) --- */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
            <ImageIcon className="text-pink-500" />
            写真設定
          </h2>
          
          <div className="space-y-6">
            {/* サムネイル */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">サムネイル画像 (一覧表示用)</label>
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-24 bg-gray-100 rounded-xl overflow-hidden border">
                  {thumbnailUrl ? (
                    <Image src={thumbnailUrl} alt="Thumbnail" fill className="object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <Store size={32} />
                    </div>
                  )}
                </div>
                <label className="cursor-pointer bg-white border border-gray-300 text-gray-700 font-bold py-2 px-4 rounded-xl hover:bg-gray-50 transition-colors">
                  {uploading ? <Loader2 className="animate-spin" /> : '画像を選択'}
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'thumbnail')} disabled={uploading} />
                </label>
              </div>
            </div>

            {/* ギャラリー */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">ギャラリー画像 (詳細ページ用)</label>
              <div className="grid grid-cols-3 gap-2">
                {galleryUrls.map((url, index) => (
                  <div key={index} className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden border group">
                    <Image src={url} alt={`Gallery ${index}`} fill className="object-cover" />
                    <button 
                      onClick={() => removeGalleryImage(index)}
                      className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <label className="cursor-pointer aspect-square bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-100 hover:border-gray-400 transition-colors">
                  <Plus size={24} />
                  <span className="text-xs font-bold mt-1">追加</span>
                  <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => {
                    if (e.target.files) {
                      Array.from(e.target.files).forEach(file => handleImageUpload(file, 'gallery'))
                    }
                  }} disabled={uploading} />
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* --- 1.2. 営業時間設定 --- */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
            <Clock className="text-blue-500" />
            営業時間設定
          </h2>
          
          <form onSubmit={handleSaveOpeningHours} className="space-y-4">
            <div className="space-y-3">
              {[
                { key: 'mon', label: '月曜日' },
                { key: 'tue', label: '火曜日' },
                { key: 'wed', label: '水曜日' },
                { key: 'thu', label: '木曜日' },
                { key: 'fri', label: '金曜日' },
                { key: 'sat', label: '土曜日' },
                { key: 'sun', label: '日曜日' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="font-bold text-gray-700 w-20">{label}</div>
                  <div className="flex items-center gap-2 flex-1 justify-end">
                     <label className="flex items-center gap-2 text-sm text-gray-600 mr-4 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={openingHours[key]?.is_closed || false}
                          onChange={(e) => setOpeningHours({
                            ...openingHours,
                            [key]: { ...openingHours[key], is_closed: e.target.checked }
                          })}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        定休日
                     </label>

                     {!openingHours[key]?.is_closed && (
                       <>
                         <input 
                           type="time" 
                           value={openingHours[key]?.open || ''}
                           onChange={(e) => setOpeningHours({
                             ...openingHours,
                             [key]: { ...openingHours[key], open: e.target.value }
                           })}
                           className="p-2 border border-gray-200 rounded-lg text-sm bg-white"
                         />
                         <span className="text-gray-400">-</span>
                         <input 
                           type="time" 
                           value={openingHours[key]?.close || ''}
                           onChange={(e) => setOpeningHours({
                             ...openingHours,
                             [key]: { ...openingHours[key], close: e.target.value }
                           })}
                           className="p-2 border border-gray-200 rounded-lg text-sm bg-white"
                         />
                       </>
                     )}
                     {openingHours[key]?.is_closed && (
                        <div className="text-sm text-gray-400 font-bold px-4 py-2 bg-gray-100 rounded-lg">
                           CLOSE
                        </div>
                     )}
                  </div>
                </div>
              ))}
            </div>

            <button 
              type="submit" 
              disabled={saving}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
              営業時間を保存
            </button>
          </form>
        </section>

        {/* --- 1.5. スタンプカード設定 --- */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
            <Stamp className="text-purple-500" />
            スタンプカード設定
          </h2>
          
          <form onSubmit={handleSaveStampSettings} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">スタンプ目標数 (特典獲得に必要な数)</label>
              <select 
                value={stampTargetCount} 
                onChange={(e) => setStampTargetCount(Number(e.target.value))}
                className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
              >
                <option value={5}>5個</option>
                <option value={10}>10個</option>
                <option value={15}>15個</option>
                <option value={20}>20個</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">特典内容 (10個貯まった時のプレゼント)</label>
              <input 
                type="text" 
                value={stampRewardDescription} 
                onChange={(e) => setStampRewardDescription(e.target.value)}
                placeholder="例: お好きなドリンク1杯無料、500円割引チケットなど"
                className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={saving}
              className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl shadow-md hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
              設定を保存
            </button>
          </form>
        </section>

        {/* --- 2. メニュー管理 (優先) --- */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
              <Utensils className="text-orange-500" />
              メニュー設定
            </h2>
            <button 
              onClick={() => setEditingItem({})} // Empty object for new item
              className="text-sm bg-orange-50 text-orange-600 px-3 py-1 rounded-full font-bold hover:bg-orange-100"
            >
              + 追加
            </button>
          </div>

          <div className="space-y-3">
            {menuItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <div className="font-bold text-gray-800">{item.name}</div>
                  <div className="text-sm text-gray-500">¥{item.price?.toLocaleString()}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingItem(item)} className="p-2 text-gray-500 hover:bg-white rounded-lg"><Store size={16} /></button>
                  <button onClick={() => handleDeleteMenuItem(item.id)} className="p-2 text-red-500 hover:bg-white rounded-lg"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
            {menuItems.length === 0 && <p className="text-center text-gray-400 text-sm py-4">メニューが登録されていません</p>}
          </div>

          {/* Menu Edit Modal (Inline for simplicity) */}
          {editingItem && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                <h3 className="font-bold text-lg mb-4">{editingItem.id ? 'メニュー編集' : 'メニュー追加'}</h3>
                <form onSubmit={(e) => {
                  e.preventDefault()
                  const formData = new FormData(e.currentTarget)
                  const file = formData.get('image') as File
                  
                  handleSaveMenuItem({
                    id: editingItem.id, // undefined for new
                    name: formData.get('name'),
                    price: Number(formData.get('price')),
                    description: formData.get('description'),
                    category: 'other', // Default or select
                    sort_order: 0,
                    image_url: editingItem.image_url // Preserve existing if no new file
                  }, file.size > 0 ? file : undefined)
                }} className="space-y-4">
                  <div className="flex justify-center mb-4">
                    <div className="h-32 w-32 bg-gray-100 rounded-lg relative overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400"><ImageIcon /></div>
                      {editingItem.image_url && (
                        <img 
                          src={editingItem.image_url} 
                          alt="Menu" 
                          className="absolute inset-0 w-full h-full object-cover z-10" 
                          onError={(e) => e.currentTarget.style.display = 'none'}
                        />
                      )}
                    </div>
                  </div>
                  <input type="file" name="image" accept="image/*" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100" />
                  <input name="name" defaultValue={editingItem.name} placeholder="商品名" required className="w-full p-3 bg-gray-50 rounded-xl" />
                  <input name="price" type="number" defaultValue={editingItem.price} placeholder="価格" required className="w-full p-3 bg-gray-50 rounded-xl" />
                  <textarea name="description" defaultValue={editingItem.description} placeholder="説明" className="w-full p-3 bg-gray-50 rounded-xl" />
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setEditingItem(null)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">キャンセル</button>
                    <button type="submit" className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold">保存</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </section>

        {/* --- 3. 基本情報 --- */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
           <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
             <Store className="text-blue-600" />
             店舗基本情報
           </h2>
           
           {loading ? (
             <div className="flex justify-center py-8">
               <Loader2 className="animate-spin text-gray-400" />
             </div>
           ) : (
             <form onSubmit={handleSaveShopInfo} className="space-y-6">
               <div className="space-y-4">
                 <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">店舗名 {isAdmin ? '(編集可能)' : '(変更不可)'}</label>
                   <input 
                     type="text" 
                     value={shopName} 
                     onChange={(e) => setShopName(e.target.value)}
                     readOnly={!isAdmin} 
                     className={`w-full p-3 border border-gray-200 rounded-xl ${!isAdmin ? 'bg-gray-100 text-gray-500' : 'bg-gray-50'}`} 
                   />
                 </div>

                 <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">住所 {isAdmin ? '(編集可能)' : '(変更不可)'}</label>
                   <input 
                     type="text" 
                     value={address} 
                     onChange={(e) => setAddress(e.target.value)}
                     readOnly={!isAdmin} 
                     className={`w-full p-3 border border-gray-200 rounded-xl ${!isAdmin ? 'bg-gray-100 text-gray-500' : 'bg-gray-50'}`} 
                   />
                   {!isAdmin ? (
                     <p className="text-xs text-red-500 mt-1">※住所変更は運営にお問い合わせください</p>
                   ) : (
                     <p className="text-xs text-green-600 mt-1 font-bold">※管理者権限で編集中：住所・店舗名の変更が可能です</p>
                   )}
                 </div>
                 
                 <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">ジャンル設定</label>
                   <div className="space-y-3">
                     <select 
                       value={categoryMain} 
                       onChange={(e) => setCategoryMain(e.target.value)}
                       className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl appearance-none"
                     >
                       <option value="">メインジャンルを選択</option>
                       {CATEGORY_MAIN_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                     </select>
                     
                     <input 
                       type="text" 
                       value={categorySub} 
                       onChange={(e) => setCategorySub(e.target.value)}
                       placeholder="サブジャンル (例: オムライス専門店)" 
                       className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl"
                     />
                     
                     <select 
                       value={mealType} 
                       onChange={(e) => setMealType(e.target.value)}
                       className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl appearance-none"
                     >
                       <option value="">食事タイプを選択</option>
                       {MEAL_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                     </select>

                     <div className="relative">
                       <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                       <select 
                         value={priceRange} 
                         onChange={(e) => setPriceRange(e.target.value)}
                         className="w-full p-3 pl-10 bg-gray-50 border border-gray-200 rounded-xl appearance-none"
                       >
                         <option value="">予算を選択</option>
                         {PRICE_RANGE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                       </select>
                     </div>
                   </div>
                 </div>

                 <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">お客様問い合わせ用電話番号（一般公開）</label>
                   <input 
                     type="tel" 
                     value={phone} 
                     onChange={(e) => setPhone(e.target.value)} 
                     className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" 
                     placeholder="0749-xx-xxxx" 
                   />
                   <p className="text-xs text-blue-500 mt-1">※この番号はアプリ上でユーザーに公開されます</p>
                 </div>

                 <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">オーナー連絡先（非公開）</label>
                   <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" placeholder="090-xxxx-xxxx" />
                 </div>

                 <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                     <Lock size={14} /> 決済パスワード (4桁)
                   </label>
                   <input type="password" maxLength={4} value={transactionPassword} onChange={(e) => setTransactionPassword(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-mono text-lg tracking-widest" placeholder="****" />
                 </div>
               </div>

               {message && !message.text.includes('口座') && (
                 <div className={`p-3 rounded-xl text-sm font-bold ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                   {message.text}
                 </div>
               )}

               <button
                 type="submit"
                 disabled={saving}
                 className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
               >
                 {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                 店舗情報を保存
               </button>
             </form>
           )}
        </section>

        {/* --- 4. 銀行口座情報 --- */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
           <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
             <CreditCard className="text-green-600" />
             振込先口座情報
           </h2>
           
           <form onSubmit={handleSaveBankInfo} className="space-y-6">
               {/* Shop ID Debug/Hidden Input */}
               <input type="hidden" name="impersonateShopId" value={impersonateShopId || currentShopId || ''} />
               <input type="hidden" id="force-shop-id-value" value={currentShopId || ''} />
             <div className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                 <input value={bankInfo.bankName} onChange={(e) => setBankInfo({...bankInfo, bankName: e.target.value})} placeholder="銀行名" className="p-3 bg-gray-50 border rounded-xl" />
                 <input value={bankInfo.branchName} onChange={(e) => setBankInfo({...bankInfo, branchName: e.target.value})} placeholder="支店名" className="p-3 bg-gray-50 border rounded-xl" />
               </div>
               <div className="grid grid-cols-3 gap-4">
                 <select value={bankInfo.accountType} onChange={(e) => setBankInfo({...bankInfo, accountType: e.target.value as any})} className="p-3 bg-gray-50 border rounded-xl">
                   <option value="ordinary">普通</option>
                   <option value="current">当座</option>
                 </select>
                 <input value={bankInfo.accountNumber} onChange={(e) => setBankInfo({...bankInfo, accountNumber: e.target.value})} placeholder="口座番号" className="col-span-2 p-3 bg-gray-50 border rounded-xl" />
               </div>
               <input value={bankInfo.accountHolder} onChange={(e) => setBankInfo({...bankInfo, accountHolder: e.target.value})} placeholder="口座名義 (カタカナ)" className="w-full p-3 bg-gray-50 border rounded-xl" />
             </div>

             {message && message.text.includes('口座') && (
               <div className={`p-3 rounded-xl text-sm font-bold ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                 {message.text}
               </div>
             )}

             <button
               type="submit"
               disabled={savingBank}
               className="w-full bg-green-600 text-white font-bold py-4 rounded-xl hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
             >
               {savingBank ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
               口座情報を保存
             </button>
           </form>
        </section>

      </div>
    </div>
  )
}

export default function ShopSettingsMenuPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="animate-spin text-gray-400" />
      </div>
    }>
      <ShopSettingsContent />
    </Suspense>
  )
}
