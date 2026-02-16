
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kawntunevmabyxqmhqnv.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imthd250dW5ldm1hYnl4cW1ocW52Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ5Mjc4NiwiZXhwIjoyMDg0MDY4Nzg2fQ.x3wIEVndOaKoQMEBmDLpwvaQORfPPYxl82rJN2oMoLg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function probe() {
  const shopId = 'd0d8eb3d-7042-4678-bef8-048c598f3ac0';
  console.log('Probing FK constraints for shop_bank_details...');

  // 1. Get Owner ID
  const { data: shop } = await supabase
    .from('shops')
    .select('owner_id')
    .eq('id', shopId)
    .single();

  if (!shop) {
    console.error('Shop not found!');
    return;
  }

  const ownerId = shop.owner_id;
  console.log('Shop ID:', shopId);
  console.log('Owner ID:', ownerId);

  // Test 1: Try Upsert with Shop ID (Expected behavior if FK -> Shops)
  console.log('\n--- Test 1: Upsert with Shop ID ---');
  const { error: error1 } = await supabase
    .from('shop_bank_details')
    .upsert({
      shop_id: shopId,
      bank_name: 'Test Bank',
      branch_name: 'Test Branch',
      account_type: 'ordinary',
      account_number: '1234567',
      account_holder: 'TEST HOLDER'
    }, { onConflict: 'shop_id' });

  if (error1) {
    console.log('❌ Failed (FK violation likely):', error1.message);
    if (error1.code === '23503') console.log('   -> Confirmed FK violation (23503)');
  } else {
    console.log('✅ Success! FK points to Shops.');
  }

  // Test 2: Try Upsert with Owner ID (Expected behavior if FK -> Users/Profiles)
  console.log('\n--- Test 2: Upsert with Owner ID ---');
  const { error: error2 } = await supabase
    .from('shop_bank_details')
    .upsert({
      shop_id: ownerId, // Using User ID here
      bank_name: 'Test Bank (User ID)',
      branch_name: 'Test Branch',
      account_type: 'ordinary',
      account_number: '1234567',
      account_holder: 'TEST HOLDER'
    }, { onConflict: 'shop_id' });

  if (error2) {
    console.log('❌ Failed:', error2.message);
  } else {
    console.log('✅ Success! FK points to Users/Profiles.');
  }
}

probe();
