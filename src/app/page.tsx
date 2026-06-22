import { redirect } from 'next/navigation'
import { getOptionalUser } from '@/lib/auth'
import Link from 'next/link'
import Logo from '@/components/shared/Logo'
import CopyrightYear from '@/components/shared/CopyrightYear'
import MobileNav from './MobileNav'
import Image from 'next/image'
import {
    QrCode, ChefHat, ArrowRight, Smartphone, BarChart3,
    Clock, ShieldCheck, Globe, Users, Utensils,
    Gift, Receipt, CheckCircle, ChevronDown,
    LayoutGrid, Phone, FileText, PiggyBank, Play, Apple,
    MessageCircle, Users2, Star,
    Plus,
    MapPin, Facebook, Instagram, Youtube, Twitter
} from 'lucide-react'

const ROLE_LANDING: Record<string, string> = {
    super_admin: '/admin/dashboard',
    manager: '/admin/dashboard',
    kitchen: '/kitchen',
    waiter: '/waiter',
    onboarding: '/onboarding',
}

const faqs = [
    { q: "What is kkkhane?", a: "kkkhane Nepal is a restaurant management software with smart features to run and manage all the operations of restaurant." },
    { q: "What are the features of kkkhane?", a: "It provides robust features including Order Management, Inventory Tracking, Accounting, Digital QR Menu, and Real-Time Reporting." },
    { q: "Can I use the kkkhane software for free?", a: "Yes, we offer a completely free tier with essential tools for small businesses." },
    { q: "How secure is my restaurant data?", a: "We use top-tier cloud encryption and role-based access control to ensure complete security." },
    { q: "Is kkkhane Nepal available in Android and iOS also?", a: "Yes, you can access our platform on Android, iOS, or any web browser." },
    { q: "Do you offer a QR code menu feature?", a: "Absolutely. Our digital QR menus allow contactless ordering seamlessly." },
    { q: "Can I manage my restaurant remotely?", a: "Yes, being cloud-based, you can access your dashboard from anywhere." },
    { q: "Is kkkhane suitable for small restaurants or cafés?", a: "Yes, our system scales perfectly from small cafes to large chains." },
    { q: "How do I register for free with kkkhane software?", a: "Simply click 'Start for Free' and set up your account in under 2 minutes." },
]

export default async function Home() {
    const currentUser = await getOptionalUser()
    if (currentUser) {
        const landing = ROLE_LANDING[currentUser.role] || '/admin/dashboard'
        redirect(landing)
    }

    return (
        <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden font-sans">

            {/* ── 1. Header & Navigation Bar ─────────────────────────────── */}
            <nav className="fixed top-0 inset-x-0 z-50 bg-white/75 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <Link href="/" className="shrink-0 flex items-center gap-2">
                        <Logo className="h-8" />
                    </Link>

                    <div className="hidden lg:flex items-center gap-8 text-[15px] font-semibold text-gray-700">
                        {/* Features Dropdown */}
                        <div className="group relative h-20 flex items-center">
                            <button className="flex items-center gap-1 hover:text-[var(--color-primary)] transition-colors">
                                Features <ChevronDown size={14} className="group-hover:-rotate-180 transition-transform duration-200" />
                            </button>
                            <div className="absolute top-[80px] left-1/2 -translate-x-1/2 w-[800px] bg-white rounded-2xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 p-6 flex gap-6">
                                <div className="flex-1 grid grid-cols-2 gap-4">
                                    {[
                                        { title: 'Order & KOT Management', desc: 'Take orders perfectly and reduce errors.', icon: <FileText className="text-gray-500" />, href: '/features/order-kot-management' },
                                        { title: 'Inventory & Waste Control', desc: 'Track real-time stock to lower food costs.', icon: <LayoutGrid className="text-gray-500" />, href: '/features/inventory' },
                                        { title: 'Accounting & Expense', desc: 'Track every expense, bill, and payment.', icon: <PiggyBank className="text-gray-500" />, href: '/features/accounting' },
                                        { title: 'Digital QR Menu', desc: 'Let guests scan and order without waiting.', icon: <QrCode className="text-gray-500" />, href: '/features/qr-menu' },
                                        { title: 'Table & Space Management', desc: 'Optimize seating and turn tables faster.', icon: <LayoutGrid className="text-gray-500" />, href: '/features/table-management' },
                                        { title: 'Loyalty & Rewards', desc: 'Keep customers coming back for more.', icon: <Gift className="text-gray-500" />, href: '/features/loyalty' },
                                    ].map(f => (
                                        <Link href={f.href} key={f.title} className="flex gap-3 hover:bg-gray-50 p-3 rounded-xl cursor-pointer transition-colors block">
                                            <div className="mt-1">{f.icon}</div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 text-sm mb-0.5">{f.title}</h4>
                                                <p className="text-xs text-gray-500 leading-snug">{f.desc}</p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                                <div className="w-[280px] flex flex-col gap-4 border-l border-gray-100 pl-6">
                                    {[
                                        { title: 'Real-Time Sales Report', desc: 'Monitor live sales and profit analytics.', icon: <Clock size={18} />, href: '/features/analytics' },
                                        { title: 'Mobile & Web App', desc: 'Works on iOS, Android, or Web.', icon: <Globe size={18} />, href: '/features/apps' },
                                        { title: 'Refer & Earn', desc: 'Refer others, earn free Premium', icon: <Gift size={18} />, href: '/legal/referrals' },
                                    ].map(l => (
                                        <Link href={l.href} key={l.title} className="flex gap-3 hover:text-[var(--color-primary)] cursor-pointer transition-colors block">
                                            <div className="mt-0.5 text-gray-400">{l.icon}</div>
                                            <div>
                                                <h4 className="font-bold text-sm mb-0.5">{l.title}</h4>
                                                <p className="text-xs text-gray-500">{l.desc}</p>
                                            </div>
                                        </Link>
                                    ))}
                                    <Link href="/signup" className="mt-auto bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl relative overflow-hidden group/card cursor-pointer block">
                                        <h4 className="font-bold text-sm text-gray-900 mb-4 pr-10 relative z-10">Digital QR Menu to make your Restaurant smart.</h4>
                                        <span className="text-xs font-bold text-white bg-[var(--color-primary)] px-3 py-1.5 rounded-lg relative z-10">Start for free</span>
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Resources Dropdown */}
                        <div className="group relative h-20 flex items-center">
                            <button className="flex items-center gap-1 hover:text-[var(--color-primary)] transition-colors">
                                Resources <ChevronDown size={14} className="group-hover:-rotate-180 transition-transform duration-200" />
                            </button>
                            <div className="absolute top-[80px] left-0 w-[300px] bg-white rounded-2xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 p-3">
                                {[
                                    { title: 'Blog', desc: 'Blogs help you to optimize your restaurant', icon: <FileText size={18} />, href: '/blog' },
                                    { title: 'Reviews', desc: 'Read reviews from our customers', icon: <MessageCircle size={18} />, href: '/about#reviews' },
                                    { title: 'Customer Stories', desc: 'See how we are helping restaurants', icon: <Users2 size={18} />, href: '/about#stories' },
                                ].map(r => (
                                    <Link href={r.href} key={r.title} className="flex gap-3 hover:bg-gray-50 p-3 rounded-xl cursor-pointer transition-colors block">
                                        <div className="mt-0.5 text-[var(--color-primary)]">{r.icon}</div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-sm mb-0.5">{r.title}</h4>
                                            <p className="text-xs text-gray-500">{r.desc}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        <Link href="/pricing" className="hover:text-[var(--color-primary)] transition-colors">Pricing</Link>
                        <Link href="/legal/career" className="hover:text-[var(--color-primary)] transition-colors">Career</Link>
                        <Link href="/contact" className="hover:text-[var(--color-primary)] transition-colors">Contact</Link>
                    </div>

                    <div className="flex items-center gap-6">
                        <Link href="/login" className="hidden sm:block font-bold text-gray-700 hover:text-[var(--color-primary)] transition-colors">
                            Login
                        </Link>
                        <Link href="/signup" className="bg-[var(--color-primary)] text-white px-6 py-2.5 rounded-full font-bold hover:scale-105 transition-transform shadow-md hover:shadow-lg">
                            Start For Free
                        </Link>
                        <MobileNav />
                    </div>
                </div>
            </nav>

            {/* ── 2. Hero Section ────────────────────────────────────────────── */}
            <section className="relative pt-36 pb-20 overflow-hidden bg-white text-center">
                {/* Everest Silhouette Watermark (CSS abstract placeholder) */}
                <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(ellipse at 50% 100%, #000 0%, transparent 60%)', clipPath: 'polygon(0% 100%, 20% 70%, 35% 85%, 50% 40%, 65% 80%, 80% 60%, 100% 100%)' }}>
                </div>

                <div className="max-w-[1000px] mx-auto px-4 relative z-10">
                    <div className="inline-block bg-purple-50 px-4 py-1.5 rounded-full mb-8 border border-purple-100">
                        <span className="text-[#4B207D] font-bold text-sm tracking-wide">Nepal&apos;s Trusted Restaurant POS 🇳🇵</span>
                    </div>

                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 leading-[1.1] mb-6 tracking-tight">
                        Best Restaurant Management <span className="text-[var(--color-primary)]">Software</span> in Nepal
                    </h1>

                    <p className="text-lg sm:text-xl text-gray-500 mb-10 max-w-3xl mx-auto leading-relaxed font-medium">
                        With <span className="text-[var(--color-primary)] font-bold">kkkhane</span>, manage all your restaurant operations, orders, menu, inventory, finance and more, all from one system.
                    </p>

                    <Link href="/signup" className="inline-flex items-center justify-center bg-[var(--color-primary)] text-white px-8 py-4 rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-xl shadow-[var(--color-primary)]/20 mb-16">
                        Start a 14-day Free Trial <ArrowRight size={20} className="ml-2" />
                    </Link>

                    {/* Hero Graphic & Floating Elements */}
                    <div className="relative max-w-4xl mx-auto animate-fade-up">
                        <div className="rounded-3xl overflow-hidden shadow-2xl border border-gray-100 bg-gray-100 aspect-video relative">
                            <Image src="/images/mockups/dashboard_mockup_1782036296571.png" alt="Dashboard Mockup" fill className="object-cover" priority />
                        </div>

                        {/* Floating Left Card */}
                        <div className="absolute top-1/4 -left-4 sm:-left-12 bg-white rounded-2xl shadow-xl p-3 flex items-center gap-3 animate-float border border-gray-100 z-20">
                            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-500">🍔</div>
                            <div className="text-left">
                                <p className="font-bold text-gray-900 text-sm">Chicken Burger</p>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-md mt-1"><CheckCircle size={10} /> Added</span>
                            </div>
                        </div>

                        {/* Floating Right Card */}
                        <div className="absolute bottom-1/4 -right-4 sm:-right-12 bg-white rounded-2xl shadow-xl p-3 flex flex-col gap-2 animate-float-delayed border border-gray-100 z-20 w-36">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-500">🍕</div>
                                <p className="font-bold text-gray-900 text-xs">Pepperoni Pizza</p>
                            </div>
                            <button className="w-full bg-green-500 text-white font-bold text-[10px] py-1.5 rounded-lg">Add</button>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── 3. Client Logo Marquee ─────────────────────────────────────── */}
            <section className="py-10 border-b border-gray-100 bg-white overflow-hidden">
                <p className="text-center text-gray-500 font-semibold mb-6">Trusted by 7,500+ restaurants of all sizes</p>
                <div className="relative flex overflow-x-hidden group">
                    <div className="animate-marquee flex whitespace-nowrap items-center gap-16 px-8 text-gray-300 font-black text-2xl uppercase tracking-widest">
                        {['Cafe Mocha', 'The Pizza Hub', 'Himalayan Grill', 'Kathmandu Kitchen', 'Spice Route', 'Urban Burger', 'Everest Dine', 'Bistro Nepal'].map(logo => (
                            <span key={logo} className="hover:text-gray-400 transition-colors cursor-pointer">{logo}</span>
                        ))}
                    </div>
                    <div className="absolute top-0 animate-marquee2 flex whitespace-nowrap items-center gap-16 px-8 text-gray-300 font-black text-2xl uppercase tracking-widest">
                        {['Cafe Mocha', 'The Pizza Hub', 'Himalayan Grill', 'Kathmandu Kitchen', 'Spice Route', 'Urban Burger', 'Everest Dine', 'Bistro Nepal'].map(logo => (
                            <span key={logo + '2'} className="hover:text-gray-400 transition-colors cursor-pointer">{logo}</span>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── 4. Core Features Grid ("Our Key Features") ─────────────────── */}
            <section className="py-24 bg-[#FAFAF8]">
                <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Key Features</h2>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Card 1 */}
                        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-shadow text-center group">
                            <div className="h-40 w-full rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 mb-6 flex items-center justify-center relative overflow-hidden">
                                <div className="absolute inset-0 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                                    <div className="bg-white p-4 rounded-xl shadow-md border border-gray-100 flex items-center gap-3">
                                        <Smartphone className="text-blue-500" size={24} />
                                        <span className="font-bold text-gray-800 text-sm">Dine In Order</span>
                                    </div>
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Order Management</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">Streamline your ordering process, track order status, and ensure accurate delivery.</p>
                        </div>

                        {/* Card 2 */}
                        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-shadow text-center group">
                            <div className="h-40 w-full rounded-2xl bg-gradient-to-br from-rose-50 to-orange-50 mb-6 flex items-center justify-center relative overflow-hidden">
                                <div className="absolute inset-0 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                                    <div className="grid grid-cols-2 gap-2 p-2 bg-white rounded-xl shadow-md border border-gray-100">
                                        <div className="w-12 h-12 bg-rose-100 rounded-lg flex items-center justify-center text-xs font-bold text-rose-600">T1</div>
                                        <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-center text-xs font-bold text-gray-400">T2</div>
                                        <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-center text-xs font-bold text-gray-400">T3</div>
                                        <div className="w-12 h-12 bg-rose-100 rounded-lg flex items-center justify-center text-xs font-bold text-rose-600">T4</div>
                                    </div>
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Manage Table & Space</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">Optimize seating arrangements and efficiently manage table assignments.</p>
                        </div>

                        {/* Card 3 */}
                        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-shadow text-center group">
                            <div className="h-40 w-full rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 mb-6 flex items-center justify-center relative overflow-hidden">
                                <div className="absolute inset-0 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                                    <div className="bg-white p-3 rounded-xl shadow-md border border-gray-100 text-center">
                                        <QrCode size={40} className="mx-auto mb-2 text-gray-800" />
                                        <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded">Scan to Order</span>
                                    </div>
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Menu Management</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">Easily update your menu items, categories, and prices across all channels.</p>
                        </div>

                        {/* Card 4 */}
                        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-shadow text-center group">
                            <div className="h-40 w-full rounded-2xl bg-gradient-to-br from-purple-50 to-fuchsia-50 mb-6 flex items-center justify-center relative overflow-hidden">
                                <div className="absolute inset-0 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                                    <div className="bg-white p-4 rounded-xl shadow-md border border-gray-100 flex items-center gap-3">
                                        <ShieldCheck className="text-purple-500" size={24} />
                                        <span className="font-bold text-gray-800 text-sm">Role Access</span>
                                    </div>
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Staff & Role Manage</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">Assign specific roles and permissions to your staff for secure operations.</p>
                        </div>

                        {/* Card 5 */}
                        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-shadow text-center group">
                            <div className="h-40 w-full rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 mb-6 flex items-center justify-center relative overflow-hidden">
                                <div className="absolute inset-0 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                                    <div className="bg-white p-4 rounded-xl shadow-md border border-gray-100 text-center">
                                        <span className="text-2xl font-black text-[var(--color-primary)]">POS</span>
                                        <div className="h-1 w-8 bg-gray-200 mx-auto mt-2 rounded"></div>
                                    </div>
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Billing & POS Management</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">Process payments quickly and securely with our integrated POS system.</p>
                        </div>

                        {/* Card 6 */}
                        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-shadow text-center group">
                            <div className="h-40 w-full rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 mb-6 flex items-center justify-center relative overflow-hidden">
                                <div className="absolute inset-0 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                                    <div className="bg-white p-4 rounded-xl shadow-md border border-gray-100">
                                        <BarChart3 className="text-amber-500" size={32} />
                                    </div>
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Inventory & Finance</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">Keep a close eye on your stock levels, expenses, and financial health.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── 5. Detailed Features Section ─────────────────────────────────── */}
            <section className="py-24 bg-white">
                <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-20">
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
                            Restaurant Management Software made for Nepali Restaurant
                        </h2>
                        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                            Easy Restaurant Software for Every Nepali Restaurant. Do billing, KOT, tables, stock, and reports in one place.
                        </p>
                    </div>

                    <div className="space-y-32">
                        {/* Row 1: Manage Orders */}
                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            <div>
                                <h3 className="text-3xl font-extrabold text-gray-900 mb-6">Manage Orders, <span className="text-[#4B207D]">effortlessly</span></h3>
                                <ul className="space-y-4">
                                    {['Track real-time status of orders', 'Dine-in, delivery, takeaway in one dashboard', 'Send orders directly to Kitchen Display System'].map(item => (
                                        <li key={item} className="flex items-start gap-3">
                                            <CheckCircle className="text-green-500 shrink-0 mt-0.5" size={20} />
                                            <span className="text-gray-600 font-medium">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="rounded-3xl bg-gray-50 p-6 sm:p-10 border border-gray-100">
                                <div className="relative rounded-xl overflow-hidden shadow-2xl aspect-video bg-white">
                                    <Image src="/images/mockups/staff_orders_mockup_1782036323207.png" alt="Manage Orders" fill className="object-cover object-left-top" />
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Inventory Management */}
                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            <div className="order-2 md:order-1 rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 p-6 sm:p-10 flex flex-col gap-4">
                                <div className="bg-white p-6 rounded-2xl shadow-sm flex items-center justify-between border border-gray-100">
                                    <span className="font-bold text-gray-700">Total Stock Items</span>
                                    <span className="font-black text-xl text-indigo-600">1,245</span>
                                </div>
                                <div className="bg-white p-6 rounded-2xl shadow-sm flex items-center justify-between border border-gray-100">
                                    <span className="font-bold text-gray-700">Low Stock Alert</span>
                                    <span className="font-black text-xl text-[var(--color-primary)]">12 Items</span>
                                </div>
                            </div>
                            <div className="order-1 md:order-2">
                                <h3 className="text-3xl font-extrabold text-gray-900 mb-6">Inventory Management, <span className="text-[var(--color-primary)]">know your stock before it runs out</span></h3>
                                <p className="text-gray-600 font-medium leading-relaxed">
                                    Keep track of raw materials, manage suppliers, and automate low-stock alerts so you never run out of your best-selling ingredients.
                                </p>
                            </div>
                        </div>

                        {/* Row 3: IRD Approved Billing */}
                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            <div>
                                <h3 className="text-3xl font-extrabold text-gray-900 mb-6">IRD Approved <span className="text-green-600">Billing</span></h3>
                                <p className="text-gray-600 font-medium leading-relaxed">
                                    Generate legal, VAT/PAN compliant invoices instantly. Fully approved by the Inland Revenue Department of Nepal.
                                </p>
                            </div>
                            <div className="rounded-3xl bg-green-50 p-6 sm:p-10 flex items-center justify-center">
                                <div className="bg-white p-8 rounded-xl shadow-md border border-gray-200 border-dashed max-w-sm w-full text-center">
                                    <ShieldCheck size={48} className="mx-auto text-green-500 mb-4" />
                                    <h4 className="font-black text-xl text-gray-900 mb-2">TAX INVOICE</h4>
                                    <div className="h-1 w-full bg-gray-100 my-4"></div>
                                    <div className="flex justify-between text-xs text-gray-500 font-mono mb-2"><span>PAN:</span><span>123456789</span></div>
                                    <div className="flex justify-between text-xs text-gray-500 font-mono"><span>Date:</span><span>2080-04-12</span></div>
                                </div>
                            </div>
                        </div>

                        {/* Row 4: Digital QR Menus */}
                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            <div className="order-2 md:order-1 rounded-3xl bg-blue-50 p-6 sm:p-10 flex items-center justify-center">
                                <div className="bg-white p-6 rounded-2xl shadow-xl max-w-[200px] text-center border border-gray-100 rotate-[-3deg] hover:rotate-0 transition-transform">
                                    <h4 className="font-black text-sm text-gray-900 mb-4 uppercase tracking-widest">Scan to Order</h4>
                                    <QrCode size={120} className="mx-auto text-gray-800 mb-4" />
                                    <p className="text-[10px] font-bold text-gray-400">Table 05</p>
                                </div>
                            </div>
                            <div className="order-1 md:order-2">
                                <h3 className="text-3xl font-extrabold text-gray-900 mb-6">Digital <span className="text-blue-600">QR Menus</span></h3>
                                <p className="text-gray-600 font-medium leading-relaxed">
                                    Replace printed menus with dynamic digital menus. Update prices, hide out-of-stock items, and add photos in real-time.
                                </p>
                            </div>
                        </div>

                        {/* Full Width: Available on any device */}
                        <div className="grid lg:grid-cols-2 gap-8 items-stretch">
                            <div className="bg-gray-50 rounded-3xl p-10 flex flex-col items-center text-center border border-gray-100">
                                <h3 className="text-3xl font-extrabold text-gray-900 mb-2">Available on any <span className="text-[var(--color-primary)]">device</span></h3>
                                <p className="text-gray-500 font-medium mb-10">Manage your business from your phone, tablet, or desktop.</p>

                                <div className="relative w-full max-w-sm aspect-[3/4] bg-white rounded-[2rem] shadow-2xl border-8 border-gray-900 overflow-hidden mb-8 transform -rotate-2">
                                    <div className="absolute top-0 inset-x-0 h-6 bg-gray-900 rounded-b-xl z-10 w-32 mx-auto"></div>
                                    <Image src="/images/mockups/dashboard_mockup_1782036296571.png" alt="Mobile View" fill className="object-cover object-left" />
                                </div>

                                <div className="flex gap-4">
                                    <div className="bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2">
                                        <Play size={16} className="fill-current" /> <span className="text-xs font-bold">Google Play</span>
                                    </div>
                                    <div className="bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2">
                                        <Apple size={16} className="fill-current" /> <span className="text-xs font-bold">App Store</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-lg flex flex-col gap-6 overflow-hidden">
                                <h4 className="text-xl font-bold text-gray-900 mb-2">What our users say</h4>
                                {[
                                    { name: 'Sandesh Thapa', stars: 5, text: 'This system changed how we run our cafe. Everything is automated and easy!' },
                                    { name: 'Jahith Mohammed', stars: 5, text: 'Best customer support and the UI is incredibly simple for my staff to learn.' },
                                    { name: 'Prakash Shrestha', stars: 5, text: 'Inventory tracking has saved me so much money on food waste. Highly recommend.' }
                                ].map((review, i) => (
                                    <div key={i} className="bg-gray-50 p-6 rounded-2xl border border-gray-100 relative group hover:bg-white hover:shadow-md transition-all">
                                        <div className="flex gap-1 text-amber-400 mb-3">
                                            {[...Array(review.stars)].map((_, idx) => <Star key={idx} size={14} fill="currentColor" />)}
                                        </div>
                                        <p className="text-sm font-medium text-gray-700 leading-relaxed mb-4">"{review.text}"</p>
                                        <p className="text-xs font-bold text-gray-900">- {review.name}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── 6. Onboarding Timeline ─────────────────────────────────────── */}
            <section id="how-it-works" className="py-24 bg-[#FAFAF8]">
                <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-extrabold text-gray-900">
                            The fastest way to setup & run your restaurant
                        </h2>
                    </div>

                    <div className="relative border-[3px] border-dashed border-gray-200 rounded-3xl p-8 sm:p-12 bg-white">
                        <div className="space-y-24">
                            {/* Step 1 */}
                            <div className="grid md:grid-cols-2 gap-10 items-center">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-6">1. Create Your Account</h3>
                                    <p className="text-gray-500 mb-6 font-medium">Get started from any device, anywhere, anytime. Whether you have an email or phone number, creating your account takes less than 2 minutes.</p>
                                    <ul className="space-y-4">
                                        {['Quick 2-minute setup', 'No credit card required', 'You get access to all features instantly'].map(item => (
                                            <li key={item} className="flex items-center gap-3 font-medium text-gray-700">
                                                <div className="bg-green-100 text-green-600 rounded-full p-0.5"><CheckCircle size={14} /></div>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="bg-gray-50 rounded-2xl p-6 relative border border-gray-100 shadow-sm">
                                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 w-3/4 mx-auto animate-float">
                                        <div className="flex items-center gap-2 text-green-600 mb-2 font-bold text-xs"><CheckCircle size={14} /> OTP sent successfully</div>
                                        <div className="h-2 bg-gray-100 rounded w-full mb-2"></div>
                                        <div className="h-2 bg-gray-100 rounded w-1/2"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className="grid md:grid-cols-2 gap-10 items-center">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-6">2. Setup Menu & Table</h3>
                                    <p className="text-gray-500 mb-6 font-medium">Add your food items, categories, prices, and variants in a clean, simple interface. Setup your table layout for dine-in.</p>
                                    <ul className="space-y-4">
                                        {['Add food items, combos, and add-ons', 'Assign QR codes to tables', 'Enable online, dine-in, or takeaway menus'].map(item => (
                                            <li key={item} className="flex items-center gap-3 font-medium text-gray-700">
                                                <div className="bg-green-100 text-green-600 rounded-full p-0.5"><CheckCircle size={14} /></div>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="bg-gray-50 rounded-2xl p-6 relative border border-gray-100 shadow-sm flex items-center justify-center">
                                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 animate-float-delayed">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600 font-black">20</div>
                                            <span className="font-bold text-gray-900 text-sm">Active Tables</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="grid md:grid-cols-2 gap-10 items-center">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-6">3. Start Taking Order</h3>
                                    <p className="text-gray-500 mb-6 font-medium">Begin billing and managing orders instantly. Within seconds you can start.</p>
                                    <ul className="space-y-4">
                                        {['Take customer orders', 'Print bills or send them digitally', 'Start earning from the first day'].map(item => (
                                            <li key={item} className="flex items-center gap-3 font-medium text-gray-700">
                                                <div className="bg-green-100 text-green-600 rounded-full p-0.5"><CheckCircle size={14} /></div>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="bg-gray-50 rounded-2xl p-6 relative border border-gray-100 shadow-sm flex items-center justify-center">
                                    <div className="bg-[var(--color-primary)] text-white font-bold px-8 py-4 rounded-xl shadow-xl shadow-[var(--color-primary)]/20 animate-pulse">
                                        Order now
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── 7. Additional Features Row ─────────────────────────────────── */}
            <section className="py-20 bg-white">
                <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm hover:shadow-md transition-shadow">
                            <h4 className="text-xl font-bold text-gray-900 mb-4 flex justify-between items-center">
                                Invite Your Staff <Plus className="text-gray-400" />
                            </h4>
                            <p className="text-gray-500 font-medium leading-relaxed">Role-based access with staff activity logs for data control.</p>
                        </div>
                        <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm hover:shadow-md transition-shadow">
                            <h4 className="text-xl font-bold text-gray-900 mb-4 flex justify-between items-center">
                                Add Customer <Plus className="text-gray-400" />
                            </h4>
                            <p className="text-gray-500 font-medium leading-relaxed">Add your customers and manage their orders & transactions.</p>
                        </div>
                        <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm hover:shadow-md transition-shadow">
                            <h4 className="text-xl font-bold text-gray-900 mb-4 flex justify-between items-center">
                                Tracking Inventory <Plus className="text-gray-400" />
                            </h4>
                            <p className="text-gray-500 font-medium leading-relaxed">Track your inventory and manage your stock with ease.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── 8. Testimonials Masonry ────────────────────────────────────── */}
            <section className="py-24 bg-[#FAFAF8]">
                <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-extrabold text-gray-900 mb-4">
                            Hear from Our Happy Users!
                        </h2>
                        <p className="text-gray-500 font-medium text-lg">Stories, feedback, and experiences shared by businesses growing with our software.</p>
                    </div>

                    <div className="columns-1 md:columns-2 lg:columns-3 gap-6">
                        {[
                            { name: "Prakash Shrestha", role: "Owner", platform: "Google", text: "I have been using this app since a year now. I like all features. It is simple to setup and it helps me to take orders from customers. The main features I liked of this app is, <highlight>customer can scan qr code and oder from their phone which best... UI is nice</highlight>" },
                            { name: "Shrutika Gurung", role: "Cafe Owner", platform: "Google", text: "As a cafe owner in Nepal, kkkhane has been a game-changer for my daily operations. Order taking, billing, stock tracking—sabal kura ekdam sajilo bhayo. <highlight>Customers love the QR menu, and the support team is quick and friendly.</highlight> Perfect software for Nepali restaurants!" },
                            { name: "Raj Kumar Gurung", role: "Owner", platform: "Google", text: "The dashboard is clean and easy to understand. <highlight>I love how I can see daily reports and trends at a glance.</highlight> really helps me plan ahead." },
                            { name: "Darshan Thapa", role: "Owner", platform: "Google", text: "I've been using this POS software for my two cafés, and it's been a great experience so far. The system is <highlight>easy to use, with a clean and minimal interface that makes daily operations smooth and efficient.</highlight>" },
                            { name: "Celina Dangol", role: "Owner", platform: "AppStore", text: "What I love most is I don't need extra hardware. <highlight>I can manage everything on my phone.</highlight> It's the most flexible restaurant management software in Nepal." },
                            { name: "Anup Gautam", role: "Owner", platform: "Google", text: "<highlight>No more paper menus or miscommunication.</highlight> Our customers love the QR code menu and easy ordering. keeps everything digital and efficient." }
                        ].map((r, i) => (
                            <div key={i} className="break-inside-avoid mb-6 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-lg transition-shadow">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex gap-4 items-center">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center font-bold text-gray-700 text-lg uppercase">
                                            {r.name.substring(0, 2)}
                                        </div>
                                        <div>
                                            <h5 className="font-bold text-gray-900">{r.name}</h5>
                                            <p className="text-xs text-gray-500">{r.role}</p>
                                        </div>
                                    </div>
                                    <Globe size={20} className="text-blue-500" />
                                </div>
                                <div className="flex gap-1 mb-4 text-amber-400">
                                    {[...Array(5)].map((_, idx) => <Star key={idx} size={16} fill="currentColor" />)}
                                </div>
                                <p className="text-gray-600 text-balance font-medium leading-relaxed" dangerouslySetInnerHTML={{
                                    __html: r.text.replace(/<highlight>(.*?)<\/highlight>/g, '<span class="bg-pink-100 text-gray-900 px-1.5 py-0.5 rounded font-bold shadow-sm">$1</span>')
                                }} />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── 9. FAQ Section ─────────────────────────────────────────────── */}
            <section id="faq" className="py-24 bg-white">
                <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-extrabold text-gray-900">People Often <span className="text-[var(--color-primary)]">Ask Questions?</span></h2>
                        <p className="text-gray-500 font-medium mt-4">Here are some of the most common questions we get asked.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-x-8 gap-y-4 items-start">
                        {/* Column 1 */}
                        <div className="space-y-4">
                            {faqs.slice(0, Math.ceil(faqs.length / 2)).map((faq, i) => (
                                <details key={i} className="group bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                    <summary className="flex justify-between items-center font-bold text-gray-900 cursor-pointer list-none p-6">
                                        <span className="pr-6">{faq.q}</span>
                                        <Plus className="text-gray-400 group-open:hidden shrink-0" size={20} />
                                        <span className="text-[var(--color-primary)] hidden group-open:block shrink-0">—</span>
                                    </summary>
                                    <div className="px-6 pb-6 text-gray-600 font-medium leading-relaxed bg-[var(--color-primary)]/5 rounded-b-2xl pt-2">
                                        {faq.a}
                                    </div>
                                </details>
                            ))}
                        </div>
                        {/* Column 2 */}
                        <div className="space-y-4">
                            {faqs.slice(Math.ceil(faqs.length / 2)).map((faq, i) => (
                                <details key={i} className="group bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                    <summary className="flex justify-between items-center font-bold text-gray-900 cursor-pointer list-none p-6">
                                        <span className="pr-6">{faq.q}</span>
                                        <Plus className="text-gray-400 group-open:hidden shrink-0" size={20} />
                                        <span className="text-[var(--color-primary)] hidden group-open:block shrink-0">—</span>
                                    </summary>
                                    <div className="px-6 pb-6 text-gray-600 font-medium leading-relaxed bg-[var(--color-primary)]/5 rounded-b-2xl pt-2">
                                        {faq.a}
                                    </div>
                                </details>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── 10. CTA Banner ─────────────────────────────────────────────── */}
            <section className="py-24 bg-white relative overflow-hidden">
                <div className="max-w-[1200px] mx-auto px-4">
                    <div className="relative bg-gradient-to-b from-blue-50/50 to-white rounded-[3rem] p-16 sm:p-24 text-center border border-gray-100 shadow-2xl overflow-hidden">
                        {/* Decorative dashed target rings */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-dashed border-gray-200 rounded-full opacity-50 pointer-events-none"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-dashed border-gray-200 rounded-full opacity-50 pointer-events-none"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-dashed border-gray-200 rounded-full opacity-50 pointer-events-none"></div>

                        {/* Floating Badges */}
                        <div className="absolute top-10 left-[10%] bg-white border border-gray-100 shadow-xl rounded-xl p-4 animate-float-slow z-10 w-48">
                            <div className="flex items-center gap-2 mb-2 text-green-500 font-bold text-xs"><CheckCircle size={14} /> Order Created</div>
                            <div className="h-2 bg-gray-100 rounded w-full mb-1"></div>
                        </div>
                        <div className="absolute bottom-10 right-[10%] bg-white border border-gray-100 shadow-xl rounded-xl p-4 animate-float z-10 w-48">
                            <div className="flex items-center gap-2 mb-2 text-blue-500 font-bold text-xs"><FileText size={14} /> KOT Created</div>
                            <div className="h-2 bg-gray-100 rounded w-full mb-1"></div>
                        </div>

                        <div className="relative z-20 max-w-2xl mx-auto">
                            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
                                Ready to improve your <span className="text-[#4B207D]">productivity?</span>
                            </h2>
                            <p className="text-lg text-gray-500 font-medium mb-10">
                                Start with kkkhane today and make service smoother for your team and customers.
                            </p>
                            <Link href="/signup" className="inline-flex items-center justify-center bg-[var(--color-primary)] text-white px-8 py-4 rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-xl shadow-[var(--color-primary)]/20">
                                Get 14 days for free <ArrowRight size={20} className="ml-2" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── 11. Footer ─────────────────────────────────────────────────── */}
            <footer className="bg-[#f9fafb] border-t border-gray-200 pt-20 pb-10">
                <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                        {/* Col 1 */}
                        <div>
                            <Logo className="h-8 mb-6" />
                            <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8">
                                #1 Restaurant Software to manage and grow your restaurant - smarter, faster.
                            </p>
                            <div className="flex gap-3">
                                {[
                                    { icon: <Facebook size={18}/>, url: 'https://facebook.com/kkkhane' },
                                    { icon: <Instagram size={18}/>, url: 'https://instagram.com/kkkhane' },
                                    { icon: <Youtube size={18}/>, url: 'https://youtube.com/@kkkhane' },
                                    { icon: <Twitter size={18}/>, url: 'https://twitter.com/kkkhane' }
                                ].map(s => (
                                    <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors shadow-sm">
                                        {s.icon}
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* Col 2 */}
                        <div>
                            <h4 className="font-bold text-gray-900 mb-6 text-lg">Features</h4>
                            <ul className="space-y-4">
                                {['Order Management with KOT', 'Inventory & Waste Control', 'Accounting & Expense Manager', 'Digital QR Menu', 'Menu & Table Management', 'Real Time Sales Report', 'Loyalty & Rewards', 'Refer & Earn'].map(l => (
                                    <li key={l}><Link href={`/features/${l.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="text-sm text-gray-600 font-medium hover:text-[var(--color-primary)] transition-colors">{l}</Link></li>
                                ))}
                            </ul>
                        </div>

                        {/* Col 3 */}
                        <div>
                            <h4 className="font-bold text-gray-900 mb-6 text-lg">Resources</h4>
                            <ul className="space-y-4">
                                {['Blogs', 'Contact Us', 'Reviews', 'Customer Stories'].map(l => (
                                    <li key={l}><Link href={l === 'Blogs' ? '/blog' : l === 'Contact Us' ? '/contact' : '/about'} className="text-sm text-gray-600 font-medium hover:text-[var(--color-primary)] transition-colors">{l}</Link></li>
                                ))}
                            </ul>
                        </div>

                        {/* Col 4 */}
                        <div>
                            <h4 className="font-bold text-gray-900 mb-6 text-lg">Download our App</h4>
                            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm inline-block mb-6">
                                <QrCode size={80} className="text-gray-800" />
                            </div>
                            <div className="flex flex-col gap-3">
                                <Link href="#" className="bg-black text-white px-4 py-2.5 rounded-xl flex items-center gap-3 hover:bg-gray-800 transition-colors shadow-md">
                                    <Play size={24} className="fill-current" />
                                    <div className="text-left">
                                        <div className="text-[10px] uppercase font-bold text-gray-400">Get it on</div>
                                        <div className="text-sm font-bold leading-tight">Google Play</div>
                                    </div>
                                </Link>
                                <Link href="#" className="bg-black text-white px-4 py-2.5 rounded-xl flex items-center gap-3 hover:bg-gray-800 transition-colors shadow-md">
                                    <Apple size={24} className="fill-current" />
                                    <div className="text-left">
                                        <div className="text-[10px] uppercase font-bold text-gray-400">Download on the</div>
                                        <div className="text-sm font-bold leading-tight">App Store</div>
                                    </div>
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Pre-footer */}
                    <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-3xl p-8 sm:p-10 mb-12 border border-gray-100 shadow-sm">
                        <div className="mb-8">
                            <h3 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2 mb-2">Get in Touch 👋</h3>
                            <p className="text-gray-600 font-medium">Ready to transform your restaurant? Contact our team today.</p>
                        </div>
                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="bg-white/80 backdrop-blur p-6 rounded-2xl border border-white shadow-sm">
                                <div className="flex items-center gap-2 text-blue-600 font-bold mb-4"><Phone size={18} /> Sales Team</div>
                                <p className="text-sm font-bold text-gray-900 mb-2">+977 9800000000</p>
                                <p className="text-sm font-bold text-gray-900">sales@kkkhane.com</p>
                            </div>
                            <div className="bg-white/80 backdrop-blur p-6 rounded-2xl border border-white shadow-sm">
                                <div className="flex items-center gap-2 text-green-600 font-bold mb-4"><Phone size={18} /> Support Team</div>
                                <p className="text-sm font-bold text-gray-900 mb-2">+977 9800000000</p>
                                <p className="text-sm font-bold text-gray-900">support@kkkhane.com</p>
                            </div>
                            <div className="bg-white/80 backdrop-blur p-6 rounded-2xl border border-white shadow-sm">
                                <div className="flex items-center gap-2 text-[var(--color-primary)] font-bold mb-4"><MapPin size={18} /> Service Location</div>
                                <p className="text-sm text-gray-600 font-medium leading-relaxed">
                                    We provide comprehensive restaurant management solutions across all regions of Nepal.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-200 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500 font-medium">
                        <div className="flex gap-6">
                            <Link href="/legal/refund" className="hover:text-gray-900 transition-colors">Refund</Link>
                            <Link href="/legal/privacy" className="hover:text-gray-900 transition-colors">Privacy Policy</Link>
                            <Link href="/legal/terms" className="hover:text-gray-900 transition-colors">Terms & Conditions</Link>
                        </div>
                        <p>&copy; <CopyrightYear /> kkkhane. All Rights Reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
