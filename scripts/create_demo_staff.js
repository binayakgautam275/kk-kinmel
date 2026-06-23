import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wwvuflbzacromudviaab.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3dnVmbGJ6YWNyb211ZHZpYWFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkyMzIxOSwiZXhwIjoyMDY3NDk5MjE5fQ.RR7vxnE1LFx6B8Up1tOF7yp4g5vhCzXi_8akjvkl0p8'

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

const staffAccounts = [
    { email: 'manager@srms.app', name: 'Demo Manager', role_id: 2 },
    { email: 'kitchen@srms.app', name: 'Demo Chef', role_id: 3 },
    { email: 'waiter@srms.app', name: 'Demo Waiter', role_id: 4 },
    { email: 'cashier@srms.app', name: 'Demo Cashier', role_id: 6 }
];

async function createStaffAccounts() {
    console.log("Generating Demo Staff Accounts...\n")

    for (const account of staffAccounts) {
        // 1. Create the auth user
        const { data: user, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: account.email,
            password: 'Password123!',
            email_confirm: true,
            user_metadata: { full_name: account.name }
        })

        if (authError) {
            console.error(`❌ Failed to create ${account.email}:`, authError.message)
            continue
        }

        console.log(`✅ Auth user created: ${account.email} (ID: ${user.user.id})`)

        // 2. Wait 1 second to ensure the auto_role_trigger has finished inserting into the public.users table
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 3. Override the role_id from the auto-trigger (which defaults to 1) to the correct staff role
        const { error: dbError } = await supabaseAdmin
            .from('users')
            .update({ role_id: account.role_id })
            .eq('id', user.user.id)

        if (dbError) {
            console.error(`❌ Failed to update role for ${account.email}:`, dbError.message)
        } else {
            console.log(`   -> Set Role ID to ${account.role_id} (${account.name})`)
        }
    }

    console.log("\n==================================")
    console.log("STAFF ACCOUNTS READY!")
    console.log("Password for all is: Password123!")
    console.log("----------------------------------")
    console.log("Manager (Role 2): manager@srms.app")
    console.log("Kitchen (Role 3): kitchen@srms.app")
    console.log("Waiter  (Role 4): waiter@srms.app")
    console.log("Cashier (Role 6): cashier@srms.app")
    console.log("==================================\n")
}

createStaffAccounts()
