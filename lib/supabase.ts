import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL as string
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string

try {
  const maskedKey = SUPABASE_ANON_KEY ? `${SUPABASE_ANON_KEY.slice(0, 6)}...len${SUPABASE_ANON_KEY.length}` : 'undefined'
  // eslint-disable-next-line no-console
  console.log('[Supabase] init', { url: SUPABASE_URL, anonKey: maskedKey })
} catch {}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})
