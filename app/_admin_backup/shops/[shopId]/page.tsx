'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getShopForAdmin, updateShopByAdmin } from '@/lib/actions/admin'
import { ArrowLeft, Save, Loader2, Store, QrCode, Lock, CreditCard, Phone, MapPin } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'

export default function AdminShopEditPage() {
  const params = useParams()
  const router = useRouter()
  const shopId = params.shopId as string
  const { user, profile } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null)

  // Shop Data
  const [shopName, setShopName] = useState('')
  const [address, setAddress] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  
  // Sensitive Data
  const [transactionPassword, setTransactionPassword] = useState('')
  
  // Bank Info
  const [bankInfo, setBankInfo] = useState({
    bankName: '',
    branchName: '',
    accountType: 'ordinary' as 'ordinary' | 'current',
    accountNumber: '',
    accountHolder: ''
  })

  useEffect(() => {
    async function fetchData() {
      if (!user) return

      try {
        setLoading(true)
        const res = await getShopForAdmin(shopId)
        
        if (!res.success) {
          setMessage({ type: 'error', text: res.message || 'データの取得に失敗しました' })
          return
        }

        if (res.shop) {
          setShopName(res.shop.name)
          setAddress(res.shop.address || '')
          setPhoneNumber(res.shop.phone_number || '')
        }

        if (res.ownerProfile) {
          setOwnerEmail(res.ownerProfile.email || '')
          setTransactionPassword(res.ownerProfile.transaction_password || '')
        }

        if (res.bankInfo) {
          setBankInfo({
            bankName: res.bankInfo.bank_name || '',
            branchName: res.bankInfo.branch_name || '',
            accountType: res.bankInfo.account_type || 'ordinary',
            accountNumber: res.bankInfo.account_number || '',
            accountHolder: res.bankInfo.account_holder || ''
          })
        }
      } catch (error) {
        console.error(error)
        setMessage({ type: 'error', text: '予期せぬエラーが発生しました' })
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [shopId, user])

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const res = await updateShopByAdmin(shopId, {
        phoneNumber,
        transactionPassword: transactionPassword || undefined,
        bankInfo
      })

      if (res.success) {
        setMessage({ type: 'success', text: '保存しました' })
      } else {
        setMessage({ type: 'error', text: res.message || '保存に失敗しました' })
      }
    } catch (error) {
      console.error(error)
      setMessage({ type: 'error', text: '予期せぬエラーが発生しました' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/admin/shops" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="font-bold text-gray-800">店舗情報編集 (Admin)</h1>
            <p className="text-xs text-gray-500">{shopName}</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          保存
        </button>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {message && (
          <div className={`p-4 rounded-xl text-sm font-bold ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
          }`}>
            {message.text}
          </div>
        )}

        {/* スタンプ・回数券プレースホルダー */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <QrCode className="text-purple-600" size={20} />
            <h2 className="font-bold text-gray-800">スタンプ・回数券設定</h2>
          </div>
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center bg-gray-50">
            <p className="text-gray-500 font-bold mb-2">QRコード生成機能</p>
            <p className="text-xs text-gray-400">ここにスタンプや回数券用のQRコード生成・印刷機能を実装予定です。</p>
            <button className="mt-4 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-600 shadow-sm opacity-50 cursor-not-allowed">
              QRコードを生成する
            </button>
          </div>
        </div>

        {/* 基本情報 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Store className="text-blue-600" size={20} />
            <h2 className="font-bold text-gray-800">基本情報</h2>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">店舗名（編集不可）</label>
            <input
              type="text"
              value={shopName}
              disabled
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-500 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">住所（編集不可）</label>
            <div className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-500">
              <MapPin size={16} className="shrink-0 mt-0.5" />
              <span className="text-sm font-bold">{address}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">オーナーEmail</label>
            <input
              type="text"
              value={ownerEmail}
              disabled
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-500 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">電話番号</label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-3.5 text-gray-400" />
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg p-3 pl-10 text-gray-800 font-bold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="03-1234-5678"
              />
            </div>
          </div>
        </div>

        {/* セキュリティ */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="text-red-500" size={20} />
            <h2 className="font-bold text-gray-800">セキュリティ設定</h2>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">決済用パスワード（4桁）</label>
            <input
              type="text"
              value={transactionPassword}
              onChange={(e) => setTransactionPassword(e.target.value)}
              maxLength={4}
              className="w-full bg-white border border-gray-200 rounded-lg p-3 text-gray-800 font-bold tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="1234"
            />
            <p className="text-xs text-red-500 mt-1 font-bold">※ 管理者が強制的に上書きします</p>
          </div>
        </div>

        {/* 銀行口座情報 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="text-green-600" size={20} />
            <h2 className="font-bold text-gray-800">振込先口座情報</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">銀行名</label>
              <input
                type="text"
                value={bankInfo.bankName}
                onChange={(e) => setBankInfo({ ...bankInfo, bankName: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded-lg p-3 text-gray-800 font-bold"
                placeholder="〇〇銀行"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">支店名</label>
              <input
                type="text"
                value={bankInfo.branchName}
                onChange={(e) => setBankInfo({ ...bankInfo, branchName: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded-lg p-3 text-gray-800 font-bold"
                placeholder="本店"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">口座種別</label>
              <select
                value={bankInfo.accountType}
                onChange={(e) => setBankInfo({ ...bankInfo, accountType: e.target.value as 'ordinary' | 'current' })}
                className="w-full bg-white border border-gray-200 rounded-lg p-3 text-gray-800 font-bold appearance-none"
              >
                <option value="ordinary">普通</option>
                <option value="current">当座</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">口座番号</label>
              <input
                type="text"
                value={bankInfo.accountNumber}
                onChange={(e) => setBankInfo({ ...bankInfo, accountNumber: e.target.value })}
                className="w-full bg-white border border-gray-200 rounded-lg p-3 text-gray-800 font-bold"
                placeholder="1234567"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">口座名義（カナ）</label>
            <input
              type="text"
              value={bankInfo.accountHolder}
              onChange={(e) => setBankInfo({ ...bankInfo, accountHolder: e.target.value })}
              className="w-full bg-white border border-gray-200 rounded-lg p-3 text-gray-800 font-bold"
              placeholder="ヤマダ タロウ"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
