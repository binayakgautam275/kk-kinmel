import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { getRatelimit, getClientIp } from '@/lib/ratelimit'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm']
const MAX_IMAGE_BYTES = 10 * 1024 * 1024  // 10MB
const MAX_VIDEO_BYTES = 100 * 1024 * 1024 // 100MB

export async function POST(req: NextRequest) {
    try {
        // Rate limit: 20 uploads per 10 minutes per IP
        const ratelimit = getRatelimit('UPLOAD', 20, 600)
        if (ratelimit) {
            const ip = await getClientIp()
            const result = await ratelimit.limit(ip)
            if (!result.success) {
                return NextResponse.json({ error: 'Upload rate limit exceeded. Try again later.' }, { status: 429 })
            }
        }

        // Auth required
        let user: Awaited<ReturnType<typeof getCurrentUser>>
        try {
            user = await getCurrentUser()
        } catch {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const formData = await req.formData()
        const file = formData.get('file') as File | null
        const type = formData.get('type') as string | null

        if (!file || file.size === 0) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        if (type !== 'image' && type !== 'video') {
            return NextResponse.json({ error: 'Invalid upload type. Must be "image" or "video".' }, { status: 400 })
        }

        // Validate MIME type and size
        if (type === 'image') {
            if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
                return NextResponse.json({ error: 'Invalid image type. Allowed: JPEG, PNG, WebP, GIF.' }, { status: 400 })
            }
            if (file.size > MAX_IMAGE_BYTES) {
                return NextResponse.json({ error: 'Image exceeds 10MB limit.' }, { status: 400 })
            }
        } else {
            if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
                return NextResponse.json({ error: 'Invalid video type. Allowed: MP4, WebM.' }, { status: 400 })
            }
            if (file.size > MAX_VIDEO_BYTES) {
                return NextResponse.json({ error: 'Video exceeds 100MB limit.' }, { status: 400 })
            }
        }

        const ext = file.name.split('.').pop()?.toLowerCase() || (type === 'image' ? 'jpg' : 'mp4')
        const path = `homepage/${user.restaurantId}/${Date.now()}.${ext}`

        const supabase = await createAdminClient()
        const { data, error } = await supabase.storage
            .from('uploads')
            .upload(path, file, {
                contentType: file.type,
                upsert: false,
            })

        if (error || !data) {
            console.error('Storage upload error:', error)
            return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
        }

        const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path)

        return NextResponse.json({ url: publicUrl }, { status: 200 })
    } catch (err) {
        console.error('Upload route error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
