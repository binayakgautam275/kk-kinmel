'use client'

import Link from 'next/link'
import { ArrowLeft, CheckCircle, ArrowRight } from 'lucide-react'
import Logo from '@/components/shared/Logo'

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
        description: 'Built specifically for Nepal\'s digital payment ecosystem. Accept payments directly via QR codes and use our automated screenshot verification system to instantly confirm transfers without manually checking SMS alerts.',
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
            <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col text-center px-4">
                <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center text-4xl mb-6">🔍</div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Feature Not Found</h1>
                <p className="text-gray-500 mb-8 max-w-md">We couldn't find the specific feature you're looking for. It might be in development or under a different name.</p>
                <Link href="/features" className="bg-[var(--color-primary)] text-white px-6 py-3 rounded-xl font-bold hover:bg-[var(--color-primary)]/90 transition">
                    View All Features
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
                    <Link href="/features" className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-[var(--color-primary)] transition-colors px-4 py-2 rounded-xl hover:bg-gray-100">
                        <ArrowLeft size={16} />
                        All Features
                    </Link>
                </div>
            </nav>

            <main className="relative z-10 py-20 md:py-32">
                <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    <div className="bg-white rounded-3xl p-8 md:p-16 shadow-xl border border-gray-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-primary)]/5 rounded-full blur-3xl pointer-events-none"></div>
                        
                        <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-gray-100 flex items-center justify-center text-4xl mb-8 shadow-sm">
                            {feature.icon}
                        </div>
                        
                        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
                            {feature.title}
                        </h1>
                        <h2 className="text-xl md:text-2xl text-[var(--color-primary)] font-bold mb-8">
                            {feature.subtitle}
                        </h2>
                        
                        <p className="text-lg text-gray-600 leading-relaxed font-medium mb-12">
                            {feature.description}
                        </p>

                        <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
                            <h3 className="text-xl font-bold text-gray-900 mb-6">Key Capabilities</h3>
                            <ul className="space-y-4">
                                {feature.benefits.map((item, i) => (
                                    <li key={i} className="flex items-center gap-4 text-gray-700 font-medium">
                                        <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0">
                                            <CheckCircle size={18} className="text-[#10B981]" />
                                        </div>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="mt-12 flex items-center gap-4">
                            <Link href="/signup" className="flex-1 bg-[var(--color-primary)] text-white text-center py-4 rounded-xl font-bold text-lg hover:bg-[var(--color-primary)]/90 transition shadow-lg shadow-[var(--color-primary)]/20">
                                Start Free Trial
                            </Link>
                            <Link href="/contact" className="flex-1 bg-white border-2 border-gray-200 text-gray-700 text-center py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition">
                                Talk to Sales
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
