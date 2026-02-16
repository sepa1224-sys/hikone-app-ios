/**
 * ギフト交換先マスター
 * ユーザーが選択できる交換先のリスト
 */
export interface GiftExchangeType {
  id: string
  name: string
  description: string
  icon: string // 絵文字またはアイコン名
  color: string // Tailwind CSS の色クラス
  minPoints: number // 最低交換ポイント
  available: boolean // 利用可能かどうか
  options?: GiftExchangeOption[] // 金額別オプション
}

/**
 * 交換オプション（金額別）
 */
export interface GiftExchangeOption {
  id: string
  name: string // 例: "500円分"
  points: number // 必要なポイント数
  yenAmount: number // 円換算（表示用）
}

export const GIFT_EXCHANGE_TYPES: GiftExchangeType[] = [
  {
    id: 'amazon',
    name: 'Amazonギフト券',
    description: 'Amazonで使えるギフト券',
    icon: '📦',
    color: 'from-orange-500 to-orange-600',
    minPoints: 500,
    available: true,
    options: [
      { id: 'amazon_500', name: '500円分', points: 500, yenAmount: 500 },
      { id: 'amazon_1000', name: '1000円分', points: 1000, yenAmount: 1000 }
    ]
  },
  {
    id: 'starbucks',
    name: 'スターバックス',
    description: 'スターバックスで使えるギフト券',
    icon: '☕',
    color: 'from-green-600 to-green-700',
    minPoints: 500,
    available: true,
    options: [
      { id: 'starbucks_500', name: '500円分', points: 500, yenAmount: 500 }
    ]
  },
  {
    id: 'paypay',
    name: 'PayPay残高',
    description: 'PayPayアカウントにチャージ',
    icon: '💳',
    color: 'from-blue-500 to-blue-600',
    minPoints: 1000,
    available: true,
    options: [
      { id: 'paypay_1000', name: '1000円分', points: 1000, yenAmount: 1000 }
    ]
  },
  {
    id: 'local_restaurant',
    name: '地元飲食店',
    description: '彦根市内の飲食店で使えるクーポン',
    icon: '🍜',
    color: 'from-red-500 to-red-600',
    minPoints: 500,
    available: true,
    options: [
      { id: 'local_500', name: '500円分', points: 500, yenAmount: 500 }
    ]
  },
  {
    id: 'seven_eleven',
    name: 'セブン-イレブン',
    description: 'セブン-イレブンで使えるギフト券',
    icon: '🏪',
    color: 'from-green-500 to-green-600',
    minPoints: 500,
    available: true,
    options: [
      { id: 'seven_500', name: '500円分', points: 500, yenAmount: 500 }
    ]
  },
  {
    id: 'itunes',
    name: 'iTunes/App Store',
    description: 'App Storeで使えるギフトカード',
    icon: '🎵',
    color: 'from-pink-500 to-pink-600',
    minPoints: 1000,
    available: true,
    options: [
      { id: 'itunes_1000', name: '1000円分', points: 1000, yenAmount: 1000 }
    ]
  }
]

/**
 * 交換先IDから交換先情報を取得
 */
export function getGiftExchangeType(id: string): GiftExchangeType | undefined {
  return GIFT_EXCHANGE_TYPES.find(type => type.id === id)
}

/**
 * 利用可能な交換先のみを取得
 */
export function getAvailableGiftExchangeTypes(): GiftExchangeType[] {
  return GIFT_EXCHANGE_TYPES.filter(type => type.available)
}
