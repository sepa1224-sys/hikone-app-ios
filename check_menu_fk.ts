
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Manual env loader
const envPath = path.resolve(process.cwd(), '.env.local')
const envConfig = fs.readFileSync(envPath, 'utf8')
const env: Record<string, string> = {}
envConfig.split('\n').forEach(line => {
  const [key, value] = line.split('=')
  if (key && value) env[key.trim()] = value.trim()
})

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL']
const supabaseServiceKey = env['SUPABASE_SERVICE_ROLE_KEY']

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkMenuFK() {
  console.log('Checking FK constraints for menu_items...')
  
  const { data, error } = await supabase.rpc('run_sql_query', {
    sql: `
      SELECT 
        conname AS constraint_name,
        conrelid::regclass AS table_name,
        a.attname AS column_name,
        confrelid::regclass AS referenced_table
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
      WHERE conrelid = 'menu_items'::regclass
      AND contype = 'f';
    `
  })
  
  // Since we can't easily run arbitrary SQL via client without a helper function (which might not exist),
  // we will infer from insertion behavior or try to find a known FK name.
  // Actually, standard Supabase client doesn't support arbitrary SQL execution unless we have a function for it.
  
  // Alternative: Try to insert a dummy menu item with a known shop ID vs owner ID and see which one fails.
  
  // 1. Get a valid shop and owner
  const { data: shop } = await supabase.from('shops').select('id, owner_id').limit(1).single()
  
  if (!shop) {
      console.log('No shops found')
      return
  }
  
  console.log(`Testing with Shop ID: ${shop.id}`)
  console.log(`Testing with Owner ID: ${shop.owner_id}`)

  // Debug: Check table existence and columns by selecting
  console.log('\n--- Debug: Inspecting menu_items ---')
  const { data: menuData, error: menuError } = await supabase.from('menu_items').select('*').limit(1)
  if (menuError) {
      console.log(`Error selecting from menu_items: ${menuError.message} (${menuError.code})`)
  } else {
      console.log('menu_items columns:', menuData && menuData.length > 0 ? Object.keys(menuData[0]) : 'No rows found (cannot infer columns)')
  }

  // Try insert WITH category to see if column exists
  console.log('\n--- Test 1: Insert with Shop ID (WITH category) ---')
  const { error: error1 } = await supabase.from('menu_items').insert({
      shop_id: shop.id,
      name: 'FK Test ShopID',
      price: 100,
      category: 'other'
  })
  
  if (error1) {
      console.log(`❌ Error: ${error1.message} (${error1.code})`)
      console.log('Details:', error1.details)
  } else {
      console.log('✅ Success! FK points to shops(id).')
      await supabase.from('menu_items').delete().eq('name', 'FK Test ShopID')
  }

  // Try insert with Owner ID
  if (shop.owner_id) {
    console.log('\n--- Test 2: Insert with Owner ID (minimal fields) ---')
    const { error: error2 } = await supabase.from('menu_items').insert({
        shop_id: shop.owner_id,
        name: 'FK Test OwnerID',
        price: 100
        // category omitted
    })

    if (error2) {
        console.log(`❌ Error: ${error2.message} (${error2.code})`)
        console.log('Details:', error2.details)
    } else {
        console.log('✅ Success! FK points to profiles(id) [Owner ID].')
        await supabase.from('menu_items').delete().eq('name', 'FK Test OwnerID')
    }
  }
}

checkMenuFK()
