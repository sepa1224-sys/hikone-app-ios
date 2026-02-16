'use client'

import { useState, useRef } from 'react'
import { Camera, Upload, Loader2, X, ScanLine } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { submitMission } from '@/lib/actions/mission-completion'
import imageCompression from 'browser-image-compression'
import QRScanner from '@/components/shop/QRScanner'

interface MissionActionProps {
  missionId: string
  userId: string
  onComplete: (success: boolean, message: string) => void
  disabled?: boolean
  missionType?: 'qr' | 'photo'
}

export default function MissionAction({ missionId, userId, onComplete, disabled = false, missionType = 'photo' }: MissionActionProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // QRスキャン処理
  const handleScan = async (decodedText: string) => {
    if (isUploading) return
    setIsScanning(false) // スキャン停止
    setIsUploading(true)

    try {
      console.log('🚀 [QR] スキャン成功:', decodedText)
      const result = await submitMission(userId, missionId, 'qr', decodedText)

      if (result.success) {
        onComplete(true, result.message)
        // 成功音
        const audio = new Audio('/cat-meow.mp3')
        audio.play().catch(e => console.log('音声再生失敗:', e))
      } else {
        alert(result.message || 'QRコードが無効です')
        onComplete(false, result.message)
      }
    } catch (error: any) {
      console.error('QR Submission Error:', error)
      alert('エラーが発生しました')
      onComplete(false, 'エラーが発生しました')
    } finally {
      setIsUploading(false)
    }
  }

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    let currentStep = '開始'

    try {
      // 1. 画像圧縮
      currentStep = '画像圧縮'
      console.log('🚀 [Upload] 1. 画像圧縮開始')
      const options = {
        maxSizeMB: 1, // 最大1MB
        maxWidthOrHeight: 1200, // 最大幅1200px
        useWebWorker: true
      }
      
      console.log('圧縮前サイズ:', file.size / 1024 / 1024, 'MB')
      const compressedFile = await imageCompression(file, options)
      console.log('圧縮後サイズ:', compressedFile.size / 1024 / 1024, 'MB')
      console.log('✅ [Upload] 1. 画像圧縮完了')

      // 2. Supabase Storageへアップロード
      currentStep = 'Storage保存'
      console.log('🚀 [Upload] 2. Storageアップロード開始')
      
      // ファイル名生成: ユーザーID/ミッションID_タイムスタンプ.拡張子
      const fileExt = file.name.split('.').pop() || 'jpg'
      const fileName = `${userId}/${missionId}_${Date.now()}.${fileExt}`

      alert('Storageに送信開始...')

      // タイムアウト付きのアップロード処理
      const uploadPromise = supabase.storage
        .from('mission-photos')
        .upload(fileName, compressedFile)
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT')), 120000) // 120秒に延長
      })

      const result: any = await Promise.race([uploadPromise, timeoutPromise])
      
      alert('Storage応答あり')

      // タイムアウトエラーの場合はここでキャッチされる
      if (result instanceof Error && result.message === 'TIMEOUT') {
        throw new Error('アップロードがタイムアウトしました。電波状況を確認してください')
      }

      const { data, error: uploadError } = result

      if (uploadError) {
        console.error('❌ [Upload] Storageアップロード失敗:', uploadError)
        throw new Error('Storage Upload Failed: ' + uploadError.message)
      }
      console.log('✅ [Upload] 2. Storageアップロード成功:', data)

      // 3. 公開URLの取得
      const { data: { publicUrl } } = supabase.storage
        .from('mission-photos')
        .getPublicUrl(fileName)
      
      console.log('🔗 [Upload] Public URL取得:', publicUrl)

      // 4. ミッション提出（ステータスは pending になる）
      currentStep = 'DB保存'
      console.log('🚀 [Upload] 3. DB保存（ミッション提出）開始')
      
      // 保存するデータの準備
      const insertPayload = {
        user_id: userId,
        mission_id: missionId,
        image_url: publicUrl,
        status: 'pending',
        reviewer_comment: null
      }
      
      console.log('📦 [Upload] DB保存ペイロード:', insertPayload)

      // 必須データのチェック
      if (!userId) throw new Error('User ID is missing')
      if (!missionId) throw new Error('Mission ID is missing')
      if (!publicUrl) throw new Error('Image URL is missing')

      // Server Action ではなくクライアントサイドで直接保存
      const { data: submissionData, error: submissionError } = await supabase
        .from('mission_submissions')
        .insert(insertPayload)
        .select()

      if (submissionError) {
        // 詳細なエラー情報をログ出力
        console.error('❌ [Upload] DB保存失敗詳細:', {
          message: submissionError.message,
          code: submissionError.code,
          details: submissionError.details,
          hint: submissionError.hint
        })
        
        // 既に提出済みのエラーだった場合
        if (submissionError.code === '23505' || submissionError.message?.includes('duplicate')) {
          alert('このミッションは既に提出済みです。画面を更新して状態を確認します。')
          window.location.reload()
          return
        }

        throw new Error(`DB Submission Failed: ${submissionError.message} (Code: ${submissionError.code})`)
      }

      console.log('✅ [Upload] 3. DB保存完了 結果:', submissionData)
      
      console.log('🎉 [Upload] 全工程完了: 成功')
      alert('報告が完了しました！審査結果をお待ちください。')
      
      // 成功時の処理
      setIsUploading(false)
      onComplete(true, '報告が完了しました！')
      
      // 画面をリロードせず、コールバックで状態更新を行う
      // window.location.reload()

    } catch (error: any) {
      console.error(`❌ [Upload] Error at step: ${currentStep}`, error)
      
      // タイムアウトエラーの特別扱い
      if (error.message === 'TIMEOUT' || error.message?.includes('タイムアウト')) {
        alert('アップロードがタイムアウトしました。電波状況を確認してください')
      } else {
        // 詳細なエラー表示
        const errorDetail = JSON.stringify(error, null, 2)
        console.error('❌ [Upload] 詳細エラー:', errorDetail)
        alert(`エラーが発生しました:\n${error.message || '不明なエラー'}`)
      }
      
      onComplete(false, '写真のアップロードに失敗しました')
    } finally {
      // 確実にローディング状態を解除
      console.log('🏁 [Upload] finallyブロック実行: setUploading(false)')
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  if (isScanning) {
    return (
      <div className="fixed inset-0 z-[10000] bg-black flex flex-col items-center justify-center p-4 animate-in fade-in">
        <div className="w-full max-w-md relative">
          <button 
            onClick={() => setIsScanning(false)}
            className="absolute -top-12 right-0 text-white bg-white/20 p-2 rounded-full backdrop-blur-md"
          >
            <X size={24} />
          </button>
          
          <div className="bg-white rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-4 bg-gray-900 text-white text-center">
              <p className="font-bold">QRコードをスキャン</p>
            </div>
            <div className="p-4">
              <QRScanner 
                onScan={handleScan}
                onError={(err) => console.log(err)}
              />
            </div>
            <div className="p-4 text-center bg-gray-50 text-xs font-bold text-gray-500">
              ミッションのQRコードを枠内に収めてください
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <input 
        type="file" 
        accept="image/*" 
        capture="environment"
        className="hidden" 
        ref={fileInputRef}
        onChange={handlePhotoSelect}
        disabled={isUploading || disabled}
      />
      
      {missionType === 'qr' ? (
        <button
          onClick={() => setIsScanning(true)}
          disabled={isUploading || disabled}
          className={`
            w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95
            ${disabled || isUploading 
              ? 'bg-gray-300 cursor-not-allowed' 
              : 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:shadow-xl'
            }
          `}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>処理中...</span>
            </>
          ) : (
            <>
              <ScanLine className="w-5 h-5" />
              <span>QRスキャンを開始</span>
            </>
          )}
        </button>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || disabled}
          className={`
            w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95
            ${disabled || isUploading 
              ? 'bg-gray-300 cursor-not-allowed' 
              : 'bg-gradient-to-r from-pink-500 to-rose-600 hover:shadow-xl'
            }
          `}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>アップロード中...</span>
            </>
          ) : (
            <>
              <Camera className="w-5 h-5" />
              <span>写真を撮影して報告</span>
            </>
          )}
        </button>
      )}
    </div>
  )
}
