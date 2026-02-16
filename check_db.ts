
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kawntunevmabyxqmhqnv.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imthd250dW5ldm1hYnl4cW1ocW52Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ5Mjc4NiwiZXhwIjoyMDg0MDY4Nzg2fQ.x3wIEVndOaKoQMEBmDLpwvaQORfPPYxl82rJN2oMoLg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  const targetId = 'd0d8eb3d-7042-4678-bef8-048c598f3ac0';
  console.log('Checking for shop ID:', targetId);
  
  // 1. Check if specific shop exists
  const { data: shop, error } = await supabase
    .from('shops')
    .select('id, name, owner_id')
    .eq('id', targetId)
    .maybeSingle();
    
  if (shop) {
    console.log('FOUND Shop:', shop);
  } else {
    console.log('Shop NOT FOUND for ID:', targetId);
  }

  // 2. List all shops to find potential matches
  console.log('\n--- ALL SHOPS ---');
  const { data: allShops } = await supabase.from('shops').select('id, name, owner_id');
  if (allShops) {
    console.table(allShops);
  }
}

check();
