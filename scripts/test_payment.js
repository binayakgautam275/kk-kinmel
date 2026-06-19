const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('payment_verifications').insert({
    restaurant_id: '123e4567-e89b-12d3-a456-426614174000', // Dummy UUID
    order_id: null,
    amount: 100,
    payment_method: 'esewa',
    reference_code: '1234567890',
  });
  console.log('Error:', error);
}

run();
