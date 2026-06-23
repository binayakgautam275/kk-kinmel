// lib/uploadMedia.ts
// Direct-to-Storage upload for the browser. Gets a short-lived signed upload URL
// from /api/upload/sign, then streams the file straight to Supabase Storage —
// bypassing the ~4.5MB serverless request-body limit that broke video uploads
// going through /api/upload.

import { createClient } from '@/lib/supabase/client'

export type UploadType = 'image' | 'video' | 'audio'

// Client-side ceilings (storage also enforces the bucket file_size_limit).
const MAX_BYTES: Record<UploadType, number> = {
    image: 15 * 1024 * 1024,    // 15MB
    video: 100 * 1024 * 1024,   // 100MB
    audio: 10 * 1024 * 1024,    // 10MB
}

export interface UploadResult {
    url?: string
    error?: string
}

export async function uploadMedia(file: File, type: UploadType, folder = 'homepage'): Promise<UploadResult> {
    if (!file || file.size === 0) return { error: 'No file selected.' }
    if (file.size > MAX_BYTES[type]) {
        return { error: `${type[0].toUpperCase() + type.slice(1)} exceeds the ${Math.round(MAX_BYTES[type] / 1024 / 1024)}MB limit.` }
    }

    // 1. Ask the server for a signed upload URL (auth + path live there).
    let signed: { path: string; token: string; publicUrl: string }
    try {
        const res = await fetch('/api/upload/sign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: file.name, type, folder }),
        })
        const data = await res.json()
        if (!res.ok) return { error: data.error || 'Could not start upload.' }
        signed = data
    } catch {
        return { error: 'Network error starting upload.' }
    }

    // 2. Upload the bytes directly to Storage (no serverless body limit).
    try {
        const supabase = createClient()
        const { error } = await supabase.storage
            .from('uploads')
            .uploadToSignedUrl(signed.path, signed.token, file, {
                contentType: file.type || undefined,
            })
        if (error) return { error: error.message || 'Upload failed.' }
        return { url: signed.publicUrl }
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Upload failed.' }
    }
}
