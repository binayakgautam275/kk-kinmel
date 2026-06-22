'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import Logo from '@/components/shared/Logo'

const LEGAL_CONTENT: Record<string, { title: string, subtitle: string, lastUpdated: string, content: React.ReactNode }> = {
    'privacy': {
        title: 'Privacy Policy',
        subtitle: 'How we collect, use, and protect your data.',
        lastUpdated: 'May 1, 2024',
        content: (
            <>
                <p>At kkkhane, we take your privacy seriously. This policy describes what personal information we collect and how we use it.</p>
                <h3 className="text-xl font-bold mt-8 mb-4">1. Information Collection</h3>
                <p>We collect information you provide directly to us when you create an account, use our services, or communicate with us.</p>
                <h3 className="text-xl font-bold mt-8 mb-4">2. Data Security</h3>
                <p>We use enterprise-grade encryption to protect your restaurant's data and your customers' payment information.</p>
                <h3 className="text-xl font-bold mt-8 mb-4">3. Data Sharing</h3>
                <p>We do not sell your personal information or your restaurant's business data to third parties.</p>
            </>
        )
    },
    'terms': {
        title: 'Terms & Conditions',
        subtitle: 'The rules and guidelines for using our platform.',
        lastUpdated: 'May 1, 2024',
        content: (
            <>
                <p>By accessing or using kkkhane, you agree to be bound by these terms.</p>
                <h3 className="text-xl font-bold mt-8 mb-4">1. Service Availability</h3>
                <p>We strive for 99.9% uptime, but we do not guarantee uninterrupted access to the service.</p>
                <h3 className="text-xl font-bold mt-8 mb-4">2. Account Responsibilities</h3>
                <p>You are entirely responsible for maintaining the confidentiality of your account credentials.</p>
                <h3 className="text-xl font-bold mt-8 mb-4">3. Termination</h3>
                <p>We reserve the right to terminate or suspend your account for any violation of these terms.</p>
            </>
        )
    },
    'refund': {
        title: 'Refund Policy',
        subtitle: 'Our cancellation and refund procedures.',
        lastUpdated: 'May 1, 2024',
        content: (
            <>
                <p>We want you to be completely satisfied with kkkhane. Here is our policy on subscriptions and refunds.</p>
                <h3 className="text-xl font-bold mt-8 mb-4">1. Subscription Cancellations</h3>
                <p>You may cancel your subscription at any time. Your access will continue until the end of your current billing period.</p>
                <h3 className="text-xl font-bold mt-8 mb-4">2. 14-Day Guarantee</h3>
                <p>If you are not satisfied with your annual subscription within the first 14 days, you may request a full refund.</p>
                <h3 className="text-xl font-bold mt-8 mb-4">3. Hardware Returns</h3>
                <p>Purchased POS hardware can be returned within 30 days if unused and in original packaging.</p>
            </>
        )
    },
    'career': {
        title: 'Careers at kkkhane',
        subtitle: 'Join us in transforming Nepal\'s hospitality industry.',
        lastUpdated: 'June 10, 2024',
        content: (
            <>
                <p>We are a fast-growing team of engineers, designers, and former restaurateurs building the future of dining in Nepal.</p>
                <h3 className="text-xl font-bold mt-8 mb-4">Open Positions</h3>
                <p>We currently don't have any open roles listed, but we are always looking for exceptional talent in Engineering, Sales, and Customer Success.</p>
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 mt-8">
                    <h4 className="font-bold mb-2">Don't see your role?</h4>
                    <p className="mb-4">Send your CV and a brief introduction to our team.</p>
                    <a href="mailto:careers@kkkhane.com" className="text-[var(--color-primary)] font-bold hover:underline">careers@kkkhane.com</a>
                </div>
            </>
        )
    },
    'referrals': {
        title: 'Refer & Earn',
        subtitle: 'Get rewarded for helping restaurants grow.',
        lastUpdated: 'June 1, 2024',
        content: (
            <>
                <p>Love kkkhane? Share it with other restaurant owners and earn rewards for every successful referral.</p>
                <h3 className="text-xl font-bold mt-8 mb-4">How it works</h3>
                <ul className="list-disc pl-5 space-y-2 mb-8">
                    <li>Share your unique referral code with a fellow restaurant owner.</li>
                    <li>They get 1 month of Premium free when they sign up.</li>
                    <li>You get 1 month of Premium free once they complete their first paid month.</li>
                </ul>
                <Link href="/signup" className="inline-flex items-center px-6 py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl hover:opacity-90 transition">
                    Get Your Code <ArrowRight size={16} className="ml-2" />
                </Link>
            </>
        )
    }
}

export default function LegalPage({ params }: { params: { slug: string } }) {
    const page = LEGAL_CONTENT[params.slug]

    if (!page) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col text-center px-4">
                <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center text-4xl mb-6">📄</div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Page Not Found</h1>
                <p className="text-gray-500 mb-8 max-w-md">The document you're looking for does not exist or has been moved.</p>
                <Link href="/" className="bg-[var(--color-primary)] text-white px-6 py-3 rounded-xl font-bold hover:bg-[var(--color-primary)]/90 transition">
                    Back to Home
                </Link>
            </div>
        )
    }

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

            <main className="relative z-10 py-16 md:py-24">
                <div className="max-w-3xl mx-auto px-4 sm:px-6">
                    <div className="mb-12">
                        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
                            {page.title}
                        </h1>
                        <p className="text-xl text-gray-600 mb-6 font-medium">
                            {page.subtitle}
                        </p>
                        <div className="text-sm text-gray-500 font-medium pb-8 border-b border-gray-200">
                            Last Updated: {page.lastUpdated}
                        </div>
                    </div>

                    <div className="prose prose-lg prose-gray max-w-none text-gray-600 leading-relaxed font-medium">
                        {page.content}
                    </div>
                </div>
            </main>
        </div>
    )
}
