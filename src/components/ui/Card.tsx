import { cn } from '@/lib/utils'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Pad the card. `false` for media/edge-to-edge content. Default 20px. */
    padding?: 20 | 24 | false
    /** Lift to --shadow-md on hover (use for tappable cards). */
    interactive?: boolean
    as?: React.ElementType
}

const PAD: Record<string, string> = { '20': 'p-5', '24': 'p-6' }

/**
 * Calm surface primitive: --surface, --r-lg, hairline border, --shadow-sm.
 * Every panel/card in the app should be a Card so radius, padding, border and
 * elevation are pixel-identical everywhere.
 */
export default function Card({
    padding = 20,
    interactive,
    as: Tag = 'div',
    className,
    children,
    ...props
}: CardProps) {
    return (
        <Tag
            className={cn(
                'bg-surface border border-hairline rounded-[var(--r-lg)] shadow-sm',
                padding !== false && PAD[String(padding)],
                interactive &&
                    'transition-[box-shadow,transform] duration-150 hover:shadow-md hover:-translate-y-px',
                className,
            )}
            {...props}
        >
            {children}
        </Tag>
    )
}
