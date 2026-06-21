'use client'

import dynamic from 'next/dynamic'

// Lazy-load the palette (and cmdk) out of the initial bundle. It renders
// nothing until opened, so there is no layout shift.
const CommandPalette = dynamic(
    () => import('./CommandPalette').then((m) => m.CommandPalette),
    { ssr: false },
)

/** Mount once near the top of an authenticated layout. */
export default function CommandPaletteMount() {
    return <CommandPalette />
}
