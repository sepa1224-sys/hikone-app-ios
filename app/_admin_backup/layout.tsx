import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  // Admin Check
  let isAdmin = false

  // 1. Check Environment Variable
  if (process.env.ADMIN_EMAIL && user.email === process.env.ADMIN_EMAIL) {
    isAdmin = true
  } else {
    // 2. Check Database Role/Flag
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, role')
      .eq('id', user.id)
      .single()
    
    if (profile && (profile.is_admin === true || profile.role === 'admin')) {
      isAdmin = true
    }
  }

  if (!isAdmin) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Navigation (Optional, can be added here) */}
      <nav className="bg-gray-900 text-white p-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="font-black text-xl tracking-tight flex items-center gap-2">
            <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm">ADMIN</span>
            マスター管理画面
          </div>
          <div className="flex items-center gap-4 text-sm font-bold">
            <span>{user.email}</span>
            <form action="/auth/signout" method="post">
               {/* Logout button if needed, or just link back to app */}
            </form>
            <a href="/" className="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg transition-colors">
              アプリに戻る
            </a>
          </div>
        </div>
      </nav>
      
      <main>
        {children}
      </main>
    </div>
  )
}
