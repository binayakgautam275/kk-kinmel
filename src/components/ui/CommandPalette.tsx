'use client'

import { useEffect, useState } from 'react'
import { Command } from 'cmdk'
import { useRouter } from 'next/navigation'
import {
    Search,
    LayoutDashboard,
    UtensilsCrossed,
    Users,
    Settings,
    FileText,
    ChefHat,
    ShoppingBag,
} from 'lucide-react'

export function CommandPalette() {
    const [open, setOpen] = useState(false)
    const router = useRouter()

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }
        document.addEventListener('keydown', down)
        return () => document.removeEventListener('keydown', down)
    }, [])

    const runCommand = (command: () => void) => {
        setOpen(false)
        command()
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-ink/40 backdrop-blur-sm animate-fade-in">
            <Command
                className="w-full max-w-lg overflow-hidden bg-surface rounded-[var(--r-lg)] shadow-lg border border-hairline"
                loop
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center px-4 border-b border-hairline">
                    <Search className="size-5 text-ink-subtle mr-2" />
                    <Command.Input
                        autoFocus
                        placeholder="Type a command or search..."
                        className="flex-1 h-12 bg-transparent text-ink placeholder:text-ink-subtle focus:outline-none text-body"
                    />
                    <button
                        onClick={() => setOpen(false)}
                        className="text-caption text-ink-subtle hover:text-ink px-2 py-1 rounded bg-surface-muted ml-2 transition-colors duration-150"
                    >
                        ESC
                    </button>
                </div>

                <Command.List className="max-h-[300px] overflow-y-auto p-2 scrollbar-thin">
                    <Command.Empty className="py-6 text-center text-small text-ink-muted">
                        No results found.
                    </Command.Empty>

                    <Command.Group heading="Navigation" className="text-caption text-ink-subtle px-2 py-1.5 font-semibold uppercase tracking-wider">
                        <Command.Item
                            onSelect={() => runCommand(() => router.push('/dashboard'))}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-ink rounded-md cursor-pointer aria-selected:bg-brand-50 aria-selected:text-brand-700 transition-colors"
                        >
                            <LayoutDashboard size={16} /> Admin Overview
                        </Command.Item>
                        <Command.Item
                            onSelect={() => runCommand(() => router.push('/dashboard/menu'))}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-ink rounded-md cursor-pointer aria-selected:bg-brand-50 aria-selected:text-brand-700 transition-colors"
                        >
                            <UtensilsCrossed size={16} /> Menu Management
                        </Command.Item>
                        <Command.Item
                            onSelect={() => runCommand(() => router.push('/dashboard/team'))}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-ink rounded-md cursor-pointer aria-selected:bg-brand-50 aria-selected:text-brand-700 transition-colors"
                        >
                            <Users size={16} /> Staff & Team
                        </Command.Item>
                        <Command.Item
                            onSelect={() => runCommand(() => router.push('/dashboard/settings'))}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-ink rounded-md cursor-pointer aria-selected:bg-brand-50 aria-selected:text-brand-700 transition-colors"
                        >
                            <Settings size={16} /> Settings
                        </Command.Item>
                    </Command.Group>

                    <Command.Group heading="Operations" className="text-caption text-ink-subtle px-2 py-1.5 font-semibold uppercase tracking-wider mt-2">
                        <Command.Item
                            onSelect={() => runCommand(() => router.push('/waiter'))}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-ink rounded-md cursor-pointer aria-selected:bg-brand-50 aria-selected:text-brand-700 transition-colors"
                        >
                            <ShoppingBag size={16} /> Waiter Portal
                        </Command.Item>
                        <Command.Item
                            onSelect={() => runCommand(() => router.push('/kitchen'))}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-ink rounded-md cursor-pointer aria-selected:bg-brand-50 aria-selected:text-brand-700 transition-colors"
                        >
                            <ChefHat size={16} /> Kitchen Display System
                        </Command.Item>
                        <Command.Item
                            onSelect={() => runCommand(() => router.push('/cashier'))}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-ink rounded-md cursor-pointer aria-selected:bg-brand-50 aria-selected:text-brand-700 transition-colors"
                        >
                            <FileText size={16} /> Cashier / Billing
                        </Command.Item>
                    </Command.Group>
                </Command.List>
            </Command>
        </div>
    )
}

export function CommandHint({ className }: { className?: string }) {
    return (
        <div className={`hidden sm:flex items-center gap-1.5 text-caption text-ink-subtle ${className}`}>
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 rounded border border-hairline-strong bg-surface-muted font-sans tabular font-medium">⌘K</kbd>
            <span>to jump</span>
        </div>
    )
}
