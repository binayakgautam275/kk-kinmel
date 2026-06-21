import { cn } from '@/lib/utils'
import Card from './Card'

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>

/** Shimmer block. Compose to match the real layout — never a page spinner. */
export function Skeleton({ className, ...props }: SkeletonProps) {
    return <div className={cn('shimmer rounded-[var(--r-md)]', className)} {...props} />
}

/** Ready-made KPI-card skeleton matching <StatCard> dimensions. */
export function StatCardSkeleton() {
    return (
        <Card padding={20} className="flex flex-col gap-3">
            <Skeleton className="size-9 rounded-[var(--r-md)]" />
            <div className="flex flex-col gap-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-28" />
            </div>
        </Card>
    )
}

/** Ready-made list/order-card skeleton. */
export function RowSkeleton() {
    return (
        <Card padding={20} className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-[var(--r-md)]" />
            <div className="flex-1 flex flex-col gap-2">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-5 w-16" />
        </Card>
    )
}

export default Skeleton
