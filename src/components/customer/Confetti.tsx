'use client'

import { useEffect, useState } from 'react'

const CONFETTI_COLORS = ["#E85D04", "#FFBA08", "#22C55E", "#3B82F6", "#EC4899", "#A855F7", "#F97316"]

interface Particle {
    id: number
    x: number
    color: string
    size: number
    delay: number
    duration: number
    rotate: number
    shape: "rect" | "circle" | "ribbon"
}

const PARTICLES: Particle[] = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: 5 + (i * 1.55) % 90,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 6 + (i % 5) * 1.6,
    delay: (i * 0.07) % 1.4,
    duration: 2.5 + (i % 4) * 0.5,
    rotate: (i % 2 === 0 ? 1 : -1) * (180 + (i % 5) * 72),
    shape: (["rect", "circle", "ribbon"] as const)[i % 3],
}))

export default function Confetti() {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
            <style>{`
                @keyframes confetti-fall {
                    0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
                    80%  { opacity: 1; }
                    100% { transform: translateY(100vh) rotate(var(--rot)); opacity: 0; }
                }
            `}</style>
            {PARTICLES.map(p => (
                <div
                    key={p.id}
                    style={{
                        position: "absolute",
                        left: `${p.x}%`,
                        top: "-10px",
                        width: p.shape === "ribbon" ? p.size * 0.4 : p.size,
                        height: p.shape === "ribbon" ? p.size * 2.5 : p.size,
                        background: p.color,
                        borderRadius: p.shape === "circle" ? "50%" : "2px",
                        "--rot": `${p.rotate}deg`,
                        animationName: "confetti-fall",
                        animationDuration: `${p.duration}s`,
                        animationDelay: `${p.delay}s`,
                        animationTimingFunction: "cubic-bezier(.25,.46,.45,.94)",
                        animationFillMode: "both",
                    } as any}
                />
            ))}
        </div>
    )
}
