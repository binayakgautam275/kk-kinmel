import { redirect } from 'next/navigation'
import { getOptionalUser } from '@/lib/auth'
import Link from 'next/link'
import VideoLogo from '@/components/shared/VideoLogo'
import CopyrightYear from '@/components/shared/CopyrightYear'
import MobileNav from './MobileNav'
import {
    QrCode, ChefHat, ArrowRight, Smartphone, BarChart3,
    Clock, ShieldCheck, Globe, Users, Utensils, Bell,
    Gift, Receipt, Zap, CheckCircle, Layers,
    ArrowUpRight, ChevronDown, MapPin, CreditCard,
} from 'lucide-react'

const ROLE_LANDING: Record<string, string> = {
    super_admin: '/admin/dashboard',
    manager: '/admin/dashboard',
    kitchen: '/kitchen',
    waiter: '/waiter',
}

export default async function Home() {
    const currentUser = await getOptionalUser()
    if (currentUser) {
        const landing = ROLE_LANDING[currentUser.role] || '/admin/dashboard'
        redirect(landing)
    }

    return (
        <div className="min-h-screen bg-[#FAFAF8] text-gray-900 overflow-x-hidden">

            {/* ── Nav ──────────────────────────────────────────── */}
            <nav className="fixed top-0 inset-x-0 z-50 bg-[#FAFAF8]/90 backdrop-blur-xl border-b border-gray-100/80">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
                    <Link href="/" className="shrink-0">
                        <VideoLogo className="h-8" />
                    </Link>
                    <div className="hidden lg:flex items-center gap-1 text-sm font-medium text-gray-500">
                        {[
                            { href: '#features', label: 'Features' },
                            { href: '#how-it-works', label: 'How it Works' },
                            { href: '#pricing', label: 'Pricing' },
                            { href: '/docs', label: 'Docs' },
                            { href: '/blog', label: 'Blog' },
                        ].map(({ href, label }) => (
                            <a key={href} href={href}
                               className="px-3.5 py-2 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors">
                                {label}
                            </a>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/login"
                              className="hidden sm:inline-flex px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors">
                            Log in
                        </Link>
                        <Link href="/signup"
                              className="btn-primary text-sm px-5 py-2.5 hidden sm:inline-flex rounded-xl">
                            Get started free
                        </Link>
                        <MobileNav />
                    </div>
                </div>
            </nav>

            {/* ── Hero ─────────────────────────────────────────── */}
            <section className="relative pt-28 pb-16 sm:pt-36 sm:pb-24 lg:pt-44 lg:pb-32 overflow-hidden">
                <div className="absolute inset-0 -z-10">
                    <div className="absolute top-[-10%] left-[20%] w-[70vw] h-[70vw] max-w-3xl max-h-3xl rounded-full opacity-70"
                         style={{ background: 'radial-gradient(circle, rgba(232,93,4,0.07) 0%, transparent 70%)' }} />
                    <div className="absolute bottom-[-5%] right-[-5%] w-[40vw] h-[40vw] max-w-xl max-h-xl rounded-full"
                         style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.08) 0%, transparent 70%)' }} />
                    <div className="absolute inset-0 opacity-[0.015]"
                         style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="animate-fade-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[var(--color-primary)] text-xs font-semibold mb-7 tracking-wide border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/6">
                            <MapPin size={12} />
                            Built for Nepal&apos;s restaurants
                        </div>

                        <h1 className="animate-fade-up delay-100 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight text-[var(--color-secondary)]">
                            The smarter way to<br />
                            <span className="text-gradient">run your restaurant</span>
                        </h1>

                        <p className="animate-fade-up delay-200 mt-6 text-lg sm:text-xl text-gray-500 leading-relaxed max-w-2xl mx-auto">
                            QR ordering, real-time kitchen display, eSewa payments, loyalty programs,
                            and analytics — all in one beautifully simple system.
                        </p>

                        <div className="animate-fade-up delay-300 mt-10 flex flex-col sm:flex-row gap-3 justify-center">
                            <Link href="/signup"
                                  className="btn-primary px-8 py-3.5 text-base rounded-xl shadow-lg">
                                Start for free <ArrowRight size={18} />
                            </Link>
                            <Link href="#how-it-works"
                                  className="btn-secondary px-8 py-3.5 text-base rounded-xl">
                                See how it works
                            </Link>
                        </div>

                        <p className="animate-fade-up delay-400 mt-5 text-xs text-gray-400">
                            No credit card required · Free plan always available
                        </p>
                    </div>

                    {/* Dashboard mockup */}
                    <div className="animate-fade-up delay-500 mt-16 sm:mt-20 max-w-5xl mx-auto relative">
                        <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)]"
                             style={{ background: 'linear-gradient(135deg, #1B263B 0%, #243447 100%)' }}>
                            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
                                <div className="flex gap-1.5">
                                    {['bg-red-400','bg-amber-400','bg-green-400'].map(c => (
                                        <div key={c} className={`w-3 h-3 rounded-full ${c} opacity-70`} />
                                    ))}
                                </div>
                                <div className="flex-1 mx-4 h-6 rounded-md bg-white/10 flex items-center px-3">
                                    <span className="text-xs text-white/40 font-mono">dashboard.kkkhane.com</span>
                                </div>
                            </div>
                            <div className="p-4 sm:p-6 grid sm:grid-cols-3 gap-4">
                                {[
                                    { label: 'Revenue today', value: 'Rs. 24,800', delta: '+18%', color: 'text-green-400' },
                                    { label: 'Active tables', value: '7 / 12', delta: '3 pending', color: 'text-amber-400' },
                                    { label: 'Orders today', value: '43', delta: '+6 this hour', color: 'text-blue-400' },
                                ].map(s => (
                                    <div key={s.label} className="bg-white/5 rounded-xl p-4 border border-white/8">
                                        <p className="text-xs text-white/40 mb-1">{s.label}</p>
                                        <p className="text-xl font-bold text-white">{s.value}</p>
                                        <p className={`text-xs mt-0.5 ${s.color}`}>{s.delta}</p>
                                    </div>
                                ))}
                                <div className="sm:col-span-2 bg-white/5 rounded-xl p-4 border border-white/8">
                                    <p className="text-xs font-semibold text-white/60 mb-3 uppercase tracking-wider">Live Orders</p>
                                    <div className="space-y-2">
                                        {[
                                            { table: 'T-04', items: 'Momo × 2, Chowmein × 1', status: 'Preparing', c: 'bg-amber-400/20 text-amber-300' },
                                            { table: 'T-07', items: 'Dal Bhat × 3', status: 'Ready', c: 'bg-green-400/20 text-green-300' },
                                            { table: 'T-02', items: 'Thukpa × 1, Juice × 2', status: 'Sent', c: 'bg-blue-400/20 text-blue-300' },
                                        ].map(o => (
                                            <div key={o.table} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2.5">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-mono font-bold text-white/70">{o.table}</span>
                                                    <span className="text-xs text-white/40">{o.items}</span>
                                                </div>
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${o.c}`}>{o.status}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-white/5 rounded-xl p-4 border border-white/8">
                                    <p className="text-xs font-semibold text-white/60 mb-3 uppercase tracking-wider">Payments</p>
                                    <div className="space-y-3">
                                        {[
                                            { method: 'eSewa', amt: 'Rs. 850', ok: true },
                                            { method: 'Cash', amt: 'Rs. 1,200', ok: true },
                                            { method: 'eSewa', amt: 'Rs. 650', ok: false },
                                        ].map((p, i) => (
                                            <div key={i} className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs font-medium text-white/70">{p.method}</p>
                                                    <p className="text-xs text-white/30">{p.amt}</p>
                                                </div>
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.ok ? 'bg-green-400/20 text-green-300' : 'bg-amber-400/20 text-amber-300'}`}>
                                                    {p.ok ? 'Verified' : 'Pending'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Social proof ─────────────────────────────────── */}
            <div className="border-y border-gray-100 bg-white py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-center gap-8 sm:gap-16">
                    {[
                        { value: '500+', label: 'restaurants' },
                        { value: '2M+', label: 'orders processed' },
                        { value: '99.9%', label: 'uptime' },
                        { value: '4.9★', label: 'avg. rating' },
                    ].map(s => (
                        <div key={s.label} className="text-center">
                            <p className="text-2xl sm:text-3xl font-bold text-[var(--color-secondary)]">{s.value}</p>
                            <p className="text-xs text-gray-400 mt-0.5 uppercase tracking-wide">{s.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Features ─────────────────────────────────────── */}
            <section id="features" className="section-pad bg-white">
                <div className="container-pad">
                    <div className="text-center mb-14 sm:mb-20">
                        <p className="text-[var(--color-primary)] text-sm font-semibold tracking-widest uppercase mb-3">Features</p>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--color-secondary)] leading-tight">
                            Everything your restaurant needs
                        </h2>
                        <p className="mt-4 text-gray-500 text-lg max-w-xl mx-auto">
                            From QR menus to payroll — built for Nepal, works anywhere.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[
                            {
                                icon: <QrCode size={22} />,
                                title: 'QR Code Ordering',
                                desc: 'Customers scan, browse, and order instantly. No app download, no friction.',
                                points: ['Works on any phone', 'Real-time menu updates', 'Modifier groups & notes'],
                            },
                            {
                                icon: <ChefHat size={22} />,
                                title: 'Kitchen Display System',
                                desc: "Orders appear on kitchen screens the moment they're placed. No paper tickets.",
                                points: ['Audio new-order alerts', 'Status tracking', 'Separate takeout queue'],
                            },
                            {
                                icon: <CreditCard size={22} />,
                                title: 'eSewa & Cash Payments',
                                desc: 'Customers pay via eSewa, Khalti, or cash — staff verify with one tap.',
                                points: ['Screenshot proof upload', 'Waiter verification feed', 'Bill splitting'],
                            },
                            {
                                icon: <BarChart3 size={22} />,
                                title: 'Analytics & Reports',
                                desc: 'Revenue trends, top items, peak hours, and Z-reports for daily reconciliation.',
                                points: ['Daily/monthly revenue', 'Top-selling items', 'Staff performance'],
                            },
                            {
                                icon: <Gift size={22} />,
                                title: 'Loyalty Program',
                                desc: 'Reward repeat customers with points redeemable on future orders.',
                                points: ['Points on every order', 'Custom redemption rules', 'Member phone lookup'],
                            },
                            {
                                icon: <Users size={22} />,
                                title: 'Staff & Shift Management',
                                desc: 'Manage roles, clock-ins, and permissions from a single dashboard.',
                                points: ['Role-based access control', 'Clock in / clock out', 'Active shift tracking'],
                            },
                        ].map(f => (
                            <div key={f.title} className="card card-hover p-6 sm:p-8 group">
                                <div className="w-11 h-11 rounded-xl bg-[var(--color-primary)]/8 flex items-center justify-center text-[var(--color-primary)] mb-5 group-hover:scale-105 transition-transform">
                                    {f.icon}
                                </div>
                                <h3 className="text-base font-bold text-[var(--color-secondary)] mb-2">{f.title}</h3>
                                <p className="text-sm text-gray-500 leading-relaxed mb-4">{f.desc}</p>
                                <ul className="space-y-1.5">
                                    {f.points.map(p => (
                                        <li key={p} className="flex items-center gap-2 text-xs text-gray-400">
                                            <CheckCircle size={12} className="text-[var(--color-primary)] shrink-0" />
                                            {p}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Nepal highlight ───────────────────────────────── */}
            <section className="section-pad relative overflow-hidden"
                     style={{ background: 'linear-gradient(135deg, #1B263B 0%, #243447 100%)' }}>
                <div className="absolute inset-0 opacity-[0.04]"
                     style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
                <div className="container-pad relative">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                        <div>
                            <p className="text-[var(--color-primary)] text-sm font-semibold tracking-widest uppercase mb-4">Made for Nepal</p>
                            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight">
                                Built around how<br />Nepali restaurants work
                            </h2>
                            <p className="mt-5 text-gray-400 text-lg leading-relaxed">
                                VAT invoicing, eSewa QR payments, Bikram Sambat dates,
                                Nepali menu translations, and NPR currency — not bolt-ons, built in from day one.
                            </p>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                            {[
                                { icon: <Receipt size={18} />, title: 'IRD-compliant invoices', desc: 'PAN/VAT invoices with BS dates and sequential invoice numbering.' },
                                { icon: <CreditCard size={18} />, title: 'eSewa & Khalti QR', desc: 'Native QR payment with screenshot verification workflow.' },
                                { icon: <Globe size={18} />, title: 'Nepali translations', desc: 'Menu items in Nepali with one-click AI translation support.' },
                                { icon: <ShieldCheck size={18} />, title: 'NPR currency', desc: 'All amounts in Nepali Rupees — no conversion needed.' },
                            ].map(f => (
                                <div key={f.title} className="bg-white/5 border border-white/8 rounded-xl p-5">
                                    <div className="w-9 h-9 rounded-lg bg-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] mb-3">
                                        {f.icon}
                                    </div>
                                    <h4 className="text-sm font-semibold text-white mb-1">{f.title}</h4>
                                    <p className="text-xs text-gray-400 leading-relaxed">{f.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── How it works ─────────────────────────────────── */}
            <section id="how-it-works" className="section-pad bg-[#FAFAF8]">
                <div className="container-pad">
                    <div className="text-center mb-14">
                        <p className="text-[var(--color-primary)] text-sm font-semibold tracking-widest uppercase mb-3">Process</p>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--color-secondary)]">
                            Live in under 10 minutes
                        </h2>
                    </div>
                    <div className="relative max-w-4xl mx-auto">
                        <div className="hidden md:block absolute top-8 left-[14%] right-[14%] h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/25 to-transparent" />
                        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8">
                            {[
                                { n: '01', icon: <Utensils size={20} />, title: 'Add your menu', desc: 'Upload items, set prices, add photos and modifiers.' },
                                { n: '02', icon: <QrCode size={20} />, title: 'Print QR codes', desc: 'One QR per table — generated instantly from the dashboard.' },
                                { n: '03', icon: <Smartphone size={20} />, title: 'Customers order', desc: 'Scan, browse, order — straight from their phone.' },
                                { n: '04', icon: <ChefHat size={20} />, title: 'Kitchen fires', desc: 'Orders appear on kitchen screens in real time.' },
                            ].map(s => (
                                <div key={s.n} className="relative text-center">
                                    <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white border-2 border-[var(--color-primary)]/15 text-[var(--color-primary)] mb-4 shadow-sm mx-auto">
                                        {s.icon}
                                        <span className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold flex items-center justify-center shadow">
                                            {s.n}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-[var(--color-secondary)] mb-1.5 text-sm">{s.title}</h3>
                                    <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Pricing ──────────────────────────────────────── */}
            <section id="pricing" className="section-pad bg-white">
                <div className="container-pad">
                    <div className="text-center mb-14">
                        <p className="text-[var(--color-primary)] text-sm font-semibold tracking-widest uppercase mb-3">Pricing</p>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--color-secondary)]">
                            Simple, honest pricing
                        </h2>
                        <p className="mt-4 text-gray-500 text-lg">Start free. Upgrade only when you need more.</p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
                        {[
                            { tier: 'Free', price: 'रू 0', period: '/month', desc: 'Try before you commit.', features: ['5 menu items', '3 tables', '1 staff account', 'QR ordering', 'Basic analytics'], cta: 'Get started', href: '/signup', highlight: false },
                            { tier: 'Basic', price: 'रू 1,999', period: '/month', desc: 'Perfect for small restaurants.', features: ['100 menu items', '10 tables', '5 staff accounts', 'Nepal QR payments', 'Promo codes', 'Email support'], cta: 'Start free trial', href: '/signup', highlight: false },
                            { tier: 'Pro', price: 'रू 4,999', period: '/month', desc: 'Full power for growing restaurants.', features: ['Unlimited menu items', '30 tables', '15 staff accounts', 'Loyalty program', 'Dynamic pricing', 'Ingredient tracking', 'Takeout orders', 'Z-reports', 'Priority support'], cta: 'Start free trial', href: '/signup', highlight: true },
                            { tier: 'Enterprise', price: 'Custom', period: '', desc: 'Multi-location chains.', features: ['Everything in Pro', 'Unlimited everything', 'Multi-location panel', 'Custom integrations', 'SLA guarantee', 'Dedicated support'], cta: 'Contact sales', href: 'mailto:hello@kkkhane.com', highlight: false },
                        ].map(p => (
                            <div key={p.tier}
                                 className={`relative rounded-2xl p-6 flex flex-col transition-all ${
                                     p.highlight
                                         ? 'bg-[var(--color-secondary)] text-white ring-2 ring-[var(--color-primary)] shadow-2xl lg:scale-[1.03] lg:-mt-2 lg:mb-2'
                                         : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-lg'
                                 }`}>
                                {p.highlight && (
                                    <div className="absolute -top-4 inset-x-0 flex justify-center">
                                        <span className="bg-[var(--color-primary)] text-white text-xs font-bold px-4 py-1 rounded-full shadow">Most Popular</span>
                                    </div>
                                )}
                                <div className="mb-5">
                                    <h3 className={`text-lg font-bold ${p.highlight ? 'text-white' : 'text-gray-900'}`}>{p.tier}</h3>
                                    <p className={`text-xs mt-1 ${p.highlight ? 'text-gray-400' : 'text-gray-500'}`}>{p.desc}</p>
                                </div>
                                <div className="mb-6 flex items-end gap-1">
                                    <span className={`text-3xl font-black ${p.highlight ? 'text-white' : 'text-[var(--color-secondary)]'}`}>{p.price}</span>
                                    {p.period && <span className={`text-sm mb-1 ${p.highlight ? 'text-gray-400' : 'text-gray-400'}`}>{p.period}</span>}
                                </div>
                                <ul className="space-y-2.5 mb-8 flex-1">
                                    {p.features.map(f => (
                                        <li key={f} className={`flex items-start gap-2 text-sm ${p.highlight ? 'text-gray-300' : 'text-gray-600'}`}>
                                            <CheckCircle size={13} className={`shrink-0 mt-0.5 ${p.highlight ? 'text-[var(--color-primary)]' : 'text-emerald-500'}`} />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <a href={p.href}
                                   className={`block text-center py-3 rounded-xl font-semibold text-sm transition-all ${
                                       p.highlight ? 'bg-[var(--color-primary)] text-white hover:opacity-90 shadow-lg' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                   }`}>
                                    {p.cta}
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Tech stack ───────────────────────────────────── */}
            <div className="py-10 border-y border-gray-100 bg-gray-50/60">
                <div className="max-w-5xl mx-auto px-4 sm:px-6">
                    <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400 mb-6">Built with modern, reliable technology</p>
                    <div className="flex flex-wrap justify-center gap-x-10 gap-y-4">
                        {[
                            { icon: <Zap size={15} />, label: 'Next.js 16' },
                            { icon: <Layers size={15} />, label: 'Supabase / Postgres' },
                            { icon: <ShieldCheck size={15} />, label: 'Row Level Security' },
                            { icon: <Globe size={15} />, label: 'PWA Enabled' },
                            { icon: <Clock size={15} />, label: 'Real-time Sync' },
                            { icon: <CreditCard size={15} />, label: 'QR & Cash Payments' },
                        ].map(t => (
                            <span key={t.label} className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                                {t.icon} {t.label}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── FAQ ──────────────────────────────────────────── */}
            <section id="faq" className="section-pad bg-[#FAFAF8]">
                <div className="max-w-3xl mx-auto px-4 sm:px-6">
                    <div className="text-center mb-12">
                        <p className="text-[var(--color-primary)] text-sm font-semibold tracking-widest uppercase mb-3">FAQ</p>
                        <h2 className="text-3xl sm:text-4xl font-bold text-[var(--color-secondary)]">Common questions</h2>
                    </div>
                    <div className="space-y-3">
                        {[
                            { q: 'Do my customers need to download an app?', a: 'No. Customers scan the QR code on their table with their phone camera and the menu opens in their browser instantly — no app download, no sign-up required.' },
                            { q: 'How does eSewa payment verification work?', a: 'Customers pay via eSewa, Khalti, or Fonepay and upload a screenshot of their payment. Your waiter sees the claim in their feed and verifies or rejects it with one tap. Every transaction is recorded for your accounts.' },
                            { q: 'Can I customize the menu and branding?', a: 'Yes. Fully manage menu items, categories, modifiers, prices, and images. Customize brand colors, fonts, and border radius through the theme editor. Supports Nepali translations.' },
                            { q: 'Is the Free plan really free forever?', a: 'Yes. The Free plan has no time limit — use it with up to 5 menu items, 3 tables, and 1 staff account. Upgrade whenever your restaurant grows and needs more.' },
                            { q: 'Can I manage multiple restaurant locations?', a: 'Yes. The Enterprise plan includes a centralized SaaS admin panel to manage all your restaurants, staff, and subscriptions from one place.' },
                        ].map(({ q, a }) => (
                            <details key={q} className="group bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                                <summary className="flex items-center justify-between px-6 py-4 cursor-pointer text-left font-semibold text-gray-900 hover:bg-gray-50 transition-colors list-none">
                                    <span>{q}</span>
                                    <ChevronDown size={16} className="text-gray-400 group-open:rotate-180 transition-transform shrink-0 ml-4" />
                                </summary>
                                <div className="px-6 pb-4 text-sm text-gray-500 leading-relaxed">{a}</div>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Final CTA ────────────────────────────────────── */}
            <section className="section-pad relative overflow-hidden"
                     style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #f97316 50%, #f59e0b 100%)' }}>
                <div className="absolute inset-0 opacity-[0.06]"
                     style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
                <div className="container-pad relative text-center">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight">
                        Ready to transform<br />your restaurant?
                    </h2>
                    <p className="mt-5 text-white/75 text-lg max-w-xl mx-auto">
                        Join hundreds of restaurants across Nepal already running smarter with KKhane.
                    </p>
                    <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
                        <Link href="/signup"
                              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-[var(--color-primary)] font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all text-base active:scale-[0.98]">
                            Start free today <ArrowRight size={18} />
                        </Link>
                        <Link href="/login"
                              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/15 backdrop-blur-sm border border-white/25 text-white font-semibold rounded-xl hover:bg-white/25 transition-all text-base">
                            Staff login <ArrowUpRight size={16} />
                        </Link>
                    </div>
                    <p className="mt-6 text-white/50 text-sm">No credit card · Free plan available · Setup in minutes</p>
                </div>
            </section>

            {/* ── Footer ───────────────────────────────────────── */}
            <footer className="bg-[var(--color-secondary)]">
                <div className="container-pad py-14">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-10">
                        <div className="lg:col-span-2">
                            <VideoLogo className="h-8" variant="dark" />
                            <p className="mt-4 text-sm text-gray-400 leading-relaxed max-w-xs">
                                All-in-one restaurant management system built for Nepal&apos;s food industry.
                            </p>
                            <div className="mt-5 flex items-center gap-2 text-xs text-gray-500">
                                <MapPin size={12} /> Made with care in Nepal
                            </div>
                        </div>
                        {[
                            { title: 'Product', links: [{ href: '#features', label: 'Features' }, { href: '#pricing', label: 'Pricing' }, { href: '#how-it-works', label: 'How it Works' }, { href: '#faq', label: 'FAQ' }] },
                            { title: 'Resources', links: [{ href: '/docs', label: 'Documentation' }, { href: '/blog', label: 'Blog' }, { href: '/about', label: 'About Us' }, { href: '/contact', label: 'Contact' }] },
                            { title: 'Legal', links: [{ href: '#', label: 'Privacy Policy' }, { href: '#', label: 'Terms of Service' }, { href: '/contact', label: 'Support' }] },
                        ].map(col => (
                            <div key={col.title}>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">{col.title}</h4>
                                <ul className="space-y-3">
                                    {col.links.map(l => (
                                        <li key={l.href}>
                                            <a href={l.href} className="text-sm text-gray-400 hover:text-white transition-colors">{l.label}</a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <div className="mt-12 pt-8 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
                        <p>&copy; <CopyrightYear /> KKhane. All rights reserved.</p>
                        <p>Built with <span className="text-red-400">♥</span> in Nepal</p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
