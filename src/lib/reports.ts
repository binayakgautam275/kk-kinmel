import { createAdminClient } from '@/lib/supabase/server'

export interface EodReportNotes {
    notesText?: string
    uniqueCustomers: number
    rushHour: string
    topSellers: Array<{ name: string; quantity: number; revenue: number }>
    paymentBreakdown: Record<string, number>
}

/**
 * Generates an End-of-Day report for a given restaurant and date.
 * Aggregates all orders, items, and payments for that date in Nepal time (UTC+5:45).
 */
export async function generateEodReport(restaurantId: string, reportDate: string) {
    const supabase = await createAdminClient()

    // 1. Calculate midnight start/end in Kathmandu timezone
    const start = new Date(`${reportDate}T00:00:00+05:45`).toISOString()
    const end = new Date(`${reportDate}T23:59:59.999+05:45`).toISOString()

    // 2. Fetch all orders for this day
    const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .gte('placed_at', start)
        .lte('placed_at', end)

    if (ordersError) throw new Error(`Failed to fetch orders: ${ordersError.message}`)

    const allOrders = orders || []
    const paidOrders = allOrders.filter(o => o.payment_status === 'paid')
    const cancelledOrders = allOrders.filter(o => o.status === 'cancelled')
    const refundedOrders = allOrders.filter(o => o.payment_status === 'refunded')

    // 3. Basic sums
    const totalOrders = paidOrders.length
    const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
    const totalTax = paidOrders.reduce((sum, o) => sum + (o.tax_amount || 0), 0)
    const totalTips = paidOrders.reduce((sum, o) => sum + (o.tip_amount || 0), 0)
    const totalDiscounts = paidOrders.reduce((sum, o) => sum + (o.discount_amount || 0), 0)
    const netRevenue = totalRevenue - totalTax
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    const cancelledCount = cancelledOrders.length
    const refundsCount = refundedOrders.length
    // Assuming voids are unpaid orders that got cancelled or deleted
    const voidsCount = allOrders.filter(o => o.payment_status === 'unpaid' && o.status === 'cancelled').length

    // 4. Unique Customers estimation (by session_id or separate order)
    const uniqueSessions = new Set(paidOrders.map(o => o.session_id).filter(Boolean))
    const ordersWithoutSession = paidOrders.filter(o => !o.session_id).length
    const uniqueCustomers = uniqueSessions.size + ordersWithoutSession

    // 5. Fetch payment verifications for this period to breakdown payment methods
    const { data: verifications, error: verError } = await supabase
        .from('payment_verifications')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('staff_verified', true)
        .gte('created_at', start)
        .lte('created_at', end)

    if (verError) throw new Error(`Failed to fetch payment verifications: ${verError.message}`)

    let cashTotal = 0
    let cardTotal = 0
    const digitalBreakdown: Record<string, number> = {}

    for (const v of verifications || []) {
        const amt = v.amount || 0
        const method = v.payment_method || 'unknown'
        if (method === 'cash') {
            cashTotal += amt
        } else if (method === 'card') {
            cardTotal += amt
        } else {
            digitalBreakdown[method] = (digitalBreakdown[method] || 0) + amt
        }
    }

    // Set other digital payment totals
    const paymentBreakdown: Record<string, number> = {
        cash: cashTotal,
        card: cardTotal,
        ...digitalBreakdown
    }

    // Reconciliation: paid orders with no verified payment_verification
    const verifiedOrderIds = new Set(verifications?.map(v => v.order_id).filter(Boolean) || [])
    const unverifiedOrdersCount = paidOrders.filter(o => !verifiedOrderIds.has(o.id)).length

    // 6. Top 5 Best Sellers
    const paidOrderIds = paidOrders.map(o => o.id)
    let topSellers: Array<{ name: string; quantity: number; revenue: number }> = []

    if (paidOrderIds.length > 0) {
        const { data: items, error: itemsError } = await supabase
            .from('order_items')
            .select(`
                menu_item_id,
                quantity,
                unit_price,
                menu_items (
                    name
                )
            `)
            .in('order_id', paidOrderIds)

        if (itemsError) throw new Error(`Failed to fetch order items: ${itemsError.message}`)

        const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>()
        for (const item of items || []) {
            const menuItem = item.menu_items as any
            const name = menuItem?.name || 'Unknown Item'
            const qty = item.quantity || 0
            const rev = (item.unit_price || 0) * qty
            const existing = itemMap.get(item.menu_item_id)
            if (existing) {
                existing.quantity += qty
                existing.revenue += rev
            } else {
                itemMap.set(item.menu_item_id, { name, quantity: qty, revenue: rev })
            }
        }

        topSellers = Array.from(itemMap.values())
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5)
    }

    // 7. Most Rush Hour calculation
    const hourCounts = new Map<number, { count: number; revenue: number }>()
    for (const o of paidOrders) {
        const date = new Date(o.placed_at)
        // Add 5:45 offset for Kathmandu timezone to find the correct local hour
        const localTime = new Date(date.getTime() + (5 * 60 + 45) * 60 * 1000)
        const hour = localTime.getUTCHours()

        const existing = hourCounts.get(hour)
        if (existing) {
            existing.count++
            existing.revenue += (o.total_amount || 0)
        } else {
            hourCounts.set(hour, { count: 1, revenue: o.total_amount || 0 })
        }
    }

    let rushHourStr = 'No sales'
    if (hourCounts.size > 0) {
        const sortedHours = Array.from(hourCounts.entries())
            .sort((a, b) => b[1].count - a[1].count || b[1].revenue - a[1].revenue)
        const [bestHour, stats] = sortedHours[0]
        const startHourStr = bestHour === 0 ? '12:00 AM' : bestHour === 12 ? '12:00 PM' : bestHour > 12 ? `${bestHour - 12}:00 PM` : `${bestHour}:00 AM`
        const endHour = (bestHour + 1) % 24
        const endHourStr = endHour === 0 ? '12:00 AM' : endHour === 12 ? '12:00 PM' : endHour > 12 ? `${endHour - 12}:00 PM` : `${endHour}:00 AM`
        rushHourStr = `${startHourStr} - ${endHourStr} (${stats.count} orders, Rs. ${stats.revenue.toFixed(2)})`
    }

    // 8. COGS and Gross Profit calculation
    let totalCogs = 0
    if (paidOrderIds.length > 0) {
        const { data: recipes } = await supabase
            .from('recipes')
            .select('menu_item_id, ingredient_id, quantity_needed')

        const { data: ingredients } = await supabase
            .from('ingredients')
            .select('id, cost_per_unit')
            .eq('restaurant_id', restaurantId)

        const costMap = new Map(ingredients?.map(i => [i.id, i.cost_per_unit || 0]))
        const menuItemCostMap = new Map<string, number>()

        for (const r of recipes || []) {
            const itemCost = (r.quantity_needed || 0) * (costMap.get(r.ingredient_id) || 0)
            menuItemCostMap.set(r.menu_item_id, (menuItemCostMap.get(r.menu_item_id) || 0) + itemCost)
        }

        // We need order items quantities to sum total cost
        const { data: items } = await supabase
            .from('order_items')
            .select('menu_item_id, quantity')
            .in('order_id', paidOrderIds)

        for (const item of items || []) {
            const cost = menuItemCostMap.get(item.menu_item_id) || 0
            totalCogs += cost * (item.quantity || 0)
        }
    }

    const grossProfit = netRevenue - totalCogs

    // 9. Construct Notes JSON string
    const notesJson: EodReportNotes = {
        notesText: '',
        uniqueCustomers,
        rushHour: rushHourStr,
        topSellers,
        paymentBreakdown
    }

    // 10. Upsert into database
    const { data: result, error: upsertError } = await supabase
        .from('eod_reports')
        .upsert({
            restaurant_id: restaurantId,
            report_date: reportDate,
            total_orders: totalOrders,
            total_revenue: totalRevenue,
            total_tax: totalTax,
            total_tips: totalTips,
            total_discounts: totalDiscounts,
            net_revenue: netRevenue,
            cash_total: cashTotal,
            card_total: totalRevenue - cashTotal, // standard "everything else" definition
            total_voids: voidsCount,
            total_refunds: refundsCount,
            total_cancelled: cancelledCount,
            avg_order_value: avgOrderValue,
            total_cogs: totalCogs,
            gross_profit: grossProfit,
            notes: JSON.stringify(notesJson),
            unverified_orders: unverifiedOrdersCount
        }, {
            onConflict: 'restaurant_id,report_date'
        })
        .select()
        .single()

    if (upsertError) throw new Error(`Failed to save EOD report: ${upsertError.message}`)

    return result
}
