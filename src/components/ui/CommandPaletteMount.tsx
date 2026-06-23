'use client'

import dynamic from 'next/dynamic'
import type { CommandPaletteTheme } from './CommandPalette'

// Lazy-load the palette (and cmdk) out of the initial bundle. It renders
// nothing until opened, so there is no layout shift.
const CommandPalette = dynamic(
    () => import('./CommandPalette').then((m) => m.CommandPalette),
    { ssr: false },
)

interface Props {
    /** Current user's role — the palette lists only routes this role can reach. */
    role?: string
    /** Match the surrounding surface (kitchen uses the dark theme). */
    theme?: CommandPaletteTheme
}

/** Mount once near the top of an authenticated layout. */
export default function CommandPaletteMount({ role, theme }: Props) {
    return <CommandPalette role={role} theme={theme} />
}
