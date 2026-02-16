
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Manual env loader
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseServiceKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPayoutStatus() {
  const targetShopId = 'd0d8eb3d-7042-4678-bef8-048c598f3ac0';
  console.log(`Searching for shop with ID: ${targetShopId}`);

  // 1. Find the Shop and Owner
  const { data: shop, error: shopError } = await supabase
    .from('shops')
    .select('id, owner_id, name')
    .eq('id', targetShopId)
    .single();

  if (shopError || !shop) {
    console.error('Shop not found:', shopError);
    return;
  }

  // const shop = shops[0]; // Single returns object directly
  console.log('--- 1. Shop & Owner Info ---');
  console.log(`Shop ID: ${shop.id}`);
  console.log(`Owner ID: ${shop.owner_id}`);
  console.log(`Shop Name: ${shop.name}`);

  // 2. Check shop_bank_details (using Owner ID - CORRECT)
  const { data: bankByOwner, error: bankOwnerError } = await supabase
    .from('shop_bank_details')
    .select('*')
    .eq('shop_id', shop.owner_id);

  console.log('\n--- 2. DB Check: shop_bank_details (by Owner ID) ---');
  if (bankByOwner && bankByOwner.length > 0) {
    console.log('Record FOUND using Owner ID:', bankByOwner[0]);
  } else {
    console.log('Record NOT FOUND using Owner ID.');
    if (bankOwnerError) console.error('Error:', bankOwnerError);
  }

  // 3. Check shop_bank_details (using Shop ID - INCORRECT but checking for ghost data)
  const { data: bankByShop, error: bankShopError } = await supabase
    .from('shop_bank_details')
    .select('*')
    .eq('shop_id', shop.id);

  console.log('\n--- 3. DB Check: shop_bank_details (by Shop ID - Deprecated) ---');
  if (bankByShop && bankByShop.length > 0) {
    console.log('Record FOUND using Shop ID (Incorrect FK usage?):', bankByShop[0]);
  } else {
    console.log('Record NOT FOUND using Shop ID.');
  }

  // 4. Simulate requestPayout logic fetch
  console.log('\n--- 4. Simulation: requestPayout fetch logic ---');
  // Current logic in shop.ts (lines ~500):
  // .eq('shop_id', userId) // which is owner_id
  const { data: payoutFetch } = await supabase
      .from('shop_bank_details')
      .select('*')
      .eq('shop_id', shop.owner_id)
      .single();
    
  if (payoutFetch) {
      console.log('Fetch SUCCESS with current logic.');
      
      // 5. Test Insert into payout_requests
  console.log('\n--- 5. Schema Check: payout_requests ---');
  const { data: existingReqs, error: fetchReqError } = await supabase
    .from('payout_requests')
    .select('*')
    .limit(1);

  if (fetchReqError) {
      console.error('Fetch Error:', fetchReqError);
  } else if (existingReqs && existingReqs.length > 0) {
      console.log('Existing Record Keys:', Object.keys(existingReqs[0]));
  } else {
      console.log('No records found, cannot infer schema from data.');
  }
  
  // 6. Test Insert with Shop ID (to check FK)
  console.log('\n--- 6. Test Insert with Shop ID (FK Check) ---');
  const { data: fkCheckData, error: fkCheckError } = await supabase
    .from('payout_requests')
    .insert({
        shop_id: shop.id, // Using Shop ID
        amount: 1,
        status: 'pending'
        // No bank_info
    })
    .select()
    .single();

  if (fkCheckError) {
      console.error('Insert Failed:', fkCheckError);
  } else {
      console.log('Insert Success! FK references shops table (or no FK).');
      // Cleanup
      await supabase.from('payout_requests').delete().eq('id', fkCheckData.id);
      console.log('Cleanup complete.');
  }

  /*
  console.log('\n--- 5. Test Insert into payout_requests ---');
  // ... (Commented out previous failing test)
  */

  } else {
      console.error('FAILURE PREDICTION: Fetch returned null/error.');
  }
}

checkPayoutStatus();
