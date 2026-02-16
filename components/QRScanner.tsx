'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Camera, X, Loader2, QrCode, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'

interface QRScannerProps {
  onScanSuccess: (referralCode: string) => void
  onClose: () => void
  title?: string
  instruction?: string
}

export default function QRScanner({ onScanSuccess, onClose, title = 'QRスキャン', instruction = '相手のQRコードを枠内に入れてください' }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 成功時のフィードバック
  const playSuccessFeedback = useCallback(() => {
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100])
    }
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator1 = audioContext.createOscillator()
      const gainNode1 = audioContext.createGain()
      oscillator1.connect(gainNode1)
      gainNode1.connect(audioContext.destination)
      oscillator1.frequency.value = 880
      oscillator1.type = 'sine'
      gainNode1.gain.value = 0.3
      oscillator1.start()
      oscillator1.stop(audioContext.currentTime + 0.1)
      
      setTimeout(() => {
        const oscillator2 = audioContext.createOscillator()
        const gainNode2 = audioContext.createGain()
        oscillator2.connect(gainNode2)
        gainNode2.connect(audioContext.destination)
        oscillator2.frequency.value = 1047
        oscillator2.type = 'sine'
        gainNode2.gain.value = 0.3
        oscillator2.start()
        oscillator2.stop(audioContext.currentTime + 0.15)
      }, 120)
    } catch (e) {
      console.log('Audio not supported')
    }
  }, [])

  // QRコードから招待コードを抽出
  const extractReferralCode = useCallback((qrData: string): string | null => {
    if (!qrData) return null
    const cleaned = qrData.replace(/\s/g, '') // 全ての空白 改行を除去
    
    if (cleaned.startsWith('hikopo:')) {
      const code = cleaned.replace('hikopo:', '').toUpperCase()
      if (/^[A-Z0-9]{8,12}$/.test(code)) {
        return code
      }
    }
    
    const code = cleaned.toUpperCase()
    if (/^[A-Z0-9]{8,12}$/.test(code)) {
      return code
    }
    
    return null
  }, [])

  // スキャナーの停止
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop()
        }
        scannerRef.current = null
      } catch (e) {
        console.error('Stop scanner error:', e)
      }
    }
    setIsScanning(false)
  }, [])

  // スキャン成功時の処理
  const handleScanSuccess = useCallback(async (decodedText: string) => {
    const referralCode = extractReferralCode(decodedText)
    
    if (referralCode) {
      // スキャン停止
      await stopScanner()
      
      // フィードバック
      playSuccessFeedback()
      setSuccess(`コードを読み取りました: ${referralCode}`)
      
      // 少し待ってからコールバック
      setTimeout(() => {
        onScanSuccess(referralCode)
      }, 800)
    }
  }, [extractReferralCode, playSuccessFeedback, onScanSuccess, stopScanner])

  // スキャナーの開始
  const startScanner = useCallback(async () => {
    if (!containerRef.current) return
    
    // 既存のスキャナーを停止
    await stopScanner()
    
    setError(null)
    setIsScanning(true)
    
    try {
      const scanner = new Html5Qrcode('qr-reader', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false
      })
      scannerRef.current = scanner
      
      await scanner.start(
        { facingMode: facingMode },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1
        },
        handleScanSuccess,
        () => {}
      )
      setHasPermission(true)
    } catch (err: any) {
      console.error('Scanner error:', err)
      if (err.message?.includes('Permission')) {
        setError('カメラへのアクセスが許可されていません')
        setHasPermission(false)
      } else {
        setError('カメラの起動に失敗しました')
      }
      setIsScanning(false)
    }
  }, [handleScanSuccess, facingMode, stopScanner])

  // カメラの切り替え
  const toggleCamera = useCallback(() => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')
  }, [])

  // facingMode が変わったら再起動
  useEffect(() => {
    startScanner()
  }, [facingMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // コンポーネントマウント時にスキャン開始
  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [stopScanner])

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col">
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-4 bg-black/50">
        <div className="flex items-center gap-2 text-white">
          <QrCode size={24} />
          <span className="font-black">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* カメラ切り替えボタン */}
          <button
            onClick={toggleCamera}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
            title="カメラを切り替え"
          >
            <RefreshCw size={24} className="text-white" />
          </button>
          <button
            onClick={onClose}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
          >
            <X size={24} className="text-white" />
          </button>
        </div>
      </div>
      
      {/* スキャナーエリア */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {/* 成功表示 */}
        {success && (
          <div className="absolute inset-0 z-10 bg-black/80 flex items-center justify-center">
            <div className="bg-green-500 text-white p-6 rounded-3xl text-center animate-in zoom-in duration-200">
              <CheckCircle size={64} className="mx-auto mb-4" />
              <p className="text-lg font-black">{success}</p>
            </div>
          </div>
        )}
        
        {/* エラー表示 */}
        {error && (
          <div className="text-center mb-4">
            <div className="bg-red-500/20 text-red-400 p-4 rounded-2xl mb-4">
              <AlertCircle size={32} className="mx-auto mb-2" />
              <p className="font-bold">{error}</p>
            </div>
            <button
              onClick={startScanner}
              className="bg-white text-gray-800 px-6 py-3 rounded-xl font-black"
            >
              再試行
            </button>
          </div>
        )}
        
        {/* カメラプレビュー */}
        <div 
          ref={containerRef}
          className="relative w-full max-w-sm aspect-square rounded-3xl overflow-hidden bg-gray-900 shadow-2xl border-4 border-white/10"
        >
          <div id="qr-reader" className="w-full h-full" />
          
          {/* ローディング */}
          {isScanning && !error && hasPermission === null && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Loader2 size={48} className="animate-spin text-white" />
            </div>
          )}
          
          {/* スキャンガイド */}
          {isScanning && !error && hasPermission && (
            <div className="absolute inset-0 pointer-events-none">
              {/* コーナーガイド */}
              <div className="absolute top-[15%] left-[15%] w-12 h-12 border-t-4 border-l-4 border-red-500 rounded-tl-xl" />
              <div className="absolute top-[15%] right-[15%] w-12 h-12 border-t-4 border-r-4 border-red-500 rounded-tr-xl" />
              <div className="absolute bottom-[15%] left-[15%] w-12 h-12 border-b-4 border-l-4 border-red-500 rounded-bl-xl" />
              <div className="absolute bottom-[15%] right-[15%] w-12 h-12 border-b-4 border-r-4 border-red-500 rounded-br-xl" />
              
              {/* スキャンライン */}
              <div className="absolute top-[15%] left-[15%] right-[15%] h-0.5 bg-red-500 animate-pulse" 
                   style={{ animation: 'scanLine 2s ease-in-out infinite' }} />
            </div>
          )}
        </div>
        
        {/* 説明 */}
        <div className="mt-6 text-center">
          <p className="text-white font-bold mb-2">
            {instruction}
          </p>
          <p className="text-white/60 text-sm font-bold">
            {facingMode === 'environment' ? '背面カメラ使用中' : '前面カメラ使用中'}
          </p>
        </div>
      </div>
      
      {/* フッター */}
      <div className="p-4 bg-black/50">
        <button
          onClick={onClose}
          className="w-full py-4 bg-white/20 hover:bg-white/30 text-white rounded-2xl font-black transition-colors"
        >
          キャンセル
        </button>
      </div>
      
      {/* スキャンラインアニメーション用CSS */}
      <style jsx>{`
        @keyframes scanLine {
          0%, 100% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(250px); opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
