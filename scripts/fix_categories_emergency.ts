
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf-8')
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
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixShopCategories() {
  console.log('Starting category fix...')
  
  const updates = [
    { name: '彦根城前カフェ', category: 'カフェ' },
    { name: '滋賀大ランチ処', category: '定食・ランチ' },
    { name: '中央町ダイナー', category: '居酒屋' }
  ]

  for (const update of updates) {
    // 1. Find the shop
    const { data: shops, error: findError } = await supabase
      .from('shops')
      .select('id, name, category_main')
      .eq('name', update.name)
    
    if (findError) {
      console.error(`Error finding ${update.name}:`, findError)
      continue
    }

    if (!shops || shops.length === 0) {
      console.error(`Shop not found: ${update.name}`)
      continue
    }

    const shop = shops[0]
    console.log(`Found shop: ${shop.name} (ID: ${shop.id}, Current Category: ${shop.category_main})`)

    // 2. Update category_main
    const { error: updateError } = await supabase
      .from('shops')
      .update({ category_main: update.category })
      .eq('id', shop.id)

    if (updateError) {
      console.error(`Failed to update ${update.name}:`, updateError)
    } else {
      console.log(`Successfully updated ${update.name} to ${update.category}`)
    }
  }
}

fixShopCategories()
