'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { MarketingNav, MarketingFooter, Eyebrow, MarketingButton } from '@/components/marketing'

const LEGAL_CONTENT: Record<string, { title: string, subtitle: string, lastUpdated: string, content: React.ReactNode }> = {
    'privacy': {
        title: 'Privacy Policy',
        subtitle: 'How we collect, use, and protect your data.',
        lastUpdated: 'May 1, 2024',
        content: (
            <>
                <p>At kkkhane, we take your privacy seriously. This policy describes what personal information we collect and how we use it.</p>
                <h3 className="mb-4 mt-8 text-xl font-bold text-gray-900">1. Information Collection</h3>
                <p>We collect information you provide directly to us when you create an account, use our services, or communicate with us.</p>
                <h3 className="mb-4 mt-8 text-xl font-bold text-gray-900">2. Data Security</h3>
                <p>We use enterprise-grade encryption to protect your restaurant&apos;s data and your customers&apos; payment information.</p>
                <h3 className="mb-4 mt-8 text-xl font-bold text-gray-900">3. Data Sharing</h3>
                <p>We do not sell your personal information or your restaurant&apos;s business data to third parties.</p>
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
                <h3 className="mb-4 mt-8 text-xl font-bold text-gray-900">1. Service Availability</h3>
                <p>We strive for 99.9% uptime, but we do not guarantee uninterrupted access to the service.</p>
                <h3 className="mb-4 mt-8 text-xl font-bold text-gray-900">2. Account Responsibilities</h3>
                <p>You are entirely responsible for maintaining the confidentiality of your account credentials.</p>
                <h3 className="mb-4 mt-8 text-xl font-bold text-gray-900">3. Termination</h3>
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
                <h3 className="mb-4 mt-8 text-xl font-bold text-gray-900">1. Subscription Cancellations</h3>
                <p>You may cancel your subscription at any time. Your access will continue until the end of your current billing period.</p>
                <h3 className="mb-4 mt-8 text-xl font-bold text-gray-900">2. 14-Day Guarantee</h3>
                <p>If you are not satisfied with your annual subscription within the first 14 days, you may request a full refund.</p>
                <h3 className="mb-4 mt-8 text-xl font-bold text-gray-900">3. Hardware Returns</h3>
                <p>Purchased POS hardware can be returned within 30 days if unused and in original packaging.</p>
            </>
        )
    },
    'career': {
        title: 'Careers at kkkhane',
        subtitle: "Join us in transforming Nepal's hospitality industry.",
        lastUpdated: 'June 10, 2024',
        content: (
            <>
                <p>We are a fast-growing team of engineers, designers, and former restaurateurs building the future of dining in Nepal.</p>
                <h3 className="mb-4 mt-8 text-xl font-bold text-gray-900">Open Positions</h3>
                <p>We currently don&apos;t have any open roles listed, but we are always looking for exceptional talent in Engineering, Sales, and Customer Success.</p>
                <div className="mt-8 rounded-2xl border border-gray-100 bg-[#FAFAF8] p-6">
                    <h4 className="mb-2 font-bold text-gray-900">Don&apos;t see your role?</h4>
                    <p className="mb-4">Send your CV and a brief introduction to our team.</p>
                    <a href="mailto:careers@kkkhane.com" className="font-bold text-[var(--color-primary)] hover:underline">careers@kkkhane.com</a>
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
                <h3 className="mb-4 mt-8 text-xl font-bold text-gray-900">How it works</h3>
                <ul className="mb-8 list-disc space-y-2 pl-5">
                    <li>Share your unique referral code with a fellow restaurant owner.</li>
                    <li>They get 1 month of Premium free when they sign up.</li>
                    <li>You get 1 month of Premium free once they complete their first paid month.</li>
                </ul>
                <Link href="/signup" className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-6 py-3 font-bold text-white shadow-lg shadow-[var(--color-primary)]/20 transition-transform hover:scale-105">
                    Get Your Code <ArrowRight size={16} />
                </Link>
            </>
        )
    }
}

export default function LegalPage({ params }: { params: { slug: string } }) {
    const page = LEGAL_CONTENT[params.slug]

    if (!page) {
        return (
            <div className="min-h-screen bg-white text-gray-900">
                <MarketingNav />
                <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 pt-20 text-center">
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 text-4xl">📄</div>
                    <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-gray-900">Page Not Found</h1>
                    <p className="mb-8 max-w-md font-medium text-gray-500">The document you&apos;re looking for does not exist or has been moved.</p>
                    <MarketingButton href="/">Back to Home</MarketingButton>
                </div>
                <MarketingFooter />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white text-gray-900">
            <MarketingNav />

            <main className="bg-[#FAFAF8] pb-24 pt-32">
                <div className="mx-auto max-w-3xl px-4 sm:px-6">
                    <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-xl md:p-12">
                        <div className="mb-10">
                            <div className="mb-4"><Eyebrow tone="brand">Legal</Eyebrow></div>
                            <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-gray-900 md:text-5xl">{page.title}</h1>
                            <p className="mb-6 text-xl font-medium text-gray-600">{page.subtitle}</p>
                            <div className="border-b border-gray-200 pb-8 text-sm font-medium text-gray-500">
                                Last Updated: {page.lastUpdated}
                            </div>
                        </div>
                        <div className="space-y-4 text-lg font-medium leading-relaxed text-gray-600">
                            {page.content}
                        </div>
                    </div>
                </div>
            </main>

            <MarketingFooter />
        </div>
    )
}
