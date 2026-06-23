'use server'

import { createAdminClient } from '@/lib/supabase/server'
import type { ServiceRequestType } from '@/types/database'
import { verifyClientIp } from '@/lib/ip-check'

export async function createServiceRequest(
    sessionId: string,
    restaurantId: string,
    requestType: ServiceRequestType,
    message?: string
): Promise<{ success: boolean; error?: string }> {
    const { allowed } = await verifyClientIp(restaurantId, 'customer')
    if (!allowed) {
        return { success: false, error: 'Your current network IP is not allowed to send requests for this restaurant.' }
    }

    const supabase = await createAdminClient()

    // Rate limit: max 3 pending requests per session
    const { count } = await supabase
        .from('service_requests')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .eq('status', 'pending')

    if (count && count >= 3) {
        return { success: false, error: 'You have too many pending requests. Please wait for a response.' }
    }

    if (requestType === 'request_bill') {
        // Prevent requesting bill if there are pending/preparing/ready orders
        const { count: activeOrders } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', sessionId)
            .in('status', ['pending', 'confirmed', 'preparing', 'ready'])
        
        if (activeOrders && activeOrders > 0) {
            return { success: false, error: 'You still have orders being prepared or waiting to be delivered! Please wait before requesting the bill.' }
        }
    }

    const { error } = await supabase
        .from('service_requests')
        .insert({
            session_id: sessionId,
            restaurant_id: restaurantId,
            request_type: requestType,
            message: message || null,
        })

    if (error) {
        console.error('Service request error:', error)
        return { success: false, error: 'Failed to send request. Please try again.' }
    }

    return { success: true }
}

export async function requestSessionOpen(
    tableId: string,
    restaurantId: string
): Promise<{ success: boolean; error?: string }> {
    const { allowed } = await verifyClientIp(restaurantId, 'customer')
    if (!allowed) {
        return { success: false, error: 'Your current network IP is not allowed to send requests for this restaurant.' }
    }

    const supabase = await createAdminClient()

    // Rate limit: 1 pending open_session request per table at a time
    const { count } = await supabase
        .from('service_requests')
        .select('*', { count: 'exact', head: true })
        .eq('table_id', tableId)
        .eq('request_type', 'open_session')
        .eq('status', 'pending')

    if (count && count >= 1) {
        return { success: false, error: 'Request already sent. Your waiter is on the way!' }
    }

    const { error } = await supabase
        .from('service_requests')
        .insert({
            session_id: null,
            table_id: tableId,
            restaurant_id: restaurantId,
            request_type: 'open_session',
        })

    if (error) {
        console.error('Request session open error:', error)
        return { success: false, error: 'Failed to send request. Please try again.' }
    }

    return { success: true }
}

export async function acknowledgeServiceRequest(
    requestId: string,
    userId: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createAdminClient()

    const { error } = await supabase
        .from('service_requests')
        .update({
            status: 'acknowledged',
            acknowledged_by: userId,
        })
        .eq('id', requestId)
        .eq('status', 'pending')

    if (error) {
        return { success: false, error: 'Failed to acknowledge request.' }
    }
    return { success: true }
}

export async function completeServiceRequest(
    requestId: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createAdminClient()

    const { error } = await supabase
        .from('service_requests')
        .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
        })
        .eq('id', requestId)

    if (error) {
        return { success: false, error: 'Failed to complete request.' }
    }
    return { success: true }
}
