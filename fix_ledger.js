import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function fixLedger() {
  const { data, error } = await supabase
    .from('purchase_records')
    .update({ status: 'Paid' })
    .eq('transaction_id', 'PR-0006')
    .select();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Fixed Records:', data.map(r => r.transaction_id));
  }
}

fixLedger();
