import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import { Badge, type Tone } from './Badge'

export interface FeedSectionProps {
    icon?: LucideIcon
    title: string
    /** Count shown in the trailing pill. Hidden when undefined. */
    count?: number
    /** Tone of the count pill. */
    tone?: Tone
    /** Optional right-aligned action (link/button). */
    action?: React.ReactNode
    /** Make the header stick to the top of the scroll container. */
    sticky?: boolean
    className?: string
    children: React.ReactNode
}

/**
 * Waiter/operations section: a sticky header (icon + title + count chip) over a
 * vertical stack of OrderCards. One header language across every feed.
 */
export default function FeedSection({
    icon: Icon,
    title,
    count,
    tone = 'neutral',
    action,
    sticky,
    className,
    children,
}: FeedSectionProps) {
    return (
        <section className={cn('space-y-2.5', className)}>
            <header
                className={cn(
                    'flex items-center gap-2 py-1.5',
                    sticky && 'sticky top-0 z-10 bg-canvas/85 backdrop-blur-sm',
                )}
            >
                {Icon && <Icon size={16} className="text-ink-subtle shrink-0" />}
                <h2 className="text-h3 text-ink">{title}</h2>
                {typeof count === 'number' && (
                    <Badge tone={tone} className="tabular">
                        {count}
                    </Badge>
                )}
                {action && <div className="ml-auto">{action}</div>}
            </header>
            <div className="space-y-2.5">{children}</div>
        </section>
    )
}
