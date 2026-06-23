import CartPageClient from './CartPageClient'
import { verifyClientIp } from '@/lib/ip-check'
import { createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function CartPage(props: { params: Promise<{ tableSlug: string }> }) {
    const params = await props.params
    const supabase = await createAdminClient()
    
    const { data: tableData } = await supabase
        .from('tables')
        .select('restaurant_id')
        .eq('qr_token', params.tableSlug)
        .single()
    
    if (tableData?.restaurant_id) {
        const { allowed } = await verifyClientIp(tableData.restaurant_id, 'customer')
        if (!allowed) {
            redirect(`/t/${params.tableSlug}`)
        }
    }
    
    return <CartPageClient params={params} />
}
