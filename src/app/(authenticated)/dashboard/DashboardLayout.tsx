'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import VideoLogo from '@/components/shared/VideoLogo'
import { LayoutDashboard, Settings, Users, CreditCard, ExternalLink, Menu, X, LogOut } from 'lucide-react'

interface Props {
    children: React.ReactNode
    restaurantName: string
    userName: string
}

const NAV_ITEMS = [
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings },
    { label: 'Team', href: '/dashboard/team', icon: Users },
    { label: 'Billing', href: '/dashboard/billing', icon: CreditCard },
]

export default function DashboardLayout({ children, restaurantName, userName }: Props) {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const [mobileOpen, setMobileOpen] = useState(false)

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/')
    }

    const navContent = (
        <nav className="flex flex-col h-full">
            <div className="px-4 py-5 border-b border-gray-100">
                <VideoLogo className="h-7" />
                <p className="text-xs text-gray-500 mt-1 truncate font-medium">{restaurantName}</p>
            </div>

            <div className="flex-1 px-3 py-4 space-y-1">
                {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
                    const active = pathname === href
                    return (
                        <Link
                            key={href}
                            href={href}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                active
                                    ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                        >
                            <Icon size={18} />
                            {label}
                        </Link>
                    )
                })}
            </div>

            <div className="px-3 pb-2">
                <Link
                    href="/admin/dashboard"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors border border-dashed border-gray-300"
                >
                    <ExternalLink size={16} />
                    Open Admin Panel
                </Link>
            </div>

            <div className="px-3 pb-4 border-t border-gray-100 pt-3">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-gray-700 font-medium truncate min-w-0">{userName}</span>
                    <button
                        onClick={handleSignOut}
                        className="shrink-0 p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Sign out"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </div>
        </nav>
    )

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar — desktop */}
            <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-200 fixed top-0 left-0 h-full z-30">
                {navContent}
            </aside>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div className="md:hidden fixed inset-0 z-40 flex">
                    <div className="fixed inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
                    <aside className="relative w-64 bg-white h-full shadow-xl flex flex-col z-50">
                        <button
                            onClick={() => setMobileOpen(false)}
                            className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-900"
                        >
                            <X size={20} />
                        </button>
                        {navContent}
                    </aside>
                </div>
            )}

            {/* Mobile top bar */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-20 flex items-center px-4 justify-between">
                <button onClick={() => setMobileOpen(true)} className="p-2 text-gray-500 hover:text-gray-900">
                    <Menu size={20} />
                </button>
                <VideoLogo className="h-6" />
                <button onClick={handleSignOut} className="p-2 text-gray-500 hover:text-gray-900">
                    <LogOut size={18} />
                </button>
            </div>

            {/* Page content */}
            <main className="flex-1 md:ml-56 pt-14 md:pt-0">
                {children}
            </main>
        </div>
    )
}
