'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight, Mail } from 'lucide-react'
import Logo from '@/components/shared/Logo'
import { useState } from 'react'

export default function ContactPage() {
    const [formState, setFormState] = useState({ name: '', email: '', message: '', phone: '' })
    const [submitted, setSubmitted] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitted(true)
        setFormState({ name: '', email: '', message: '', phone: '' })
        setTimeout(() => setSubmitted(false), 3000)
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

            {/* Hero */}
            <section className="py-20 md:py-32 relative z-10 overflow-hidden">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[var(--color-primary)]/5 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10">
                    <div className="inline-block bg-[var(--color-primary)]/10 px-4 py-1.5 rounded-full mb-6 border border-[var(--color-primary)]/20">
                        <span className="text-[var(--color-primary)] font-bold text-sm tracking-wide">Contact Us</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-extrabold text-[var(--color-secondary)] tracking-tight">
                        Get in Touch
                    </h1>
                    <p className="mt-8 text-xl text-gray-600 leading-relaxed font-medium">
                        Have questions? Our team is here to help. Get in touch and we'll get back to you as soon as possible.
                    </p>
                </div>
            </section>

            {/* Contact Form */}
            <section className="pb-24 relative z-10">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-gray-100 grid md:grid-cols-5 gap-12 lg:gap-20">
                        {/* Form */}
                        <div className="md:col-span-3">
                            <h2 className="text-3xl font-extrabold text-gray-900 mb-8 tracking-tight">Send a Message</h2>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {submitted && (
                                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 font-medium flex items-center gap-3">
                                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">✓</div>
                                        Thank you! We'll get back to you soon.
                                    </div>
                                )}

                                <div className="grid sm:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={formState.name}
                                            onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                                            className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] outline-none transition font-medium"
                                            placeholder="Your name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Phone (Optional)</label>
                                        <input
                                            type="tel"
                                            value={formState.phone}
                                            onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                                            className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] outline-none transition font-medium"
                                            placeholder="+977 98XXXXXXXX"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={formState.email}
                                        onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                                        className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] outline-none transition font-medium"
                                        placeholder="your@email.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Message</label>
                                    <textarea
                                        required
                                        value={formState.message}
                                        onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                                        rows={5}
                                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] outline-none transition font-medium resize-none"
                                        placeholder="Tell us about your inquiry..."
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full py-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white font-bold rounded-xl transition shadow-lg shadow-[var(--color-primary)]/20 text-lg"
                                >
                                    Send Message
                                </button>
                            </form>
                        </div>

                        {/* Info */}
                        <div className="md:col-span-2 space-y-10 bg-slate-50 p-8 rounded-2xl border border-gray-100 h-fit">
                            <div>
                                <h3 className="text-xl font-extrabold text-gray-900 mb-3">Direct Contact</h3>
                                <div className="space-y-4">
                                    <a href="mailto:hello@kkkhane.com" className="flex items-center gap-3 text-gray-600 hover:text-[var(--color-primary)] font-medium transition">
                                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-100">📧</div>
                                        hello@kkkhane.com
                                    </a>
                                    <a href="tel:+9779800000000" className="flex items-center gap-3 text-gray-600 hover:text-[var(--color-primary)] font-medium transition">
                                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-100">📞</div>
                                        +977 9800000000
                                    </a>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xl font-extrabold text-gray-900 mb-3">Headquarters</h3>
                                <div className="flex items-start gap-3 text-gray-600 font-medium">
                                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-100 shrink-0">📍</div>
                                    <p className="mt-2">Kathmandu, Nepal<br />South Asia</p>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-200">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Connect on Social</h3>
                                <div className="flex gap-3">
                                    {['Twitter', 'Facebook', 'Instagram', 'LinkedIn'].map(social => (
                                        <a key={social} href="#" className="flex-1 bg-white border border-gray-200 text-gray-600 hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition text-center py-2.5 rounded-lg text-sm font-bold shadow-sm">
                                            {social}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
