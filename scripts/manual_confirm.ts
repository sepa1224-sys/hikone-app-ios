
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Load .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8')
  envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=')
    if (key && value) {
      process.env[key.trim()] = value.trim()
    }
  })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const email = process.argv[2] || 'taturo.information+shopA@gmail.com'

async function confirmUser() {
  console.log(`Confirming user: ${email}...`)
  
  // 1. Find user by email
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
  
  if (listError) {
    console.error('Error listing users:', listError)
    return
  }

  console.log(`Total users found: ${users.length}`)
  users.forEach(u => console.log(`- ${u.email} (${u.email_confirmed_at ? 'confirmed' : 'unconfirmed'})`))

  const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase())

  if (!user) {
    console.error('User not found in list')
    return
  }

  console.log(`User found: ${user.id}`)

  // 2. Update user to confirm email
  const { data, error: updateError } = await supabase.auth.admin.updateUserById(
    user.id,
    { email_confirm: true }
  )

  if (updateError) {
    console.error('Error confirming user:', updateError)
    return
  }

  console.log('User confirmed successfully!')
  console.log('Confirmed at:', data.user.email_confirmed_at)
}

confirmUser()
