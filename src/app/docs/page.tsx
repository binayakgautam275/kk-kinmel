'use client'

import Link from 'next/link'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import Logo from '@/components/shared/Logo'

export default function DocsPage() {
    return (
        <div className="min-h-screen bg-slate-50 text-gray-900 relative">
            {/* Ambient dot grid background */}
            <div className="absolute inset-0 z-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

            {/* Navigation */}
            <nav className="border-b border-gray-200/50 bg-white/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <Logo className="h-8" />
                    </Link>
                    <Link href="/" className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-[var(--color-primary)] transition-colors px-4 py-2 rounded-xl hover:bg-gray-100">
                        <ArrowLeft size={16} />
                        Back to Home
                    </Link>
                </div>
            </nav>

            {/* Hero */}
            <section className="py-20 md:py-32 relative z-10 overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10">
                    <div className="inline-block bg-emerald-500/10 px-4 py-1.5 rounded-full mb-6 border border-emerald-500/20">
                        <span className="text-emerald-600 font-bold text-sm tracking-wide">Help Center</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-extrabold text-[var(--color-secondary)] tracking-tight">
                        Documentation
                    </h1>
                    <p className="mt-8 text-xl text-gray-600 leading-relaxed font-medium">
                        Complete guides to set up, manage, and scale your restaurant with kkkhane. Everything you need to know, in one place.
                    </p>
                </div>
            </section>

            {/* Docs Grid */}
            <section className="pb-24 relative z-10">
                <div className="max-w-5xl mx-auto px-4 sm:px-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        {DOCS.map((doc) => (
                            <Link
                                key={doc.id}
                                href="#"
                                className="group bg-white border border-gray-100 rounded-3xl p-8 hover:shadow-xl hover:border-[var(--color-primary)]/30 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-primary)]/5 rounded-full blur-2xl group-hover:bg-[var(--color-primary)]/10 transition-colors"></div>
                                <h3 className="text-2xl font-extrabold text-gray-900 mb-3 group-hover:text-[var(--color-primary)] transition-colors relative z-10">
                                    {doc.title}
                                </h3>
                                <p className="text-gray-500 text-lg font-medium mb-6 leading-relaxed relative z-10">{doc.description}</p>
                                <div className="inline-flex items-center text-[var(--color-primary)] font-bold text-sm relative z-10">
                                    Read Guide <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    )
}

const DOCS = [
    {
        id: 1,
        title: 'Getting Started',
        description: 'Set up your restaurant account and create your first menu in 5 minutes.',
    },
    {
        id: 2,
        title: 'Menu Management',
        description: 'Learn how to create menu items, categories, modifiers, and manage pricing.',
    },
    {
        id: 3,
        title: 'Kitchen Display System',
        description: 'Guide for kitchen staff on managing orders and updating order status.',
    },
    {
        id: 4,
        title: 'Staff Management',
        description: 'Create user accounts, assign roles, and manage staff permissions.',
    },
    {
        id: 5,
        title: 'Payments & Billing',
        description: 'Accept payments, verify transactions, and manage billing.',
    },
    {
        id: 6,
        title: 'Analytics & Reports',
        description: 'Track revenue, orders, and generate detailed business reports.',
    },
]
