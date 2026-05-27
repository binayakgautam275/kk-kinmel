'use client'

import { useState, useEffect, useRef } from 'react'
import {
    LayoutDashboard, Building2, UtensilsCrossed, ShoppingBag, CreditCard, Truck,
    Users, Clock, DollarSign, Heart, Tag, Package, Grid3X3, FileText,
    TrendingUp, Settings, LogOut, Menu, X, Crown, BarChart3
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import VideoLogo from '@/components/shared/VideoLogo'
import { createClient } from '@/lib/supabase/client'

const BASE = '/admin/super-admin'

export default function SuperAdminSidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const [isOpen, setIsOpen] = useState(false)
    const prevPathRef = useRef(pathname)

    useEffect(() => {
        if (prevPathRef.current !== pathname) {
            prevPathRef.current = pathname
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
                <div className="flex items-center gap-3">
                    <VideoLogo className="h-8" />
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="md:hidden p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Super Admin badge */}
            <div className="mx-3 mt-3 mb-1 flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2">
                <Crown size={14} className="text-indigo-600 shrink-0" />
                <span className="text-xs font-bold text-indigo-700 tracking-wide uppercase">Super Admin</span>
            </div>

            <nav className="flex-1 p-3 md:p-4 space-y-1 overflow-y-auto">
                {/* Overview */}
                <div className="mb-1">
                    <h4 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Overview</h4>
                    <NavLink href={`${BASE}/dashboard`} icon={LayoutDashboard} label="Dashboard" currentPath={pathname} />
                    <NavLink href={`${BASE}/analytics`} icon={BarChart3} label="Analytics" currentPath={pathname} />
                </div>

                <div className="pt-3 mt-2 border-t border-gray-100">
                    <h4 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Tenant Management</h4>
                    <NavLink href={`${BASE}/restaurants`} icon={Building2} label="Restaurants" currentPath={pathname} />
                    <NavLink href={`${BASE}/payments`} icon={CreditCard} label="Payments" currentPath={pathname} />
                </div>

                <div className="pt-3 mt-2 border-t border-gray-100">
                    <h4 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Operations</h4>
                    <NavLink href={`${BASE}/menus`} icon={UtensilsCrossed} label="Menus" currentPath={pathname} />
                    <NavLink href={`${BASE}/orders`} icon={ShoppingBag} label="Orders" currentPath={pathname} />
                    <NavLink href={`${BASE}/takeout`} icon={Truck} label="Takeout" currentPath={pathname} />
                </div>

                <div className="pt-3 mt-2 border-t border-gray-100">
                    <h4 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">People</h4>
                    <NavLink href={`${BASE}/staff`} icon={Users} label="Staff" currentPath={pathname} />
                    <NavLink href={`${BASE}/shifts`} icon={Clock} label="Staff Shifts" currentPath={pathname} />
                </div>

                <div className="pt-3 mt-2 border-t border-gray-100">
                    <h4 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Features</h4>
                    <NavLink href={`${BASE}/pricing`} icon={DollarSign} label="Dynamic Pricing" currentPath={pathname} />
                    <NavLink href={`${BASE}/loyalty`} icon={Heart} label="Loyalty" currentPath={pathname} />
                    <NavLink href={`${BASE}/promos`} icon={Tag} label="Promo Codes" currentPath={pathname} />
                    <NavLink href={`${BASE}/ingredients`} icon={Package} label="Ingredients" currentPath={pathname} />
                    <NavLink href={`${BASE}/tables`} icon={Grid3X3} label="Tables & QR" currentPath={pathname} />
                </div>

                <div className="pt-3 mt-2 border-t border-gray-100">
                    <h4 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Reporting</h4>
                    <NavLink href={`${BASE}/reports`} icon={FileText} label="EOD Reports" currentPath={pathname} />
                </div>

                <div className="pt-3 mt-2 border-t border-gray-100">
                    <h4 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Platform</h4>
                    <NavLink href={`${BASE}/config`} icon={Settings} label="Config" currentPath={pathname} />
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
            <button
                onClick={() => setIsOpen(true)}
                className="md:hidden fixed top-3 left-3 z-40 p-2.5 bg-white border border-gray-200 rounded-xl shadow-md text-gray-700 hover:bg-gray-50 active:scale-95 transition"
                aria-label="Open menu"
            >
                <Menu size={22} />
            </button>

            {isOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside
                className={`
                    md:hidden fixed top-0 left-0 bottom-0 w-72 bg-white z-50 flex flex-col shadow-2xl
                    transition-transform duration-300 ease-out
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                {sidebarContent}
            </aside>

            <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 shrink-0 flex-col z-20">
                {sidebarContent}
            </aside>
        </>
    )
}

function NavLink({ href, icon: Icon, label, currentPath }: {
    href: string
    icon: React.ElementType
    label: string
    currentPath: string
}) {
    const isActive = currentPath === href || currentPath.startsWith(`${href}/`)

    return (
        <Link
            href={href}
            className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors active:scale-[0.98]
                ${isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
            `}
        >
            <Icon size={18} className={isActive ? 'text-indigo-600' : 'text-gray-400'} />
            {label}
        </Link>
    )
}
