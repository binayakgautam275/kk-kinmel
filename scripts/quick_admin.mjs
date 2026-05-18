import { createClient } from '@supabase/supabase-js'

if (process.env.NODE_ENV === 'production') {
    throw new Error('This script must not be run in production.')
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD

if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.')
}
if (!ADMIN_PASSWORD) {
    throw new Error('Missing TEST_ADMIN_PASSWORD env var. Set it before running this script.')
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY)

async function create() {
    const emails = ['superadmin@srms.app', 'admin@srms.app', 'root@srms.app']
    let created = false

    for (const email of emails) {
        try {
            const { data, error } = await supabaseAdmin.auth.admin.createUser({
                email,
                password: ADMIN_PASSWORD,
                email_confirm: true
            })

            if (error) {
                console.log(`${email}: ${error.message}`)
                continue
            }

            console.log(`Created: ${email}`)
            await new Promise(r => setTimeout(r, 1500))

            const { error: err2 } = await supabaseAdmin
                .from('users')
                .upsert({ id: data.user.id, email, role_id: 1, name: 'Super Admin' })

            if (err2) {
                console.log('Error setting role:', err2.message)
            } else {
                console.log(`\nSUCCESS: ${email} created as Super Admin\n`)
                created = true
                break
            }
        } catch (e) {
            console.log(`Exception with ${email}: ${e.message}`)
        }
    }

    if (!created) console.log('Could not create admin account')
}

create()
