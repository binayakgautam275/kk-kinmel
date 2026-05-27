'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight, Mail } from 'lucide-react'
import VideoLogo from '@/components/shared/VideoLogo'
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
                <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-[var(--color-secondary)]">
                        Get in Touch
                    </h1>
                    <p className="mt-6 text-lg text-gray-600">
                        Have questions? Our team is here to help. Get in touch and we'll get back to you as soon as possible.
                    </p>
                </div>
            </section>

            {/* Contact Form */}
            <section className="py-16 md:py-24">
                <div className="max-w-2xl mx-auto px-4 sm:px-6">
                    <div className="grid md:grid-cols-2 gap-12">
                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {submitted && (
                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                                    ✓ Thank you! We'll get back to you soon.
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formState.name}
                                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] outline-none transition"
                                    placeholder="Your name"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={formState.email}
                                    onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] outline-none transition"
                                    placeholder="your@email.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Phone (Optional)</label>
                                <input
                                    type="tel"
                                    value={formState.phone}
                                    onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] outline-none transition"
                                    placeholder="+977 98XXXXXXXX"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                                <textarea
                                    required
                                    value={formState.message}
                                    onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                                    rows={5}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] outline-none transition resize-none"
                                    placeholder="Tell us about your inquiry..."
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 bg-[var(--color-primary)] hover:opacity-90 text-white font-semibold rounded-lg transition"
                            >
                                Send Message
                            </button>
                        </form>

                        {/* Info */}
                        <div className="space-y-8">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Email</h3>
                                <p className="text-gray-600">hello@kkkhane.com</p>
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Location</h3>
                                <p className="text-gray-600">
                                    Kathmandu, Nepal<br />
                                    South Asia
                                </p>
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Response Time</h3>
                                <p className="text-gray-600">
                                    We typically respond within 24 business hours. For urgent matters, please call or email directly.
                                </p>
                            </div>

                            <div className="pt-4">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Follow Us</h3>
                                <div className="flex gap-4">
                                    <a href="#" className="text-gray-600 hover:text-[var(--color-primary)] transition">Twitter</a>
                                    <a href="#" className="text-gray-600 hover:text-[var(--color-primary)] transition">Facebook</a>
                                    <a href="#" className="text-gray-600 hover:text-[var(--color-primary)] transition">Instagram</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
