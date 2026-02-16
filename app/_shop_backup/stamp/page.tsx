import { Suspense } from 'react'
import ShopStampContent from './ShopStampContent'

export default function ShopStampPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    }>
      <ShopStampContent />
    </Suspense>
  )
}
