'use client'

import { Shop } from '@/lib/supabase'
import { X } from 'lucide-react'

interface ShopFiltersProps {
  shops: Shop[]
  selectedCategory: string | null
  showOpenOnly: boolean
  hideClosed: boolean
  onCategoryChange: (category: string | null) => void
  onShowOpenOnlyChange: (show: boolean) => void
  onHideClosedChange: (hide: boolean) => void
}

export default function ShopFilters({
  shops,
  selectedCategory,
  showOpenOnly,
  hideClosed,
  onCategoryChange,
  onShowOpenOnlyChange,
  onHideClosedChange,
}: ShopFiltersProps) {
  // ユニークなカテゴリを取得
  const categories = Array.from(
    new Set(shops.map((shop) => shop.category_main).filter(Boolean))
  ).sort() as string[]

  const hasActiveFilters = selectedCategory !== null || showOpenOnly || hideClosed

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      {/* ジャンルフィルター */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">ジャンル</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onCategoryChange(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === null
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            すべて
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => onCategoryChange(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* チェックボックスフィルター */}
      <div className="space-y-3">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={showOpenOnly}
            onChange={(e) => onShowOpenOnlyChange(e.target.checked)}
            className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
          />
          <span className="ml-2 text-sm text-gray-700">現在営業中のみ表示</span>
        </label>

        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={hideClosed}
            onChange={(e) => onHideClosedChange(e.target.checked)}
            className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
          />
          <span className="ml-2 text-sm text-gray-700">臨時休業を除外</span>
        </label>
      </div>

      {/* フィルターリセットボタン */}
      {hasActiveFilters && (
        <button
          onClick={() => {
            onCategoryChange(null)
            onShowOpenOnlyChange(false)
            onHideClosedChange(false)
          }}
          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
        >
          <X className="w-4 h-4" />
          フィルターをリセット
        </button>
      )}
    </div>
  )
}
