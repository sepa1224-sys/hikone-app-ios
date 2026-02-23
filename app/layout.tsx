'use client'
import '@/lib/firebase'
export const dynamic = 'force-static'
export const fetchCache = 'force-no-store'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'
import ShopStaffHeader from '@/components/shop/ShopStaffHeader'
import { useEffect, useState } from 'react'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  return (
    <html lang="ja" suppressHydrationWarning={true}>
      <body className="bg-gray-50 pb-20" suppressHydrationWarning={true}>
        {mounted ? (
          <AuthProvider>
            <ShopStaffHeader />
            <main>{children}</main>
          </AuthProvider>
        ) : null}
      </body>
    </html>
  )
}
