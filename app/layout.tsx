export const dynamic = 'force-static'
export const fetchCache = 'force-no-store'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'
import ShopStaffHeader from '@/components/shop/ShopStaffHeader'
import AppUrlListener from '@/components/AppUrlListener'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 pb-20" suppressHydrationWarning={true}>
        <AppUrlListener />
        {/* 認証プロバイダーでアプリ全体をラップ */}
        <AuthProvider>
          {/* 店舗スタッフ用ヘッダー（一般画面閲覧時のみ表示） */}
          <ShopStaffHeader />
          {/* メインコンテンツ */}
          {/* ボトムナビゲーションは各ページで個別に呼び出し（onNavigateプロパティ対応のため） */}
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  )
}
