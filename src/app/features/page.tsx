'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react'
import Logo from '@/components/shared/Logo'

export default function FeaturesPage() {
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
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="max-w-3xl mx-auto text-center">
                        <h1 className="text-4xl md:text-5xl font-bold text-[var(--color-secondary)]">
                            Every Feature You Need
                        </h1>
                        <p className="mt-6 text-lg text-gray-600">
                            Comprehensive restaurant management all-in-one platform built specifically for Nepal's hospitality industry.
                        </p>
                    </div>
                </div>
            </section>

            {/* Feature Grid */}
            <section className="py-16 md:py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="grid md:grid-cols-2 gap-8">
                        {FEATURES.map((feature) => (
                            <div key={feature.id} className="bg-gray-50 border border-gray-100 rounded-2xl p-8 hover:shadow-lg transition">
                                <div className="w-12 h-12 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] mb-5">
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                                <p className="text-gray-600 mb-5">{feature.description}</p>
                                <ul className="space-y-2">
                                    {feature.items.map((item) => (
                                        <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                                            <CheckCircle size={16} className="text-green-500 shrink-0" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-16 md:py-24 bg-[var(--color-secondary)]">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white">
                        Ready to get started?
                    </h2>
                    <p className="mt-4 text-lg text-gray-400">
                        Start your free trial today. No credit card required.
                    </p>
                    <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/signup"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[var(--color-primary)] hover:opacity-90 text-white font-semibold rounded-xl transition"
                        >
                            Start Free Trial <ArrowRight size={20} />
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    )
}

const FEATURES = [
    {
        id: 1,
        title: 'QR Code Ordering',
        icon: '📱',
        description: 'Customers scan QR codes at their table to access your menu instantly on any smartphone.',
        items: ['No app download required', 'Real-time menu updates', 'Multiple modifier groups', 'Image support for dishes'],
    },
    {
        id: 2,
        title: 'Kitchen Display System',
        icon: '👨‍🍳',
        description: 'Real-time order management with live updates and color-coded status tracking for kitchen staff.',
        items: ['Live order queue', 'Status management', 'Takeout order queue', 'Prep time tracking'],
    },
    {
        id: 3,
        title: 'Nepal QR Payments',
        icon: '💳',
        description: 'Accept all major Nepal payment methods with screenshot verification and full VAT compliance.',
        items: ['eSewa, Khalti, Fonepay', 'Screenshot verification', 'VAT & PAN compliant', 'Automatic invoice generation'],
    },
    {
        id: 4,
        title: 'Staff Management',
        icon: '👥',
        description: 'Complete staff management with role-based access, shift tracking, and performance analytics.',
        items: ['4 staff role types', 'Shift clock in/out', 'Break tracking', 'Performance metrics'],
    },
    {
        id: 5,
        title: 'Loyalty Program',
        icon: '🎁',
        description: 'Build customer loyalty with tiered rewards, points systems, and birthday bonuses.',
        items: ['4 membership tiers', 'Points earn/redeem', 'Birthday bonuses', 'Referral rewards'],
    },
    {
        id: 6,
        title: 'Analytics & Reports',
        icon: '📊',
        description: 'Comprehensive business analytics with revenue trends, KPIs, and detailed Z-reports.',
        items: ['7-day trend charts', 'EOD Z-reports', 'Revenue tracking', 'COGS analysis'],
    },
]
