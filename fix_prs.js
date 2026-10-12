import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function fixStuckPRs() {
  const { data, error } = await supabase
    .from('purchase_requisitions')
    .update({ status: 'Approved' })
    .in('status', ['Pending Finance', 'Pending Accounting'])
    .select();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Fixed PRs:', data.map(pr => pr.id));
  }
}

fixStuckPRs();
