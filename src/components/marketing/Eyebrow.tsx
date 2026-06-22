import { cn } from '@/lib/utils'

type Tone = 'brand' | 'purple'

const TONES: Record<Tone, string> = {
    brand: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/20',
    purple: 'bg-purple-50 text-[#4B207D] border-purple-100',
}

export interface EyebrowProps {
    children: React.ReactNode
    tone?: Tone
    className?: string
}

/** The little pill label above headings (e.g. "Our Story"). */
export default function Eyebrow({ children, tone = 'brand', className }: EyebrowProps) {
    return (
        <span
            className={cn(
                'inline-block rounded-full border px-4 py-1.5 text-sm font-bold tracking-wide',
                TONES[tone],
                className,
            )}
        >
            {children}
        </span>
    )
}
