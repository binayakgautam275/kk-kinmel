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

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
})

async function createAdmin() {
    console.log('Creating Test Admin Account...\n')

    try {
        const { data: user, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: 'testadmin@test.com',
            password: ADMIN_PASSWORD,
            email_confirm: true,
            user_metadata: { full_name: 'Test Admin' }
        })

        if (authError) {
            if (authError.message.includes('already exists')) {
                console.log('Admin account already exists: testadmin@test.com')
                return
            }
            console.error('Failed to create admin:', authError.message)
            return
        }

        console.log(`Auth user created: testadmin@test.com (ID: ${user.user.id})`)

        await new Promise(resolve => setTimeout(resolve, 1500))

        const { error: dbError } = await supabaseAdmin
            .from('users')
            .update({ role_id: 1, restaurant_id: null })
            .eq('id', user.user.id)

        if (dbError) {
            console.error('Failed to update role:', dbError.message)
        } else {
            console.log('Set Role ID to 1 (Super Admin)')
            console.log('\nAdmin account ready: testadmin@test.com')
        }
    } catch (err) {
        console.error('Error:', err.message)
    }
}

createAdmin()
