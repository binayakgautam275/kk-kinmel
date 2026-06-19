const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    // get a random table id
    const { data: table } = await supabase.from('tables').select('id, restaurant_id').limit(1).single();
    if (!table) return console.error('No table found');

    const crypto = require('crypto');
    const sessionToken = crypto.randomBytes(32).toString('base64url');

    console.log('Inserting for table:', table.id);

    const { data, error } = await supabase
        .from('sessions')
        .insert({
            table_id: table.id,
            restaurant_id: table.restaurant_id,
            session_token: sessionToken,
            opened_by: '00000000-0000-0000-0000-000000000000'
        })
        .select('*')
        .single();

    if (error) {
        console.error('Insert error:', error);
    } else {
        console.log('Inserted:', JSON.stringify(data, null, 2));
    }
}
main();
