// src/lib/audio.ts — notification sound system

let audioCtx: AudioContext | null = null
let customSoundUrl: string | null = '/sounds/kkkhane.mp3'

// ─── AudioContext lifecycle ───────────────────────────────────────────────────

function getCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext ||
                (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
        } catch { return null }
    }
    return audioCtx
}

async function runningCtx(): Promise<AudioContext | null> {
    const c = getCtx()
    if (!c) return null
    if (c.state === 'suspended') {
        try { await c.resume() } catch { return null }
    }
    return c.state === 'running' ? c : null
}

/** Resume the AudioContext after a user gesture. Returns true when audio is ready. */
export async function unlockAudio(): Promise<boolean> {
    const c = getCtx()
    if (!c) return false
    if (c.state === 'suspended') {
        try { await c.resume() } catch { return false }
    }
    return c.state === 'running'
}

/** True if the AudioContext is still suspended (hasn't been unlocked by user gesture yet). */
export function isAudioLocked(): boolean {
    const c = getCtx()
    return !c || c.state === 'suspended'
}

// ─── Custom sound URL ─────────────────────────────────────────────────────────

// Decoded audio buffer cache, keyed by URL. The custom sound plays through the
// same AudioContext as the synthesised pips so it benefits from the one-time
// user-gesture unlock — a fresh `new Audio()` element has its OWN autoplay
// gating that the AudioContext resume does NOT lift, so it would be blocked when
// fired from a realtime event (no gesture) and silently fall back to the pips.
let decodedBuffer: AudioBuffer | null = null
let decodedFor: string | null = null
let decodePromise: Promise<AudioBuffer | null> | null = null

/**
 * Set a custom notification sound URL (MP3 / WAV).
 * When set, all notification functions play this file instead of synthesised tones.
 */
export function setCustomNotificationSound(url: string | null) {
    const next = url || '/sounds/kkkhane.mp3'
    if (next !== customSoundUrl) {
        // Invalidate the decoded buffer so the new sound is fetched on next play.
        decodedBuffer = null
        decodedFor = null
        decodePromise = null
    }
    customSoundUrl = next
}

async function getDecodedBuffer(c: AudioContext, url: string): Promise<AudioBuffer | null> {
    if (decodedBuffer && decodedFor === url) return decodedBuffer
    if (decodePromise && decodedFor === url) return decodePromise

    decodedFor = url
    decodePromise = (async () => {
        try {
            const res = await fetch(url)
            if (!res.ok) return null
            const data = await res.arrayBuffer()
            const buf = await c.decodeAudioData(data)
            decodedBuffer = buf
            return buf
        } catch {
            return null
        }
    })()
    return decodePromise
}

async function playCustomSound(): Promise<boolean> {
    if (!customSoundUrl) return false

    // Preferred path: decode + play through the unlocked AudioContext. Works for
    // realtime-triggered notifications (no user gesture) once audio is unlocked.
    const c = await runningCtx()
    if (c) {
        const buf = await getDecodedBuffer(c, customSoundUrl)
        if (buf) {
            try {
                const src = c.createBufferSource()
                const gain = c.createGain()
                gain.gain.setValueAtTime(0.7, c.currentTime)
                src.buffer = buf
                src.connect(gain)
                gain.connect(c.destination)
                src.start()
                return true
            } catch { /* fall through to HTMLAudio */ }
        }
    }

    // Fallback: HTMLAudioElement. Only succeeds inside a user gesture (e.g. the
    // admin "Test sound" button), but harmless to try.
    return new Promise((resolve) => {
        const audio = new Audio(customSoundUrl!)
        audio.volume = 0.7
        audio.play().then(() => resolve(true)).catch(() => resolve(false))
    })
}

// ─── Synthesised pips ────────────────────────────────────────────────────────

function pip(
    c: AudioContext,
    freq: number,
    startTime: number,
    duration = 0.12,
    volume = 0.35,
) {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, startTime)
    gain.gain.setValueAtTime(volume, startTime)
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
    osc.connect(gain)
    gain.connect(c.destination)
    osc.start(startTime)
    osc.stop(startTime + duration + 0.02)
}

// ─── Public notification functions ───────────────────────────────────────────

/**
 * Double pip (pip pip) — new dine-in order placed.
 * Kitchen + admin alert.
 */
export async function playNewOrder() {
    if (await playCustomSound()) return
    const c = await runningCtx()
    if (!c) return
    const t = c.currentTime
    pip(c, 880, t)
    pip(c, 1100, t + 0.22)
}

/**
 * Triple ascending pip — order is ready for pickup (waiter alert).
 */
export async function playOrderReady() {
    if (await playCustomSound()) return
    const c = await runningCtx()
    if (!c) return
    const t = c.currentTime
    pip(c, 660, t, 0.08, 0.3)
    pip(c, 880, t + 0.15, 0.08, 0.3)
    pip(c, 1100, t + 0.30, 0.12, 0.35)
}

/**
 * Single attention pip — new service request.
 */
export async function playServiceRequest() {
    if (await playCustomSound()) return
    const c = await runningCtx()
    if (!c) return
    pip(c, 660, c.currentTime, 0.2, 0.3)
}

/**
 * Subtle pip — customer-facing order status change.
 */
export async function playStatusUpdate() {
    if (await playCustomSound()) return
    const c = await runningCtx()
    if (!c) return
    pip(c, 528, c.currentTime, 0.15, 0.15)
}

// Backwards-compatible alias (kitchen + waiter feeds still reference this)
export function playKitchenPing() {
    playNewOrder().catch(() => {})
}
