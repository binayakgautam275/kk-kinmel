'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import VideoLogo from '@/components/shared/VideoLogo'

export default function BlogPage() {
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
                        Blog
                    </h1>
                    <p className="mt-6 text-lg text-gray-600">
                        Tips, insights, and stories from the KKhane team about running restaurants in Nepal.
                    </p>
                </div>
            </section>

            {/* Blog Grid */}
            <section className="py-16 md:py-24">
                <div className="max-w-5xl mx-auto px-4 sm:px-6">
                    <div className="grid md:grid-cols-2 gap-8">
                        {BLOG_POSTS.map((post) => (
                            <article
                                key={post.id}
                                className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden hover:shadow-lg transition group"
                            >
                                <div className="h-48 bg-gradient-to-br from-[var(--color-primary)]/20 to-amber-100/20 flex items-center justify-center">
                                    <span className="text-4xl">{post.emoji}</span>
                                </div>
                                <div className="p-6">
                                    <p className="text-xs font-medium text-[var(--color-primary)] uppercase tracking-wide">
                                        {post.category}
                                    </p>
                                    <h3 className="mt-2 text-xl font-bold text-gray-900 group-hover:text-[var(--color-primary)] transition">
                                        {post.title}
                                    </h3>
                                    <p className="mt-3 text-gray-600 text-sm">{post.excerpt}</p>
                                    <div className="mt-4 flex items-center justify-between">
                                        <span className="text-xs text-gray-500">{post.date}</span>
                                        <span className="inline-flex items-center gap-1 text-[var(--color-primary)] font-medium text-sm group-hover:gap-2 transition-all">
                                            Read <ArrowRight size={16} />
                                        </span>
                                    </div>
                                </div>
                            </article>
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
        title: 'Understanding Your KKhane Reports',
        excerpt: 'A complete guide to reading Z-reports, revenue trends, and making data-driven decisions.',
        date: 'May 5, 2024',
    },
]
