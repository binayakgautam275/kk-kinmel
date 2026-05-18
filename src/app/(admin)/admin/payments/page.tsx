import { getCurrentUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import PaymentVerificationPanel from '@/components/admin/PaymentVerificationPanel'

export const dynamic = 'force-dynamic'

export default async function AdminPaymentsPage() {
    const { id: userId, restaurantId } = await getCurrentUser()
    const supabase = await createAdminClient()

    const { data: claims } = await supabase
        .from('payment_verifications')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(100)

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-2xl font-bold text-gray-900">Payment Verification</h1>
                <p className="text-gray-500 mt-1">Review and approve customer payment claims</p>
            </header>

            <PaymentVerificationPanel
                initialClaims={claims || []}
                restaurantId={restaurantId}
                userId={userId}
            />
        </div>
    )
}
