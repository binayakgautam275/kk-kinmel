require('dotenv').config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function run() {
    const tableRes = await fetch(`${url}/rest/v1/tables?limit=1`, {
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    const tables = await tableRes.json();
    const table = tables[0];

    const userRes = await fetch(`${url}/rest/v1/users?limit=1`, {
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    const users = await userRes.json();
    const user = users[0];

    const crypto = require('crypto');
    const sessionToken = crypto.randomBytes(32).toString('base64url');

    const insertRes = await fetch(`${url}/rest/v1/sessions`, {
        method: 'POST',
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({
            table_id: table.id,
            restaurant_id: table.restaurant_id,
            session_token: sessionToken,
            opened_by: user.id
        })
    });
    
    const result = await insertRes.json();
    console.log(JSON.stringify(result, null, 2));
}

run().catch(console.error);
