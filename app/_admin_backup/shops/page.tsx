'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import { getAdminShops, generateInvitationCode } from '@/lib/actions/admin'
import { Loader2, AlertCircle, ChevronLeft, Key, Check, Edit } from 'lucide-react'

export default function AdminShopsPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const [shops, setShops] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [generatedCodes, setGeneratedCodes] = useState<{[key: string]: string}>({})

  useEffect(() => {
    if (user) {
      fetchShops()
    }
  }, [user])

  const fetchShops = async () => {
    setLoading(true)
    try {
      const res = await getAdminShops()
      if (res.success) {
        setShops(res.shops || [])
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateCode = async (shopId: string) => {
    setGeneratingId(shopId)
    try {
      const res = await generateInvitationCode(shopId)
      if (res.success && res.code) {
        setGeneratedCodes(prev => ({ ...prev, [shopId]: res.code }))
      } else {
        alert('コード生成に失敗しました')
      }
    } catch (error) {
      console.error(error)
      alert('エラーが発生しました')
    } finally {
      setGeneratingId(null)
    }
  }

  if (authLoading) {
    return <div className="flex justify-center items-center min-h-screen"><Loader2 className="animate-spin" /></div>
  }

  // 管理者チェック
  if (!user || !profile?.is_admin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <AlertCircle className="text-red-500 mb-4" size={48} />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">アクセス権限がありません</h1>
        <p className="text-gray-600 mb-4">このページは管理者専用です。</p>
        <Link href="/" className="text-blue-600 hover:underline">トップページへ戻る</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/admin" className="inline-flex items-center text-gray-500 hover:text-gray-900 transition-colors">
            <ChevronLeft size={20} />
            <span className="font-bold">ダッシュボードに戻る</span>
          </Link>
        </div>

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">店舗管理・招待コード発行</h1>
          <button 
            onClick={fetchShops} 
            className="text-sm text-blue-600 hover:underline"
          >
            再読み込み
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin text-gray-400" />
          </div>
        ) : shops.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-500 shadow-sm">
            <p>登録されている店舗がありません</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 font-medium text-gray-600">店舗名</th>
                  <th className="p-4 font-medium text-gray-600">オーナーID</th>
                  <th className="p-4 font-medium text-gray-600">招待コード</th>
                  <th className="p-4 font-medium text-gray-600">アクション</th>
                </tr>
              </thead>
              <tbody>
                {shops.map((shop) => (
                  <tr key={shop.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{shop.name}</div>
                      <div className="text-xs text-gray-400 font-mono">{shop.id}</div>
                    </td>
                    <td className="p-4">
                      {shop.owner_id ? (
                        <div className="flex items-center text-green-600 text-sm">
                          <CheckCircleIcon size={16} className="mr-1" />
                          <span>紐付け済み</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">未設定</span>
                      )}
                      {shop.owner_id && (
                        <div className="text-xs text-gray-400 font-mono mt-1 truncate w-24">
                          {shop.owner_id}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      {generatedCodes[shop.id] ? (
                        <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded font-mono text-lg font-bold inline-block border border-blue-100">
                          {generatedCodes[shop.id]}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/shops/${shop.id}`}
                          className="flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                        >
                          <Edit size={16} className="mr-1" />
                          編集・代理
                        </Link>
                        <button
                          onClick={() => handleGenerateCode(shop.id)}
                          disabled={generatingId === shop.id}
                          className="flex items-center px-3 py-1.5 bg-gray-800 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50 transition-colors"
                        >
                          {generatingId === shop.id ? (
                            <Loader2 size={16} className="animate-spin mr-1" />
                          ) : (
                            <Key size={16} className="mr-1" />
                          )}
                          招待
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function CheckCircleIcon({ size, className }: { size: number, className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  )
}
