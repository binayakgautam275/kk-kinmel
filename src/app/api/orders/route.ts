import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { validateInput, OrderQuerySchema } from '@/lib/validation'

// Standard mock orders API for potential external POS integrations
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)

    // Require API Key in header for external access.
    // Fail closed if the key is unset — otherwise the comparison would match a
    // literal "Bearer undefined" and silently disable auth.
    const apiKey = process.env.SRMS_API_KEY
    if (!apiKey) {
        return NextResponse.json({ error: 'API not configured' }, { status: 503 })
    }
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${apiKey}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate query parameters
    const params = {
        restaurant_id: searchParams.get('restaurant_id'),
        status: searchParams.get('status'),
        limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50
    }

    const validation = validateInput(OrderQuerySchema, params)
    if (!validation.success) {
        return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { restaurant_id: restaurantId, status } = validation.data!

    const supabase = await createAdminClient()

    let query = supabase
        .from('orders')
        .select(`
            id, 
            status, 
            total_amount, 
            placed_at,
            session_id,
            order_items (
                id, menu_item_id, quantity, unit_price, special_request
            )
        `)
        .eq('restaurant_id', restaurantId)

    if (status) {
        query = query.eq('status', status)
    }

    // Limit to latest 50 orders in an API call
    query = query.order('created_at', { ascending: false }).limit(50)

    const { data, error } = await query

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ orders: data })
}
