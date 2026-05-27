'use client'

import { useEffect, useState } from 'react'

export default function CopyrightYear() {
    const [year, setYear] = useState<number | null>(null)

    useEffect(() => {
        setYear(new Date().getFullYear())
    }, [])

    // During hydration, render nothing or a placeholder
    if (year === null) return <span>2026</span>

    return <span>{year}</span>
}
