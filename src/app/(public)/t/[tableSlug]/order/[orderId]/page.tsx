import { createAdminClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import OrderTracker from '@/components/customer/OrderTracker'
import InvoiceBanner from '@/components/customer/InvoiceBanner'
import OrderPaymentSection from '@/components/customer/OrderPaymentSection'
import OrderSplitBillSection from '@/components/customer/OrderSplitBillSection'
import FeedbackPrompt from '@/components/customer/FeedbackPrompt'
import Link from 'next/link'
import { getRestaurantFeatures } from '@/lib/features'

export const revalidate = 0 // Don't cache this page - fetch fresh DB state

export default async function OrderPage(props: {
    params: Promise<{ tableSlug: string; orderId: string }>
}) {
    const params = await props.params;
    const adminSupabase = await createAdminClient()

    // Verify the order exists, fetch with nested item relations
    // Using adminSupabase to bypass RLS (JWT custom claims hook not configured on hosted Supabase)
    const { data: order } = await adminSupabase
        .from('orders')
        .select(`
      *,
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

    // Fetch restaurant info for invoice display + payment QR + features in parallel
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

    const restaurantInfo = restaurantResult?.data as {
        pan_number?: string
        vat_registered?: boolean
        name?: string
        payment_qr_url?: string
        payment_qr_label?: string
    } | null

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Header */}
            <header className="bg-white px-4 py-4 shadow-sm sticky top-0 z-20">
                <h1 className="text-xl font-semibold text-gray-900 text-center">Track Order</h1>
            </header>

            <main className="max-w-xl mx-auto px-4 mt-6">
                <OrderTracker orderId={params.orderId} initialOrder={order} />

                {/* Feedback prompt — shown once order is delivered and feature is enabled */}
                {order.status === 'delivered' && features?.feedbackEnabled && (
                    <FeedbackPrompt orderId={params.orderId} />
                )}

                {/* Pay Now Section — always shown when order isn't paid yet */}
                {order.restaurant_id && order.payment_status !== 'paid' && (
                    <OrderPaymentSection
                        orderId={params.orderId}
                        restaurantId={order.restaurant_id}
                        totalAmount={order.total_amount}
                        paymentStatus={order.payment_status}
                        paymentQrUrl={restaurantInfo?.payment_qr_url || null}
                        paymentQrLabel={restaurantInfo?.payment_qr_label || null}
                    />
                )}

                {/* Split Bill Section — shown when split billing is enabled and order isn't paid yet */}
                {order.session_id && features?.splitBillingEnabled && order.payment_status !== 'paid' && (
                    <OrderSplitBillSection
                        sessionId={order.session_id}
                        totalAmount={order.total_amount}
                    />
                )}

                {/* Invoice / PAN display */}
                {/* eslint-disable @typescript-eslint/no-explicit-any */}
                {(order as any).invoice_number && (
                    <InvoiceBanner
                        invoiceNumber={(order as any).invoice_number}
                        panNumber={restaurantInfo?.pan_number || (order as any).pan_number_snapshot}
                        restaurantName={restaurantInfo?.name}
                        vatRegistered={restaurantInfo?.vat_registered}
                    />
                )}

                {/* Support/Extra Actions */}
                <div className="mt-8 text-center space-y-3">
                    <Link href={`/t/${params.tableSlug}`} className="inline-block text-[var(--color-primary)] font-medium text-sm hover:underline">
                        ← Back to Menu
                    </Link>
                    <p className="text-sm text-gray-500">Need help? Ask a waiter for assistance.</p>
                </div>
            </main>
        </div>
    )
}
