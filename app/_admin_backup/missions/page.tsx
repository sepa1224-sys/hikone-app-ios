'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, QrCode, Camera, Loader2, Calendar, ChevronLeft, ChevronRight, Printer } from 'lucide-react'
import QRCode from 'react-qr-code'
import { createMission, getMissions, deleteMission, Mission, MissionType } from '@/lib/actions/missions'

export default function AdminMissionsPage() {
  const router = useRouter()
  // 現在選択されている年月 (YYYY-MM)
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7))
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showQrPrint, setShowQrPrint] = useState(false)

  // フォームの状態
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    mission_type: 'qr' as MissionType,
    points: 100,
    month: currentMonth
  })

  // 月が変更されたらデータを再取得
  useEffect(() => {
    fetchMissions(currentMonth)
    // フォームの対象月も同期
    setFormData(prev => ({ ...prev, month: currentMonth }))
  }, [currentMonth])

  const fetchMissions = async (month: string) => {
    setLoading(true)
    const result = await getMissions(month)
    if (result.success && result.data) {
      setMissions(result.data)
    } else {
      alert(result.message)
    }
    setLoading(false)
  }

  const handleMonthChange = (offset: number) => {
    const [year, month] = currentMonth.split('-').map(Number)
    const date = new Date(year, month - 1 + offset, 1)
    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    setCurrentMonth(newMonth)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.month) {
      alert('タイトルと対象月は必須です')
      return
    }

    setSubmitting(true)
    const result = await createMission(formData)
    
    if (result.success) {
      // フォームリセット
      setFormData({
        title: '',
        description: '',
        mission_type: 'qr',
        points: 100,
        month: currentMonth // 現在の月に戻す
      })
      // 一覧更新
      fetchMissions(currentMonth)
      alert('ミッションを作成しました')
    } else {
      alert(`エラー: ${result.message}`)
    }
    setSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('本当に削除しますか？')) return

    const result = await deleteMission(id)
    if (result.success) {
      setMissions(missions.filter(m => m.id !== id))
    } else {
      alert(`削除エラー: ${result.message}`)
    }
  }

  if (showQrPrint) {
    const qrMissions = missions.filter(m => m.mission_type === 'qr')
    
    return (
      <div className="min-h-screen bg-white p-8">
        <style jsx global>{`
          @media print {
            @page { margin: 1cm; }
            body { -webkit-print-color-adjust: exact; }
            .no-print { display: none !important; }
          }
        `}</style>

        {/* Print Header */}
        <div className="no-print flex items-center justify-between mb-8 bg-gray-50 p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowQrPrint(false)}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">QRコード印刷プレビュー</h1>
              <p className="text-sm text-gray-500">QRミッション: {qrMissions.length}件</p>
            </div>
          </div>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-gray-800 transition-colors shadow-lg"
          >
            <Printer className="w-5 h-5" />
            印刷する
          </button>
        </div>

        {/* QR Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 print:grid-cols-2">
          {qrMissions.length === 0 ? (
            <div className="col-span-full text-center py-20 text-gray-400 font-bold">
              QRミッションがありません
            </div>
          ) : (
            qrMissions.map((mission) => (
              <div 
                key={mission.id} 
                className="break-inside-avoid border-2 border-gray-200 rounded-2xl p-6 flex flex-col items-center text-center bg-white"
              >
                <div className="mb-2 px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-500">
                  {mission.month}
                </div>
                
                <h2 className="text-xl font-black text-gray-900 mb-2 leading-tight min-h-[3rem] flex items-center justify-center">
                  {mission.title}
                </h2>
                
                <div className="flex items-center gap-1 text-amber-500 font-black mb-4 bg-amber-50 px-3 py-1 rounded-lg">
                  <span className="text-lg">{mission.points}</span>
                  <span className="text-xs">PT</span>
                </div>

                <div className="bg-white p-2 mb-4">
                  <QRCode 
                    value={mission.id} 
                    size={160}
                    level="H"
                  />
                </div>

                <div className="text-[10px] font-mono text-gray-400 break-all">
                  ID: {mission.id}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-gray-800">マンスリーミッション管理</h1>
          </div>
          <button
            onClick={() => setShowQrPrint(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" />
            QR印刷
          </button>
        </div>

        {/* 年月選択ナビゲーション */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-8 flex items-center justify-between">
          <button 
            onClick={() => handleMonthChange(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 flex items-center gap-2 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            前月
          </button>
          
          <div className="flex items-center gap-4">
            <Calendar className="w-6 h-6 text-blue-500" />
            <span className="text-2xl font-black text-gray-800">
              {currentMonth.split('-')[0]}年{currentMonth.split('-')[1]}月
            </span>
            <input 
              type="month" 
              value={currentMonth}
              onChange={(e) => setCurrentMonth(e.target.value)}
              className="ml-2 px-3 py-1 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <button 
            onClick={() => handleMonthChange(1)}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 flex items-center gap-2 transition-colors"
          >
            翌月
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左カラム: 新規登録フォーム */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-8">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-500" />
                新規ミッション登録
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    対象月 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="month"
                    value={formData.month}
                    onChange={(e) => setFormData({...formData, month: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    タイトル <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="例: 彦根城に行こう"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    説明
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="ミッションの詳細説明..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      タイプ
                    </label>
                    <select
                      value={formData.mission_type}
                      onChange={(e) => setFormData({...formData, mission_type: e.target.value as MissionType})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="qr">QRコード</option>
                      <option value="photo">写真投稿</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ポイント
                    </label>
                    <input
                      type="number"
                      value={formData.points}
                      onChange={(e) => setFormData({...formData, points: parseInt(e.target.value)})}
                      min="0"
                      step="10"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      登録中...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      登録する
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* 右カラム: ミッション一覧 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h2 className="font-bold text-gray-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  登録済みミッション
                </h2>
                <span className="text-sm text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                  全 {missions.length} 件
                </span>
              </div>

              {loading ? (
                <div className="p-12 flex justify-center items-center text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : missions.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  ミッションが登録されていません
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {missions.map((mission) => (
                    <div key={mission.id} className="p-4 hover:bg-gray-50 transition-colors group">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                              mission.mission_type === 'qr' 
                                ? 'bg-purple-50 text-purple-600 border-purple-100' 
                                : 'bg-pink-50 text-pink-600 border-pink-100'
                            }`}>
                              {mission.mission_type === 'qr' ? 'QRコード' : '写真投稿'}
                            </span>
                            <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 rounded">
                              {mission.month}
                            </span>
                            <span className="text-xs font-bold text-amber-500 flex items-center gap-0.5">
                              💰 {mission.points}pt
                            </span>
                          </div>
                          <h3 className="font-bold text-gray-800 mb-1">{mission.title}</h3>
                          {mission.description && (
                            <p className="text-sm text-gray-500 line-clamp-2">{mission.description}</p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDelete(mission.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="削除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
