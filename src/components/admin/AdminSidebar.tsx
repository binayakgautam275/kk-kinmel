'use client'

import { useState, useEffect, useRef } from 'react'
import { Users, UtensilsCrossed, Settings, LogOut, BarChart3, Palette, Grid3X3, Menu, X, TrendingUp, ShoppingBag, Tag, Heart, DollarSign, Package, FileText, Truck, Clock, CreditCard } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import VideoLogo from '@/components/shared/VideoLogo'
import { createClient } from '@/lib/supabase/client'

export default function AdminSidebar({ userRole, restaurantName }: { userRole?: string; restaurantName?: string }) {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const [isOpen, setIsOpen] = useState(false)
    const prevPathRef = useRef(pathname)

    // Auto-close drawer on route change
    useEffect(() => {
        if (prevPathRef.current !== pathname) {
            prevPathRef.current = pathname
            // Defer to avoid synchronous setState within render cycle
            queueMicrotask(() => setIsOpen(false))
        }
    }, [pathname])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const sidebarContent = (
        <>
            <div className="p-5 md:p-6 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                    <VideoLogo className="h-8 shrink-0" />
                    {restaurantName && (
                        <span className="text-sm font-semibold text-gray-800 truncate">{restaurantName}</span>
                    )}
                </div>
                {/* Close button — mobile only */}
                <button
                    onClick={() => setIsOpen(false)}
                    className="md:hidden p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 shrink-0"
                >
                    <X size={20} />
                </button>
            </div>

            <nav className="flex-1 p-3 md:p-4 space-y-1 overflow-y-auto">
                <NavLink href="/admin/dashboard" icon={BarChart3} label="Overview" currentPath={pathname} />
                <NavLink href="/admin/menu" icon={UtensilsCrossed} label="Menu" currentPath={pathname} />
                <NavLink href="/admin/orders" icon={ShoppingBag} label="Orders" currentPath={pathname} />
                <NavLink href="/admin/payments" icon={CreditCard} label="Payments" currentPath={pathname} />
                <NavLink href="/admin/takeout" icon={Truck} label="Takeout" currentPath={pathname} />
                <NavLink href="/admin/staff" icon={Users} label="Staff" currentPath={pathname} />
                <NavLink href="/admin/tables" icon={Grid3X3} label="Tables & QR" currentPath={pathname} />
                <NavLink href="/admin/analytics" icon={TrendingUp} label="Analytics" currentPath={pathname} />

                <div className="pt-3 mt-3 border-t border-gray-100">
                    <h4 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Revenue</h4>
                    <NavLink href="/admin/pricing" icon={DollarSign} label="Dynamic Pricing" currentPath={pathname} />
                    <NavLink href="/admin/promos" icon={Tag} label="Promo Codes" currentPath={pathname} />
                    <NavLink href="/admin/loyalty" icon={Heart} label="Loyalty Program" currentPath={pathname} />
                    <NavLink href="/admin/reports" icon={FileText} label="EOD Reports" currentPath={pathname} />
                </div>

                <div className="pt-3 mt-3 border-t border-gray-100">
                    <h4 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Operations</h4>
                    <NavLink href="/admin/ingredients" icon={Package} label="Ingredients" currentPath={pathname} />
                    <NavLink href="/admin/shifts" icon={Clock} label="Staff Shifts" currentPath={pathname} />
                </div>

                <div className="pt-3 mt-3 border-t border-gray-100">
                    <h4 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Config</h4>
                    <NavLink href="/admin/homepage" icon={Palette} label="Homepage" currentPath={pathname} />
                    <NavLink href="/admin/theme" icon={Palette} label="Brand & Theme" currentPath={pathname} />
                    <NavLink href="/admin/settings" icon={Settings} label="Settings" currentPath={pathname} />
                </div>
            </nav>

            <div className="p-3 md:p-4 border-t border-gray-200">
                <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-600 hover:text-red-500 hover:bg-red-50 rounded-lg transition active:scale-95"
                >
                    <LogOut size={18} />
                    Sign Out
                </button>
            </div>
        </>
    )

    return (
        <>
            {/* Mobile hamburger trigger — rendered in the layout header */}
            <button
                onClick={() => setIsOpen(true)}
                className="md:hidden fixed top-3 left-3 z-40 p-2.5 bg-white border border-gray-200 rounded-xl shadow-md text-gray-700 hover:bg-gray-50 active:scale-95 transition"
                aria-label="Open menu"
            >
                <Menu size={22} />
            </button>

            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Mobile Drawer */}
            <aside
                className={`
                    md:hidden fixed top-0 left-0 bottom-0 w-72 bg-white z-50 flex flex-col shadow-2xl
                    transition-transform duration-300 ease-out
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                {sidebarContent}
            </aside>

            {/* Desktop Sidebar — always visible on md+ */}
            <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 shrink-0 flex-col z-20">
                {sidebarContent}
            </aside>
        </>
    )
}

function NavLink({ href, icon: Icon, label, currentPath }: { href: string, icon: React.ElementType, label: string, currentPath: string }) {
    const isActive = currentPath === href || currentPath.startsWith(`${href}/`)

    return (
        <Link
            href={href}
            className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors active:scale-[0.98]
                ${isActive
                    ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
            `}
        >
            <Icon size={18} className={isActive ? 'text-[var(--color-primary)]' : 'text-gray-400'} />
            {label}
        </Link>
    )
}
