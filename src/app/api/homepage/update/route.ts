import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser()
        const supabase = await createAdminClient()

        const body = await req.json()
        const { restaurant_id, ...configData } = body

        // Verify user has access to this restaurant
        const { data: userData } = await supabase
            .from('users')
            .select('restaurant_id')
            .eq('id', user.id)
            .single()

        if (userData?.restaurant_id !== restaurant_id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            )
        }

        // Check if homepage config exists
        const { data: existing } = await supabase
            .from('homepage_configs')
            .select('id')
            .eq('restaurant_id', restaurant_id)
            .single()

        if (existing) {
            // Update existing
            const { data: updatedConfig, error } = await supabase
                .from('homepage_configs')
                .update({
                    ...configData,
                    updated_at: new Date().toISOString()
                })
                .eq('restaurant_id', restaurant_id)
                .select()
                .single()

            if (error) {
                console.error('Homepage update error:', error)
                return NextResponse.json(
                    { error: error.message },
                    { status: 400 }
                )
            }

            return NextResponse.json({
                success: true,
                config: updatedConfig
            })
        } else {
            // Create new
            const { data: newConfig, error } = await supabase
                .from('homepage_configs')
                .insert({
                    restaurant_id,
                    ...configData,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single()

            if (error) {
                console.error('Homepage create error:', error)
                return NextResponse.json(
                    { error: error.message },
                    { status: 400 }
                )
            }

            return NextResponse.json({
                success: true,
                config: newConfig
            }, { status: 201 })
        }
    } catch (error) {
        console.error('Homepage endpoint error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
