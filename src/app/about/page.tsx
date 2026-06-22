'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import Logo from '@/components/shared/Logo'

export default function AboutPage() {
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
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--color-primary)]/5 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10">
                    <div className="inline-block bg-[var(--color-primary)]/10 px-4 py-1.5 rounded-full mb-6 border border-[var(--color-primary)]/20">
                        <span className="text-[var(--color-primary)] font-bold text-sm tracking-wide">Our Story</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-extrabold text-[var(--color-secondary)] tracking-tight">
                        About kkkhane
                    </h1>
                    <p className="mt-8 text-xl text-gray-600 leading-relaxed font-medium">
                        Built by restaurateurs, for restaurateurs. We're reimagining how restaurants in Nepal operate — from customer ordering to kitchen management, staff coordination, and business analytics.
                    </p>
                </div>
            </section>

            {/* Mission */}
            <section className="py-24 bg-white border-y border-gray-100 relative z-10">
                <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    <div className="mb-20">
                        <h2 className="text-4xl font-extrabold text-gray-900 mb-6 tracking-tight">Our Mission</h2>
                        <p className="text-xl text-gray-600 leading-relaxed font-medium">
                            To empower Nepal's restaurants with technology that's as delightful for customers as it is efficient for staff. We believe every restaurant — whether a single-table eatery or a multi-location chain — deserves world-class tools to delight guests and operate profitably.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-4xl font-extrabold text-gray-900 mb-6 tracking-tight">Why We Built kkkhane</h2>
                        <div className="space-y-6 text-xl text-gray-600 leading-relaxed font-medium">
                            <p>
                                We spent years working in Nepal's hospitality industry and saw the same problems repeated: paper tickets piling up in the kitchen, walkie-talkies creating confusion, payment verification taking forever, and no way to track business metrics in real-time.
                            </p>
                            <p>
                                Existing solutions were either built for Western restaurants (with features restaurants here don't need) or ignored Nepal's unique payment methods, tax requirements, and operational workflows. So we built kkkhane from scratch — designed specifically for how Nepal does business.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-24 relative z-10">
                <div className="max-w-5xl mx-auto px-4 sm:px-6">
                    <h2 className="text-4xl font-extrabold text-gray-900 mb-12 text-center tracking-tight">What Makes kkkhane Different</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        {[
                            {
                                title: '100% Nepal-Focused',
                                desc: 'Every feature is built with Nepal in mind. eSewa, Khalti, Fonepay. NPR currency. VAT & PAN compliance. Bikram Sambat calendar support. This isn\'t a global product translated to Nepali — it\'s architected for Nepal.',
                            },
                            {
                                title: 'Built by Operators',
                                desc: 'Our team has real restaurant experience. We understand the chaos of a Friday night rush, the importance of accurate inventory, and what actually matters to customers.',
                            },
                            {
                                title: 'Modern UX, Offline-First',
                                desc: 'Beautiful, responsive interfaces that work on any device. Built as a PWA so it works even with slow or spotty internet — critical for Nepal.',
                            },
                            {
                                title: 'Complete Ecosystem',
                                desc: 'From customer ordering to kitchen management, payments, staff coordination, and analytics — one integrated platform. No juggling 5 different tools.',
                            },
                        ].map((item, i) => (
                            <div key={i} className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                                <h3 className="text-2xl font-extrabold text-gray-900 mb-4">{item.title}</h3>
                                <p className="text-gray-600 text-lg font-medium leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Team */}
            <section className="py-16 md:py-24 bg-gray-50">
                <div className="max-w-3xl mx-auto px-4 sm:px-6">
                    <h2 className="text-3xl font-bold text-gray-900 mb-8">Backed by Experts</h2>
                    <p className="text-lg text-gray-600 mb-8">
                        kkkhane is backed by hospitality industry veterans, software engineers from top companies, and Y Combinator's expertise in building scalable businesses.
                    </p>
                </div>
            </section>

            {/* CTA */}
            <section className="py-24 bg-[var(--color-secondary)] relative overflow-hidden">
                <div className="absolute inset-0 z-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
                <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
                    <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
                        Join the kkkhane revolution
                    </h2>
                    <p className="text-xl text-gray-400 font-medium mb-10 max-w-2xl mx-auto">
                        Help us transform how Nepal's restaurants operate. Start your free trial today and experience the difference.
                    </p>
                    <Link
                        href="/signup"
                        className="inline-flex items-center justify-center px-10 py-5 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white font-bold rounded-2xl shadow-xl shadow-[var(--color-primary)]/20 hover:scale-105 transition-all text-xl"
                    >
                        Start Free Trial
                    </Link>
                </div>
            </section>
        </div>
    )
}
