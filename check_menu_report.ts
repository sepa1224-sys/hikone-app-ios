
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = 'https://kawntunevmabyxqmhqnv.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imthd250dW5ldm1hYnl4cW1ocW52Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ5Mjc4NiwiZXhwIjoyMDg0MDY4Nzg2fQ.x3wIEVndOaKoQMEBmDLpwvaQORfPPYxl82rJN2oMoLg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function generateReport() {
  console.log('Fetching first menu item...');
  
  const { data: menuItems, error } = await supabase
    .from('menu_items')
    .select('id, shop_id, name, image_url')
    .limit(1);

  if (error) {
    console.error('Error fetching menu items:', error);
    return;
  }

  if (!menuItems || menuItems.length === 0) {
    console.log('No menu items found.');
    return;
  }

  const item = menuItems[0];
  console.log('First Item:', item);

  // Check shop details
  const { data: shop } = await supabase
    .from('shops')
    .select('id, name, owner_id')
    .eq('id', item.shop_id)
    .single();

  console.log('Linked Shop:', shop);

  const csvContent = [
    'Menu Item ID,Menu Name,Shop ID,Shop Name,Owner ID,Image URL,Has Image',
    `${item.id},${item.name},${item.shop_id},${shop?.name || 'Unknown'},${shop?.owner_id || 'Unknown'},${item.image_url || ''},${!!item.image_url}`
  ].join('\n');

  fs.writeFileSync('menu_report.csv', csvContent);
  console.log('Report saved to menu_report.csv');
}

generateReport();
