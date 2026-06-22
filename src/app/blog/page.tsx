'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import Logo from '@/components/shared/Logo'

export default function BlogPage() {
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
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10">
                    <div className="inline-block bg-indigo-500/10 px-4 py-1.5 rounded-full mb-6 border border-indigo-500/20">
                        <span className="text-indigo-600 font-bold text-sm tracking-wide">Resources & Insights</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-extrabold text-[var(--color-secondary)] tracking-tight">
                        Our Blog
                    </h1>
                    <p className="mt-8 text-xl text-gray-600 leading-relaxed font-medium">
                        Tips, insights, and stories from the kkkhane team about running restaurants in Nepal.
                    </p>
                </div>
            </section>

            {/* Blog Grid */}
            <section className="pb-24 relative z-10">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {BLOG_POSTS.map((post) => (
                            <Link href="#" key={post.id} className="group bg-white border border-gray-100 rounded-3xl overflow-hidden hover:shadow-2xl hover:border-[var(--color-primary)]/30 transition-all duration-300 flex flex-col hover:-translate-y-1">
                                <div className="h-48 bg-gray-50 border-b border-gray-100 flex items-center justify-center relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    <span className="text-6xl group-hover:scale-110 transition-transform duration-300 relative z-10">{post.emoji}</span>
                                </div>
                                <div className="p-8 flex flex-col flex-1">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-xs font-extrabold text-[var(--color-primary)] uppercase tracking-wider bg-[var(--color-primary)]/10 px-3 py-1 rounded-full">
                                            {post.category}
                                        </span>
                                        <span className="text-xs font-bold text-gray-400">{post.date}</span>
                                    </div>
                                    <h3 className="text-2xl font-extrabold text-gray-900 group-hover:text-[var(--color-primary)] transition-colors mb-3 leading-snug">
                                        {post.title}
                                    </h3>
                                    <p className="text-gray-500 font-medium leading-relaxed mb-6 flex-1">{post.excerpt}</p>
                                    <div className="pt-6 border-t border-gray-100 flex items-center font-bold text-[var(--color-primary)] text-sm">
                                        Read Article <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    )
}

const BLOG_POSTS = [
    {
        id: 1,
        emoji: '📱',
        category: 'Tips',
        title: 'How to Maximize QR Code Ordering',
        excerpt: 'Learn best practices for setting up your QR code menu to increase orders and improve customer experience.',
        date: 'May 20, 2024',
    },
    {
        id: 2,
        emoji: '💰',
        category: 'Business',
        title: 'Why Nepal QR Payments Matter',
        excerpt: 'Understand the impact of eSewa, Khalti, and Fonepay integration on your restaurant\'s revenue.',
        date: 'May 15, 2024',
    },
    {
        id: 3,
        emoji: '👨‍🍳',
        category: 'Operations',
        title: 'Kitchen Display System Best Practices',
        excerpt: 'Tips for training your kitchen staff and optimizing KDS workflows for faster service.',
        date: 'May 10, 2024',
    },
    {
        id: 4,
        emoji: '📊',
        category: 'Analytics',
        title: 'Understanding Your kkkhane Reports',
        excerpt: 'A complete guide to reading Z-reports, revenue trends, and making data-driven decisions.',
        date: 'May 5, 2024',
    },
]
