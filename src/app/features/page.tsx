'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react'
import Logo from '@/components/shared/Logo'

export default function FeaturesPage() {
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
            <section className="py-20 md:py-32 relative z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="max-w-3xl mx-auto text-center">
                        <div className="inline-block bg-[var(--color-primary)]/10 px-4 py-1.5 rounded-full mb-6 border border-[var(--color-primary)]/20">
                            <span className="text-[var(--color-primary)] font-bold text-sm tracking-wide">Platform Capabilities</span>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-extrabold text-[var(--color-secondary)] tracking-tight">
                            Every Feature You Need
                        </h1>
                        <p className="mt-6 text-xl text-gray-600 leading-relaxed font-medium">
                            Comprehensive restaurant management platform built specifically for Nepal's hospitality industry.
                        </p>
                    </div>
                </div>
            </section>

            {/* Feature Grid */}
            <section className="pb-24 relative z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {FEATURES.map((feature) => (
                            <Link href={`/features/${feature.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} key={feature.id} className="group bg-white border border-gray-100 rounded-3xl p-8 hover:shadow-2xl hover:border-[var(--color-primary)]/30 transition-all duration-300 relative overflow-hidden flex flex-col h-full hover:-translate-y-1">
                                <div className="absolute -right-10 -top-10 w-32 h-32 bg-[var(--color-primary)]/5 rounded-full blur-2xl group-hover:bg-[var(--color-primary)]/10 transition-colors"></div>
                                
                                <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-gray-100 flex items-center justify-center text-3xl mb-6 shadow-sm group-hover:scale-110 group-hover:bg-[var(--color-primary)]/10 group-hover:border-[var(--color-primary)]/20 transition-all">
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-extrabold text-gray-900 mb-3 group-hover:text-[var(--color-primary)] transition-colors">{feature.title}</h3>
                                <p className="text-gray-500 mb-8 font-medium leading-relaxed flex-1">{feature.description}</p>
                                
                                <ul className="space-y-3 mb-8">
                                    {feature.items.map((item) => (
                                        <li key={item} className="flex items-start gap-3 text-sm text-gray-700 font-medium">
                                            <CheckCircle size={18} className="text-[#10B981] shrink-0 mt-0.5" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>

                                <div className="mt-auto pt-6 border-t border-gray-100 flex items-center text-[var(--color-primary)] font-bold text-sm">
                                    Learn more <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-24 bg-[var(--color-secondary)] relative overflow-hidden">
                <div className="absolute inset-0 z-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-[var(--color-primary)] rounded-full blur-[120px] opacity-20 pointer-events-none"></div>

                <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
                    <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-6">
                        Ready to get started?
                    </h2>
                    <p className="text-xl text-gray-400 font-medium mb-10 max-w-2xl mx-auto">
                        Start your free trial today. No credit card required. Join hundreds of restaurants in Nepal.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/signup"
                            className="inline-flex items-center justify-center px-8 py-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white font-bold rounded-2xl shadow-xl shadow-[var(--color-primary)]/20 hover:scale-105 transition-all text-lg"
                        >
                            Start Free Trial
                        </Link>
                        <Link
                            href="/contact"
                            className="inline-flex items-center justify-center px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl backdrop-blur transition-all text-lg"
                        >
                            Contact Sales
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
