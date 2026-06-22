import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PaymentPageClient from '@/components/customer/PaymentPageClient'
import { getRestaurantFeatures } from '@/lib/features'
import { use } from 'react'

export const revalidate = 0 // Don't cache this page - fetch fresh DB state

export default async function PaymentPage(props: {
    params: Promise<{ tableSlug: string; orderId: string }>
}) {
    const params = await props.params
    const adminSupabase = await createAdminClient()

    // Fetch the order with item details
    const { data: order } = await adminSupabase
        .from('orders')
        .select(`
            *,
            invoice_number,
            order_items (
                *,
                menu_items (name),
                order_item_modifiers (*)
            )
        `)
        .eq('id', params.orderId)
        .single()

    if (!order) {
        return notFound()
    }

    // Fetch restaurant info and features in parallel
    const [restaurantResult, features] = await Promise.all([
        order.restaurant_id
            ? adminSupabase
                .from('restaurants')
                .select('pan_number, vat_registered, name, payment_qr_url, payment_qr_label')
                .eq('id', order.restaurant_id)
                .single()
            : Promise.resolve({ data: null }),
        order.restaurant_id
            ? getRestaurantFeatures(order.restaurant_id)
            : Promise.resolve(null),
    ])

    const restaurantInfo = restaurantResult?.data

    return (
        <PaymentPageClient
            order={order}
            restaurantInfo={restaurantInfo}
            features={features}
            tableSlug={params.tableSlug}
        />
    )
}
