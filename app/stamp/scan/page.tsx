import { Suspense } from 'react'
import ScanContent from './ScanContent'

export default function StampScanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
        <p className="text-gray-500">読み込み中...</p>
      </div>
    }>
      <ScanContent />
    </Suspense>
  )
}
