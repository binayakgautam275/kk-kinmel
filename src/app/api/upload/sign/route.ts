import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/ratelimit'

// Returns a short-lived signed upload URL so the browser can upload large files
// (esp. videos) DIRECTLY to Supabase Storage, bypassing the ~4.5MB serverless
// request-body cap that breaks /api/upload for anything bigger than a small image.

const ALLOWED_EXT: Record<'image' | 'video' | 'audio', string[]> = {
    image: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'avif'],
    video: ['mp4', 'webm', 'mov', 'm4v', '3gp'],
    audio: ['mp3', 'wav', 'ogg', 'm4a', 'webm'],
}

export async function POST(req: NextRequest) {
    try {
        const rateLimitError = await checkRateLimit('UPLOAD', 30, 600)
        if (rateLimitError) return NextResponse.json({ error: rateLimitError }, { status: 429 })

        let user: Awaited<ReturnType<typeof getCurrentUser>>
        try {
            user = await getCurrentUser()
        } catch {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json().catch(() => null) as
            { filename?: string; type?: string; folder?: string } | null
        const type = body?.type
        if (type !== 'image' && type !== 'video' && type !== 'audio') {
            return NextResponse.json({ error: 'Invalid type. Must be image, video, or audio.' }, { status: 400 })
        }

        const ext = (body?.filename?.split('.').pop()?.toLowerCase() || '')
            .replace(/[^a-z0-9]/g, '')
        if (!ext || !ALLOWED_EXT[type].includes(ext)) {
            return NextResponse.json(
                { error: `Unsupported ${type} format. Allowed: ${ALLOWED_EXT[type].join(', ')}.` },
                { status: 400 },
            )
        }

        const safeFolder = (body?.folder || 'homepage').replace(/[^a-zA-Z0-9_-]/g, '') || 'homepage'
        const path = `${safeFolder}/${user.restaurantId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

        const supabase = await createAdminClient()
        const { data, error } = await supabase.storage.from('uploads').createSignedUploadUrl(path)
        if (error || !data) {
            console.error('createSignedUploadUrl error:', error)
            return NextResponse.json({ error: error?.message || 'Could not create upload URL.' }, { status: 500 })
        }

        const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path)

        return NextResponse.json({ path: data.path, token: data.token, publicUrl }, { status: 200 })
    } catch (err) {
        console.error('Sign upload route error:', err)
        return NextResponse.json({ error: 'Failed to start upload.' }, { status: 500 })
    }
}
