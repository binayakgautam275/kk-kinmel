require('dotenv').config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function run() {
    const fetchRes = await fetch(`${url}/rest/v1/sessions?status=eq.active&select=id,session_token&limit=1`, {
        headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` }
    });
    
    const result = await fetchRes.json();
    console.log(JSON.stringify(result, null, 2));
}

run().catch(console.error);
