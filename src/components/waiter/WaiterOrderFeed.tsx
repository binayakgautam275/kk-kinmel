
'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRestaurantTable } from '@/lib/realtime/useRestaurantTable'
import { markOrderDelivered, markDeliveredAndCashPaid, claimOrder, releaseOrder } from '@/app/(staff)/waiter/order-actions'
import { playOrderReady, playNewOrder } from '@/lib/audio'
import { playVoice } from '@/lib/voice'
import { toast } from 'react-hot-toast'
import { timeAgo } from '@/lib/utils'
import { useCurrency } from '@/lib/contexts/FeatureContext'
import { Package, ChefHat, Banknote, Truck, Clock, Footprints, X } from 'lucide-react'
import { Card, Button, Badge, StatusBadge, TableChip, FeedSection, EmptyState } from '@/components/ui'
import type { Order, OrderItem, MenuItem, Session, Table, OrderStatus } from '@/types/database'

export type WaiterOrder = Order & {
    sessions?: Session & { tables?: Partial<Table> }
    order_items?: (OrderItem & { menu_items?: Partial<MenuItem> })[]
}

const ORDER_SELECT = `
  id, status, total_amount, placed_at, ready_at, customer_note, payment_status, session_id,
  claimed_by, claimed_at,
  sessions ( id, tables ( label ) ),
  order_items ( id, quantity, menu_items ( name ) )
` as const

function tableLabel(order: WaiterOrder) {
    return order.sessions?.tables?.label || '?'
}

const STATUS_ORDER: Record<string, number> = { ready: 3, preparing: 2, confirmed: 1, pending: 1 }
const STALE_MS = 15 * 60 * 1000

export default function WaiterOrderFeed({ initialOrders, restaurantId, userId, staffNames = {} }: {
    initialOrders: WaiterOrder[]
    restaurantId: string
    userId: string
    staffNames?: Record<string, string>
}) {
    const [orders, setOrders] = useState<WaiterOrder[]>(initialOrders)
    const money = useCurrency()
    const ordersRef = useRef(orders)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [claimingId, setClaimingId] = useState<string | null>(null)
    const [cashProcessingId, setCashProcessingId] = useState<string | null>(null)
    const [now, setNow] = useState(() => Date.now())
    const supabaseRef = useRef(createClient())

    useEffect(() => { const i = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(i) }, [])
    useEffect(() => { ordersRef.current = orders }, [orders])

    useRestaurantTable(restaurantId, 'orders', async (payload) => {
        const supabase = supabaseRef.current
        if (payload.eventType === 'INSERT') {
            const { data } = await supabase.from('orders').select(ORDER_SELECT).eq('id', payload.new.id).single()
            if (data) {
                const order = data as unknown as WaiterOrder
                // Skip replayed/duplicate INSERTs (reconnect, multiple tabs,
                // or a row already present in initialOrders).
                if (ordersRef.current.some(o => o.id === order.id)) return
                setOrders(prev => prev.some(o => o.id === order.id) ? prev : [order, ...prev])
                playNewOrder().catch(() => {})
                playVoice('waiter_new_order')
                navigator.vibrate?.(300)
                const tbl = order.sessions?.tables?.label
                toast.custom((t) => (
                    <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-xs w-full bg-white shadow-xl rounded-xl px-4 py-3 flex items-start gap-3 border border-amber-200`}>
                        <span className="text-xl mt-0.5">🛎️</span>
                        <div>
                            <p className="font-bold text-sm text-amber-700">New Order</p>
                            <p className="text-xs text-ink-subtle mt-0.5">{tbl ? `Table ${tbl}` : 'Takeout'} · {money(order.total_amount)}</p>
                        </div>
                    </div>
                ), { duration: 5000, position: 'top-right' })
            }
        } else if (payload.eventType === 'UPDATE') {
            const newStatus = payload.new.status as OrderStatus
            const isTerminal = newStatus === 'delivered' || newStatus === 'cancelled'
            // Did this UPDATE actually move the order INTO 'ready'? Claims/releases
            // also fire UPDATEs while status stays 'ready' — those must not re-alert.
            const prevStatus = ordersRef.current.find(o => o.id === payload.new.id)?.status
            const becameReady = newStatus === 'ready' && prevStatus !== 'ready'

            // The UPDATE may be for an order we never received (created before
            // mount, or a missed INSERT). If it's still active, fetch + insert
            // it so a ready order can't silently bypass the feed.
            let fetched: WaiterOrder | null = null
            if (!isTerminal && !ordersRef.current.some(o => o.id === payload.new.id)) {
                const { data } = await supabase.from('orders').select(ORDER_SELECT).eq('id', payload.new.id).single()
                if (data) {
                    fetched = data as unknown as WaiterOrder
                    setOrders(prev => prev.some(o => o.id === fetched!.id) ? prev : [fetched!, ...prev])
                }
            }

            if (becameReady) {
                playOrderReady().catch(() => {})
                playVoice('waiter_order_ready')
                navigator.vibrate?.([200, 100, 200])
                const order = fetched ?? ordersRef.current.find(o => o.id === payload.new.id)
                const tbl = order?.sessions?.tables?.label
                toast.custom((t) => (
                    <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-xs w-full bg-white shadow-xl rounded-xl px-4 py-3 flex items-start gap-3 border-2 border-emerald-300`}>
                        <span className="text-xl mt-0.5">✅</span>
                        <div>
                            <p className="font-bold text-sm text-emerald-700">Ready for Pickup!</p>
                            <p className="text-xs text-ink-subtle mt-0.5">{tbl ? `Table ${tbl}` : 'Takeout'} · {money(payload.new.total_amount)}</p>
                        </div>
                    </div>
                ), { duration: 8000, position: 'top-right' })
            }
            setOrders(prev =>
                prev
                    .map(o => o.id === payload.new.id
                        ? { ...o, status: newStatus, payment_status: payload.new.payment_status, claimed_by: payload.new.claimed_by ?? null, claimed_at: payload.new.claimed_at ?? null }
                        : o)
                    .filter(o => !['delivered', 'cancelled'].includes(o.status))
            )
        }
    })

    const handleClaim = async (orderId: string) => {
        setClaimingId(orderId)
        // Optimistically show it as mine; realtime + server reconcile the truth.
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, claimed_by: userId, claimed_at: new Date().toISOString() } : o))
        const res = await claimOrder(orderId)
        if (res?.error) {
            // Lost the claim — reflect who actually has it.
            const winner = res.claimedById ?? null
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, claimed_by: winner } : o))
            const name = winner ? staffNames[winner] : undefined
            toast.error(name ? `${name} already claimed this order` : 'This order was already claimed')
        }
        setClaimingId(null)
    }

    const handleRelease = async (orderId: string) => {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, claimed_by: null, claimed_at: null } : o))
        const res = await releaseOrder(orderId)
        if (res?.error) toast.error('Could not release order')
    }

    const handleMarkDelivered = async (orderId: string) => {
        setProcessingId(orderId)
        const removed = ordersRef.current.find(o => o.id === orderId)
        setOrders(prev => prev.filter(o => o.id !== orderId))
        const res = await markOrderDelivered(orderId)
        if (res?.error) {
            // Restore the card so the waiter sees it's still in play.
            if (removed) setOrders(prev => prev.some(o => o.id === orderId) ? prev : [removed, ...prev])
            toast.error(res.conflict ? 'Another waiter already handled this order' : 'Could not mark delivered')
        }
        setProcessingId(null)
    }

    const handleCashAndDeliver = async (orderId: string) => {
        setCashProcessingId(orderId)
        setOrders(prev => prev.filter(o => o.id !== orderId))
        const res = await markDeliveredAndCashPaid(orderId)
        if (res.error) toast.error(res.error)
        else toast.success(res.tableClosed ? 'Cash received — table closed ✅' : 'Cash received ✓')
        setCashProcessingId(null)
    }

    // Sort all orders: Ready first, then Preparing, then Pending
    const sortedOrders = useMemo(() => {
        return [...orders].sort((a, b) => {
            const scoreA = STATUS_ORDER[a.status] ?? 0
            const scoreB = STATUS_ORDER[b.status] ?? 0
            if (scoreA !== scoreB) return scoreB - scoreA
            return new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime()
        })
    }, [orders])

    if (orders.length === 0) {
        return (
            <FeedSection icon={Package} title="Live Orders">
                <Card padding={24}>
                    <EmptyState icon={ChefHat} title="No active orders" description="Incoming orders will appear here in real time." />
                </Card>
            </FeedSection>
        )
    }

    const totalReady = orders.filter(o => o.status === 'ready').length

    return (
        <FeedSection
            icon={Package}
            title="Live Orders"
            count={orders.length}
            tone="neutral"
            action={totalReady > 0 ? <Badge tone="success" dot>{totalReady} Ready</Badge> : undefined}
        >
            <div className="grid gap-3">
                {sortedOrders.map((order) => {
                    const label = tableLabel(order)
                    const isReady = order.status === 'ready'
                    const ts = (order as unknown as { ready_at?: string | null }).ready_at || order.placed_at
                    const isStale = now - new Date(ts).getTime() > STALE_MS
                    const claimedBy = order.claimed_by
                    const mineClaim = claimedBy === userId
                    const claimedByOther = !!claimedBy && !mineClaim
                    const claimerName = claimedBy ? staffNames[claimedBy] : undefined

                    return (
                        <Card key={order.id} padding={false} className={`${isReady ? 'border-success/30' : ''} ${claimedByOther ? 'opacity-60' : ''}`.trim() || undefined}>
                            <div className="p-4 md:p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <TableChip label={label} size="lg" />
                                            <StatusBadge status={order.status} />
                                            {isStale && isReady && <Badge tone="danger" className="animate-pulse">Cold warning!</Badge>}
                                        </div>
                                        <div className="text-small text-ink-subtle flex items-center gap-2">
                                            <Clock size={12} /> {timeAgo(order.placed_at)}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-display block text-ink">{money(order.total_amount)}</span>
                                        <span className="text-caption text-ink-muted">{order.payment_status}</span>
                                    </div>
                                </div>

                                <div className="bg-surface-muted rounded-[var(--r-md)] p-3 mb-4">
                                    <ul className="space-y-1.5 text-body">
                                        {order.order_items?.map(item => (
                                            <li key={item.id} className="flex gap-3 text-ink">
                                                <span className="font-bold text-ink-muted w-6 text-right tabular">{item.quantity}×</span>
                                                <span className="font-medium">{item.menu_items?.name}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {order.customer_note && (
                                    <div className="mb-4">
                                        <Badge tone="warning" className="w-full justify-start p-3 whitespace-normal italic">
                                            &ldquo;{order.customer_note}&rdquo;
                                        </Badge>
                                    </div>
                                )}

                                {isReady && claimedByOther && (
                                    <div className="flex items-center justify-between gap-2 pt-2">
                                        <span className="text-small text-ink-subtle flex items-center gap-1.5">
                                            <Footprints size={14} /> {claimerName || 'A colleague'} is on the way
                                        </span>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => handleClaim(order.id)}
                                            loading={claimingId === order.id}
                                        >
                                            Take over
                                        </Button>
                                    </div>
                                )}

                                {isReady && !claimedBy && (
                                    <div className="pt-2">
                                        <Button
                                            variant="primary"
                                            size="lg"
                                            block
                                            onClick={() => handleClaim(order.id)}
                                            loading={claimingId === order.id}
                                            icon={Footprints}
                                        >
                                            On my way
                                        </Button>
                                    </div>
                                )}

                                {isReady && mineClaim && (
                                    <div className="pt-2 space-y-2">
                                        <div className="flex gap-3">
                                            <Button
                                                variant="secondary"
                                                size="lg"
                                                block
                                                onClick={() => handleCashAndDeliver(order.id)}
                                                disabled={!!cashProcessingId || !!processingId}
                                                loading={cashProcessingId === order.id}
                                                icon={Banknote}
                                            >
                                                Take Cash
                                            </Button>
                                            <Button
                                                variant="primary"
                                                size="lg"
                                                block
                                                onClick={() => handleMarkDelivered(order.id)}
                                                disabled={!!processingId || !!cashProcessingId}
                                                loading={processingId === order.id}
                                                icon={Truck}
                                            >
                                                Deliver
                                            </Button>
                                        </div>
                                        <button
                                            onClick={() => handleRelease(order.id)}
                                            className="text-caption text-ink-muted hover:text-ink flex items-center gap-1 mx-auto"
                                        >
                                            <X size={12} /> Release claim
                                        </button>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )
                })}
            </div>
        </FeedSection>
    )
}
