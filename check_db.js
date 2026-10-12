import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: users, error } = await supabase.from('user_accounts').select('id, full_name, username, role, groups, supervisor_id, manager_id, vp_id');
  if (error) {
    console.error(error);
    return;
  }
  
  const bendry = users.find(u => u.full_name.toLowerCase().includes('bendry') || u.username.toLowerCase().includes('bendry'));
  console.log("Bendry:", bendry);
  
  const rara = users.find(u => u.full_name.toLowerCase().includes('rara') || u.username.toLowerCase().includes('rara'));
  console.log("Rara:", rara);
  
  const javier = users.find(u => u.full_name.toLowerCase().includes('javier') || u.username.toLowerCase().includes('javier'));
  console.log("Javier:", javier);
}

check();
