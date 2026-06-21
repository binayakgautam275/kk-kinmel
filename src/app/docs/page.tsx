'use client'

import Link from 'next/link'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import Logo from '@/components/shared/Logo'

export default function DocsPage() {
    return (
        <div className="min-h-screen bg-white text-gray-900">
            {/* Navigation */}
            <nav className="border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <Logo className="h-7" />
                    </Link>
                    <Link href="/" className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900">
                        <ArrowLeft size={16} />
                        Back
                    </Link>
                </div>
            </nav>

            {/* Hero */}
            <section className="py-16 md:py-24">
                <div className="max-w-3xl mx-auto px-4 sm:px-6">
                    <h1 className="text-4xl md:text-5xl font-bold text-[var(--color-secondary)]">
                        Documentation
                    </h1>
                    <p className="mt-6 text-lg text-gray-600">
                        Complete guides to set up, manage, and scale your restaurant with kkkhane.
                    </p>
                </div>
            </section>

            {/* Docs Grid */}
            <section className="py-16 md:py-24">
                <div className="max-w-5xl mx-auto px-4 sm:px-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        {DOCS.map((doc) => (
                            <a
                                key={doc.id}
                                href="#"
                                className="bg-gray-50 border border-gray-100 rounded-xl p-6 hover:shadow-lg hover:border-gray-200 transition group"
                            >
                                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[var(--color-primary)] transition">
                                    {doc.title}
                                </h3>
                                <p className="text-gray-600 text-sm mb-4">{doc.description}</p>
                                <span className="inline-flex items-center gap-1 text-[var(--color-primary)] font-medium text-sm">
                                    Read More <ChevronRight size={16} />
                                </span>
                            </a>
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
