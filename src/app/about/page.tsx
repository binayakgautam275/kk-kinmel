'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import VideoLogo from '@/components/shared/VideoLogo'

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-white text-gray-900">
            {/* Navigation */}
            <nav className="border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <VideoLogo className="h-7" />
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
                        About KKhane
                    </h1>
                    <p className="mt-6 text-lg text-gray-600 leading-relaxed">
                        Built by restaurateurs, for restaurateurs. KKhane is reimagining how restaurants in Nepal operate — from customer ordering to kitchen management, staff coordination, and business analytics.
                    </p>
                </div>
            </section>

            {/* Mission */}
            <section className="py-16 md:py-24 bg-gray-50">
                <div className="max-w-3xl mx-auto px-4 sm:px-6">
                    <div className="mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
                        <p className="text-lg text-gray-600 leading-relaxed">
                            To empower Nepal's restaurants with technology that's as delightful for customers as it is efficient for staff. We believe every restaurant — whether a single-table eatery or a multi-location chain — deserves world-class tools to delight guests and operate profitably.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Why We Built KKhane</h2>
                        <p className="text-lg text-gray-600 leading-relaxed mb-4">
                            We spent years working in Nepal's hospitality industry and saw the same problems repeated: paper tickets piling up in the kitchen, walkie-talkies creating confusion, payment verification taking forever, and no way to track business metrics in real-time.
                        </p>
                        <p className="text-lg text-gray-600 leading-relaxed">
                            Existing solutions were either built for Western restaurants (with features restaurants here don't need) or ignored Nepal's unique payment methods, tax requirements, and operational workflows. So we built KKhane from scratch — designed for how Nepal does business.
                        </p>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-16 md:py-24">
                <div className="max-w-3xl mx-auto px-4 sm:px-6">
                    <h2 className="text-3xl font-bold text-gray-900 mb-8">What Makes KKhane Different</h2>
                    <div className="space-y-8">
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
                            <div key={i} className="bg-gray-50 border border-gray-100 rounded-xl p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                                <p className="text-gray-600">{item.desc}</p>
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
                        KKhane is backed by hospitality industry veterans, software engineers from top companies, and Y Combinator's expertise in building scalable businesses.
                    </p>
                </div>
            </section>

            {/* CTA */}
            <section className="py-16 md:py-24 bg-[var(--color-secondary)]">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        Join the KKhane revolution
                    </h2>
                    <p className="text-lg text-gray-400 mb-8">
                        Help us transform how Nepal's restaurants operate. Start your free trial today.
                    </p>
                    <Link
                        href="/signup"
                        className="inline-flex items-center justify-center px-8 py-4 bg-[var(--color-primary)] hover:opacity-90 text-white font-semibold rounded-xl transition"
                    >
                        Start Free Trial
                    </Link>
                </div>
            </section>
        </div>
    )
}
