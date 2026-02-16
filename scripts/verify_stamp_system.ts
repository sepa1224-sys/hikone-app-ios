
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kawntunevmabyxqmhqnv.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imthd250dW5ldm1hYnl4cW1ocW52Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ5Mjc4NiwiZXhwIjoyMDg0MDY4Nzg2fQ.x3wIEVndOaKoQMEBmDLpwvaQORfPPYxl82rJN2oMoLg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyStampStructure() {
  console.log('Starting Stamp System Verification (3-Layer Structure)...');

  try {
    // 1. Get a test shop
    const { data: shop } = await supabase.from('shops').select('id, name, owner_id').limit(1).single();
    if (!shop) throw new Error('No shops found');
    console.log(`[OK] Shop found: ${shop.name} (${shop.id})`);

    // 2. Get a test user (use the owner for simplicity, or any user)
    // We need a user from profiles or auth.users
    const { data: user } = await supabase.from('profiles').select('id').limit(1).single();
    if (!user) throw new Error('No users found in profiles');
    console.log(`[OK] User found: ${user.id}`);

    // 3. Shop Side: Create/Update Stamp Card Template
    console.log('\n--- Step 1: Shop creates Stamp Card ---');
    const { data: card, error: cardError } = await supabase
      .from('stamp_cards')
      .upsert({
        shop_id: shop.id,
        target_count: 5,
        reward_description: 'Test Reward Coffee',
        expiry_days: 30
      })
      .select()
      .single();
    
    if (cardError) throw cardError;
    console.log(`[OK] Stamp Card created: Target=${card.target_count}, Reward=${card.reward_description}`);

    // 4. User Side: Register Card (Create user_stamps)
    console.log('\n--- Step 2: User registers Card ---');
    // First check if exists and delete for clean test
    await supabase.from('user_stamps').delete().eq('user_id', user.id).eq('stamp_card_id', shop.id);

    const { data: userCard, error: registerError } = await supabase
      .from('user_stamps')
      .insert({
        user_id: user.id,
        stamp_card_id: shop.id,
        current_count: 0,
        is_completed: false
      })
      .select()
      .single();

    if (registerError) throw registerError;
    console.log(`[OK] User Card registered: ID=${userCard.id}, Count=${userCard.current_count}`);

    // 5. Action: Grant Stamp (Log + Update)
    console.log('\n--- Step 3: Grant Stamp (Log + Update) ---');
    
    // 5.1 Insert Log
    const { error: logError } = await supabase
      .from('stamp_logs')
      .insert({
        user_stamp_id: userCard.id,
        stamped_at: new Date().toISOString(),
        location_lat: 35.0,
        location_lng: 139.0
      });
    
    if (logError) throw logError;
    console.log('[OK] Stamp Log inserted');

    // 5.2 Update Count
    const { data: updatedCard, error: updateError } = await supabase
      .from('user_stamps')
      .update({
        current_count: userCard.current_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', userCard.id)
      .select()
      .single();
    
    if (updateError) throw updateError;
    console.log(`[OK] User Card updated: Count=${updatedCard.current_count}`);

    // 6. Verification: Fetch My Cards
    console.log('\n--- Step 4: Verify Relations (My Cards) ---');
    const { data: myCards, error: fetchError } = await supabase
      .from('user_stamps')
      .select(`
        current_count,
        stamp_cards (
          reward_description,
          shops (
            name
          )
        )
      `)
      .eq('id', userCard.id)
      .single();
    
    if (fetchError) throw fetchError;
    
    console.log('Fetched Data:', JSON.stringify(myCards, null, 2));
    
    if (myCards.stamp_cards.shops.name === shop.name) {
      console.log(`[SUCCESS] Verified relation: User -> Card -> Template -> Shop (${shop.name})`);
    } else {
      console.error('[FAIL] Relation mismatch');
    }

  } catch (error) {
    console.error('[ERROR]', error);
  }
}

verifyStampStructure();
