'use client'

import { useMapEvents } from 'react-leaflet'
import type { LeafletMouseEvent } from 'leaflet'

/**
 * Captures map clicks and reports the lat/lng. Lives in its own client module
 * so it can be dynamically imported (ssr: false) alongside the Leaflet map —
 * react-leaflet hooks must run on the client only and can't be dynamic()-wrapped.
 */
export default function MapClickHandler({
    onLocationSelect,
}: {
    onLocationSelect: (lat: number, lng: number) => void
}) {
    useMapEvents({
        click(e: LeafletMouseEvent) {
            onLocationSelect(e.latlng.lat, e.latlng.lng)
        },
    })
    return null
}
