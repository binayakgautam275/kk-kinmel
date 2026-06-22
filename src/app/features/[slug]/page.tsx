'use client'

import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { MarketingNav, MarketingFooter, Eyebrow, MarketingButton } from '@/components/marketing'

// Mapping slugs back to features
const FEATURE_CONTENT: Record<string, { title: string, subtitle: string, icon: string, description: string, benefits: string[] }> = {
    'qr-code-ordering': {
        title: 'QR Code Ordering',
        subtitle: 'Let guests scan, order, and pay from their phones.',
        icon: '📱',
        description: 'Transform your dining experience with instant digital menus. Guests simply scan a QR code placed on their table to browse your full menu with images, customize their orders, and send them straight to the kitchen. No waiting for waiters, higher table turnover, and larger order sizes.',
        benefits: ['No app download required for customers', 'Real-time menu and price updates', 'Multiple modifier groups and add-ons', 'High-quality image support for every dish', 'Reduce waiter workload during peak hours']
    },
    'kitchen-display-system': {
        title: 'Kitchen Display System',
        subtitle: 'Coordinate your kitchen with real-time digital tickets.',
        icon: '👨‍🍳',
        description: 'Replace messy paper tickets with a smart digital display. Orders from waiters and QR codes instantly appear on the KDS. Track prep times, mark items as cooking or ready, and ensure nothing ever gets lost or forgotten in the heat of a rush.',
        benefits: ['Live order queue with color-coded wait times', 'Item-level status management (Cooking, Ready)', 'Separate queues for Dine-in and Takeout', 'Prep time tracking and analytics', 'Reduce food waste from lost tickets']
    },
    'nepal-qr-payments': {
        title: 'Nepal QR Payments',
        subtitle: 'Seamless eSewa, Khalti, and Fonepay integration.',
        icon: '💳',
        description: "Built specifically for Nepal's digital payment ecosystem. Accept payments directly via QR codes and use our automated screenshot verification system to instantly confirm transfers without manually checking SMS alerts.",
        benefits: ['Native eSewa, Khalti, and Fonepay support', 'Automated screenshot verification', '100% VAT and PAN compliant billing', 'Automatic digital invoice generation', 'Direct integration with daily Z-reports']
    },
    'staff-management': {
        title: 'Staff Management',
        subtitle: 'Track shifts, roles, and performance.',
        icon: '👥',
        description: 'Keep your team coordinated with built-in staff management. Assign specific roles (Admin, Manager, Waiter, Kitchen), track clock-ins and clock-outs, and monitor individual performance metrics to reward your best employees.',
        benefits: ['4 distinct staff role types with permissions', 'Digital shift clock in/out tracking', 'Break tracking', 'Staff performance and sales metrics', 'Secure PIN login for shared devices']
    },
    'loyalty-program': {
        title: 'Loyalty & Rewards',
        subtitle: 'Turn first-time guests into regulars.',
        icon: '🎁',
        description: 'Build a loyal customer base with our automated rewards system. Create customized membership tiers, let customers earn points on every purchase, and automate birthday bonuses to keep them coming back.',
        benefits: ['Up to 4 customizable membership tiers', 'Automated points earn and redeem rules', 'Birthday bonuses and SMS alerts', 'Referral rewards tracking', 'Customer database CRM']
    },
    'analytics-reports': {
        title: 'Analytics & Reports',
        subtitle: 'Make data-driven decisions.',
        icon: '📊',
        description: 'Stop guessing how your restaurant is performing. Get real-time dashboards showing your revenue, top-selling items, busiest hours, and staff performance. Generate end-of-day Z-reports with a single click.',
        benefits: ['Real-time 7-day trend charts', 'Automated EOD Z-reports', 'Top selling items analysis', 'COGS (Cost of Goods Sold) tracking', 'Exportable data for accounting']
    },
    // Fallbacks for homepage links
    'order-kot-management': { title: 'Order & KOT Management', subtitle: 'Digital tickets for seamless service.', icon: '📝', description: 'Streamline your ordering process with digital KOTs.', benefits: ['Digital tickets', 'Instant kitchen sync'] },
    'inventory-waste-control': { title: 'Inventory & Waste Control', subtitle: 'Track every gram of ingredient.', icon: '📦', description: 'Real-time inventory deduction based on recipes.', benefits: ['Recipe management', 'Low stock alerts', 'Waste logging'] },
    'inventory': { title: 'Inventory Management', subtitle: 'Track your stock in real-time.', icon: '📦', description: 'Real-time inventory deduction based on recipes.', benefits: ['Recipe management', 'Low stock alerts', 'Waste logging'] },
    'accounting-expense-manager': { title: 'Accounting & Expense', subtitle: 'Track every rupee.', icon: '💰', description: 'Built-in expense tracking and supplier management.', benefits: ['Supplier ledgers', 'Petty cash', 'Profit/Loss reports'] },
    'accounting': { title: 'Accounting & Expense', subtitle: 'Track every rupee.', icon: '💰', description: 'Built-in expense tracking and supplier management.', benefits: ['Supplier ledgers', 'Petty cash', 'Profit/Loss reports'] },
    'digital-qr-menu': { title: 'Digital QR Menu', subtitle: 'Scan, order, pay.', icon: '📱', description: 'Interactive digital menus for your tables.', benefits: ['No apps needed', 'Live updates'] },
    'qr-menu': { title: 'Digital QR Menu', subtitle: 'Scan, order, pay.', icon: '📱', description: 'Interactive digital menus for your tables.', benefits: ['No apps needed', 'Live updates'] },
    'menu-table-management': { title: 'Menu & Table Management', subtitle: 'Organize your floor plan.', icon: '🪑', description: 'Visual table management and menu categorizations.', benefits: ['Live table status', 'Merge/Split bills'] },
    'table-management': { title: 'Table Management', subtitle: 'Organize your floor plan.', icon: '🪑', description: 'Visual table management and menu categorizations.', benefits: ['Live table status', 'Merge/Split bills'] },
    'real-time-sales-report': { title: 'Real-Time Sales Report', subtitle: 'Live business insights.', icon: '📈', description: 'Watch your sales grow in real-time from anywhere.', benefits: ['Live dashboard', 'Mobile accessible'] },
    'analytics': { title: 'Analytics', subtitle: 'Live business insights.', icon: '📈', description: 'Watch your sales grow in real-time from anywhere.', benefits: ['Live dashboard', 'Mobile accessible'] },
    'loyalty-rewards': { title: 'Loyalty & Rewards', subtitle: 'Keep them coming back.', icon: '🎁', description: 'Points and tiers for loyal customers.', benefits: ['Points system', 'Tiers'] },
    'loyalty': { title: 'Loyalty & Rewards', subtitle: 'Keep them coming back.', icon: '🎁', description: 'Points and tiers for loyal customers.', benefits: ['Points system', 'Tiers'] },
    'refer-earn': { title: 'Refer & Earn', subtitle: 'Grow together.', icon: '🤝', description: 'Reward customers who bring friends.', benefits: ['Referral codes', 'Automated rewards'] },
    'apps': { title: 'Mobile & Web Apps', subtitle: 'Manage from anywhere.', icon: '📱', description: 'Native apps for staff and managers.', benefits: ['iOS & Android', 'Offline mode support'] },
}

export default function FeatureSlugPage({ params }: { params: { slug: string } }) {
    const feature = FEATURE_CONTENT[params.slug]

    if (!feature) {
        return (
            <div className="min-h-screen bg-white text-gray-900">
                <MarketingNav />
                <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 pt-20 text-center">
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 text-4xl">🔍</div>
                    <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-gray-900">Feature Not Found</h1>
                    <p className="mb-8 max-w-md font-medium text-gray-500">
                        We couldn&apos;t find the specific feature you&apos;re looking for. It might be in development or under a different name.
                    </p>
                    <MarketingButton href="/features">View All Features</MarketingButton>
                </div>
                <MarketingFooter />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white text-gray-900">
            <MarketingNav />

            <main className="bg-[#FAFAF8] pb-24 pt-32">
                <div className="mx-auto max-w-4xl px-4 sm:px-6">
                    <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 shadow-xl md:p-16">
                        <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-[var(--color-primary)]/5 blur-3xl" />

                        <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl border border-gray-100 bg-[#FAFAF8] text-4xl shadow-sm">
                            {feature.icon}
                        </div>

                        <div className="mb-4"><Eyebrow tone="brand">Feature</Eyebrow></div>
                        <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-gray-900 md:text-5xl">
                            {feature.title}
                        </h1>
                        <h2 className="mb-8 text-xl font-bold text-[var(--color-primary)] md:text-2xl">
                            {feature.subtitle}
                        </h2>

                        <p className="mb-12 text-lg font-medium leading-relaxed text-gray-600">
                            {feature.description}
                        </p>

                        <div className="rounded-2xl border border-gray-100 bg-[#FAFAF8] p-8">
                            <h3 className="mb-6 text-xl font-bold text-gray-900">Key Capabilities</h3>
                            <ul className="space-y-4">
                                {feature.benefits.map((item, i) => (
                                    <li key={i} className="flex items-center gap-4 font-medium text-gray-700">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                                            <CheckCircle size={18} className="text-[var(--success)]" />
                                        </div>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="mt-12 flex flex-col gap-4 sm:flex-row">
                            <MarketingButton href="/signup" size="lg" className="flex-1">Start Free Trial</MarketingButton>
                            <MarketingButton href="/contact" size="lg" variant="secondary" className="flex-1">Talk to Sales</MarketingButton>
                        </div>
                    </div>
                </div>
            </main>

            <MarketingFooter />
        </div>
    )
}
