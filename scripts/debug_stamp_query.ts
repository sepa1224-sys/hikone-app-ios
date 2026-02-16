
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kawntunevmabyxqmhqnv.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imthd250dW5ldm1hYnl4cW1ocW52Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ5Mjc4NiwiZXhwIjoyMDg0MDY4Nzg2fQ.x3wIEVndOaKoQMEBmDLpwvaQORfPPYxl82rJN2oMoLg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugStampQuery() {
  console.log('--- Debugging Stamp Query Logic ---');

  try {
    // 1. Check if stamp_cards has data
    const { count, error: countError } = await supabase.from('stamp_cards').select('*', { count: 'exact', head: true });
    if (countError) throw countError;
    console.log(`Total stamp_cards in DB: ${count}`);

    if (count === 0) {
      console.warn('WARNING: No stamp cards found. This explains why list is empty.');
      return;
    }

    // 2. Pick a random user to simulate
    const { data: users, error: userError } = await supabase.from('profiles').select('id').limit(1);
    if (userError) throw userError;
    const userId = users[0]?.id;
    console.log(`Simulating for User ID: ${userId}`);

    // 3. Get user's existing cards
    const { data: myCards, error: myCardsError } = await supabase
      .from('user_stamps')
      .select('stamp_card_id')
      .eq('user_id', userId);
    
    if (myCardsError) throw myCardsError;
    const myShopIds = myCards.map((c: any) => c.stamp_card_id);
    console.log('User owns cards for shops:', myShopIds);

    // 4. Execute the "Available Cards" query
    let query = supabase
      .from('stamp_cards')
      .select(`
        target_count,
        reward_description,
        shops!inner (
          id,
          name,
          image_url,
          thumbnail_url,
          address
        )
      `);

    if (myShopIds.length > 0) {
      console.log('Applying NOT IN filter:', `(${myShopIds.join(',')})`);
      query = query.not('shop_id', 'in', `(${myShopIds.join(',')})`);
    } else {
        console.log('No existing cards, fetching all.');
    }

    const { data: availableCards, error: queryError } = await query;

    if (queryError) {
      console.error('Query Error:', queryError);
    } else {
      console.log(`Query returned ${availableCards?.length} cards.`);
      if (availableCards && availableCards.length > 0) {
          console.log('Sample card:', JSON.stringify(availableCards[0], null, 2));
      } else {
          console.log('Query returned empty array. Possible reasons: All cards registered, or JOIN failed.');
          
          // Debug JOIN
          console.log('--- Debugging JOIN ---');
          const { data: rawCards } = await supabase.from('stamp_cards').select('shop_id');
          console.log('Raw stamp_cards shop_ids:', rawCards?.map(c => c.shop_id));
          
          // Check if these shops exist
          if (rawCards && rawCards.length > 0) {
             const { data: shops } = await supabase.from('shops').select('id, name').in('id', rawCards.map(c => c.shop_id));
             console.log('Corresponding shops found:', shops?.length);
             console.log('Shops data:', shops);
          }
      }
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

debugStampQuery();
