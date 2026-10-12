const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const { data, error } = await supabase.from('purchase_requisitions').select('*').limit(1);
  if (error) {
    console.error('Error fetching requisitions:', error);
  } else {
    console.log('Requisition keys:', data.length > 0 ? Object.keys(data[0]) : 'No data found in purchase_requisitions');
  }
}

main();
