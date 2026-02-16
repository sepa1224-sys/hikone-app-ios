'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  Camera, QrCode, ChevronLeft, UserCircle, Coins, 
  AlertCircle, Check, Loader2, Sparkles, Send, X,
  RefreshCw, ArrowRight, User, HelpCircle, Users, Scan
} from 'lucide-react'
import QRCode from 'react-qr-code'
import Barcode from 'react-barcode'
import { useAuth } from '@/components/AuthProvider'
import { usePoints } from '@/lib/hooks/usePoints'
import { sendHikopo, getReceiverInfo } from '@/lib/actions/transfer'
import QRScanner from '@/components/QRScanner'
import BottomNavigation from '@/components/BottomNavigation'

function PayPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user: authUser, profile: authProfile, loading: authLoading } = useAuth()
  const { points, isLoading: pointsLoading, refetch: refetchPoints } = usePoints(authUser?.id ?? null)

  const [mode, setMode] = useState<'scan' | 'my-qr'>('my-qr')
  const [showScanner, setShowScanner] = useState(false)
  const [receiverCode, setReceiverCode] = useState('')
  const [receiverPreview, setReceiverPreview] = useState<{
    found: boolean
    name?: string
    avatarUrl?: string
  } | null>(null)
  const [checkingReceiver, setCheckingReceiver] = useState(false)
  
  const [amount, setAmount] = useState('')
  const [paying, setPaying] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successAmount, setSuccessAmount] = useState('')
  const [successReceiver, setSuccessReceiver] = useState('')

  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      setMode('scan')
      const cleanedCode = code.trim().toUpperCase()
      setReceiverCode(cleanedCode)
      handleReceiverCheck(cleanedCode)
    }
  }, [searchParams])

  const handleReceiverCheck = async (code: string) => {
    if (code.length < 8) return
    setCheckingReceiver(true)
    try {
      const info = await getReceiverInfo(code)
      setReceiverPreview(info)
    } catch {
      setReceiverPreview({ found: false })
    } finally {
      setCheckingReceiver(false)
    }
  }

  const handleScanSuccess = (code: string) => {
    const cleanedCode = code.trim().toUpperCase()
    setReceiverCode(cleanedCode)
    setShowScanner(false)
    handleReceiverCheck(cleanedCode)
  }

  const handlePay = async () => {
    if (!authUser?.id || !receiverCode || !amount) return
    setPaying(true)
    setResult(null)
    setShowConfirm(false)
    try {
      const transferResult = await sendHikopo(authUser.id, receiverCode, parseInt(amount))
      setResult(transferResult)
      if (transferResult.success) {
        refetchPoints()
        const audio = new Audio('/cat-meow.mp3')
        audio.play().catch(e => console.log('音声再生に失敗しました:', e))
        setSuccessAmount(amount)
        setSuccessReceiver(receiverPreview?.name || '')
        setShowSuccess(true)
        setTimeout(() => router.push('/'), 5000)
      }
    } catch (error) {
      setResult({ success: false, message: '予期しないエラーが発生しました' })
    } finally {
      setPaying(false)
    }
  }

  if (authLoading) return null

  return (
    <div className="h-screen bg-[#ff8c42] flex flex-col overflow-hidden fixed inset-0">
      {/* ヘッダー - 高さを抑える */}
      <div className="px-4 py-1 flex items-center justify-between text-white shrink-0">
        <button onClick={() => router.back()} className="p-2"><X size={24} strokeWidth={3} /></button>
        <h1 className="text-base font-black tracking-wider">お支払い</h1>
        <button className="p-2"><HelpCircle size={24} strokeWidth={2} /></button>
      </div>

      <div className="flex-1 px-3 flex flex-col gap-3 overflow-hidden">
        {/* メインの支払いカード */}
        <div className="bg-white rounded-xl shadow-xl overflow-hidden flex flex-col shrink-0">
          {mode === 'my-qr' ? (
            <div className="p-3 flex flex-col items-center gap-3">
              {/* バーコード - さらに縮小 */}
              <div className="w-full flex justify-center py-0.5">
                <Barcode value={authProfile?.referral_code || 'HIKOPO'} width={1.5} height={45} displayValue={false} margin={0} />
              </div>
              {/* QRコード - 120pxに縮小 */}
              <div className="relative p-2.5 bg-white border-2 border-gray-100 rounded-xl">
                <QRCode value={`hikopo:${authProfile?.referral_code}`} size={120} level="M" fgColor="#000" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-7 h-7 bg-white rounded flex items-center justify-center border-2 border-[#ff8c42]"><span className="text-base">🐱</span></div>
                </div>
              </div>
              <div className="flex flex-col items-center -mt-1">
                <p className="text-[9px] text-gray-400 font-bold tracking-widest leading-none">招待コード</p>
                <p className="text-base font-black text-gray-800 tracking-widest leading-tight">{authProfile?.referral_code}</p>
              </div>
            </div>
          ) : (
            <div className="p-3">
              {!receiverCode ? (
                <div className="py-6 flex flex-col items-center gap-2 text-center">
                  <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center"><Scan size={28} className="text-[#ff8c42]" /></div>
                  <h2 className="text-sm font-black text-gray-800 leading-tight">QRコードをスキャン</h2>
                  <button onClick={() => setShowScanner(true)} className="mt-1 px-5 py-1.5 bg-[#ff8c42] text-white rounded-full font-black text-xs">カメラを起動</button>
                </div>
              ) : (
                <div className="space-y-3 animate-in slide-in-from-bottom duration-300">
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center"><User size={18} className="text-[#ff8c42]" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] text-gray-500 font-bold truncate">支払い先: {receiverPreview?.name}</p>
                    </div>
                    {receiverPreview?.found && <Check size={18} className="text-green-500" />}
                  </div>
                  <div className="text-center">
                    <div className="relative inline-block">
                      <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="w-24 bg-transparent text-3xl font-black text-center outline-none border-b-2 border-gray-100 focus:border-[#ff8c42] pb-0.5" />
                      <span className="text-base font-black text-gray-400 ml-1">pt</span>
                    </div>
                  </div>
                  <button onClick={() => setShowConfirm(true)} disabled={!receiverPreview?.found || !amount || parseInt(amount) <= 0 || paying || parseInt(amount) > points} className="w-full bg-[#ff8c42] text-white py-3 rounded-xl font-black text-base active:scale-95 transition-all disabled:bg-gray-200">
                    {paying ? <Loader2 className="animate-spin mx-auto" size={20} /> : '支払う'}
                  </button>
                </div>
              )}
            </div>
          )}
          {/* 残高表示 - 高さをさらに圧縮 */}
          <div className="bg-white border-t border-gray-50 p-2">
            <div className="flex items-center justify-between px-3 py-1.5 border rounded-lg border-gray-100 bg-gray-50/30">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-blue-100 rounded flex items-center justify-center"><Coins size={16} className="text-blue-500" /></div>
                <div><p className="text-[9px] text-gray-400 font-bold leading-none mb-0.5">残高</p><p className="text-xs font-black text-gray-800">ひこポ</p></div>
              </div>
              <p className="text-sm font-black text-gray-800">{pointsLoading ? '...' : points.toLocaleString()} pt</p>
            </div>
          </div>
          {/* バナー - 最小化 */}
          <div className="bg-[#fff9e6] py-1.5 flex items-center justify-center gap-2 px-4 shrink-0">
            <Sparkles size={10} className="text-[#d48806]" />
            <span className="text-[9px] font-black text-[#d48806]">最大1000円相当戻ってくる！</span>
          </div>
        </div>

        {/* 下部のメニュー - さらにコンパクトに */}
        <div className="grid grid-cols-2 gap-3 shrink-0 mb-2">
          <button onClick={() => router.push('/transfer')} className="flex flex-col items-center gap-1 text-white font-bold">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center border border-white/30"><Users size={24} /></div>
            <span className="text-[9px]">送金する</span>
          </button>
          <button onClick={() => { setMode('scan'); setShowScanner(true); }} className="flex flex-col items-center gap-1 text-white font-bold">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center border border-white/30"><Scan size={24} /></div>
            <span className="text-[9px]">スキャン</span>
          </button>
        </div>
      </div>

      {/* 支払い完了画面 - 修正なし */}
      {showSuccess && (
        <div className="fixed inset-0 z-[20000] bg-white flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-sm text-center space-y-6">
            <Check size={48} className="text-green-500 mx-auto" />
            <h2 className="text-2xl font-black">支払い完了</h2>
            <div className="bg-gray-50 rounded-2xl p-6 text-sm font-bold">
              <p>支払い先: {successReceiver}</p>
              <p className="text-2xl text-red-600 mt-2">{parseInt(successAmount).toLocaleString()} pt</p>
            </div>
            <button onClick={() => router.push('/')} className="w-full bg-gray-100 py-3 rounded-xl font-black">戻る</button>
          </div>
        </div>
      )}

      {/* 支払い確認モーダル */}
      {showConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm">
            <h3 className="text-lg font-black text-center">支払いの確認</h3>
            <p className="text-center text-sm font-bold my-4">{receiverPreview?.name}さんに<br/><span className="text-red-600 text-xl">{parseInt(amount).toLocaleString()} pt</span></p>
            <div className="flex flex-col gap-2">
              <button onClick={handlePay} className="w-full bg-[#ff8c42] text-white py-3 rounded-xl font-black">確定する</button>
              <button onClick={() => setShowConfirm(false)} className="w-full py-2 text-gray-400 font-bold text-xs">キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {showScanner && (
        <QRScanner title="スキャン" instruction="QRコードを読み取ってください" onScanSuccess={handleScanSuccess} onClose={() => setShowScanner(false)} />
      )}

      <div className="shrink-0"><BottomNavigation /></div>
    </div>
  )
}

export default function PayPage() {
  return (
    <Suspense fallback={null}>
      <TransferWrapper />
    </Suspense>
  )
}

function TransferWrapper() {
  return <PayPageContent />
}
