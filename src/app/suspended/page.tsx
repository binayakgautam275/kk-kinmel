import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export default function SuspendedPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-10 max-w-md w-full text-center">
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-red-50 rounded-full">
                        <AlertTriangle size={40} className="text-red-500" />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-3">Account Suspended</h1>
                <p className="text-gray-500 mb-2">
                    Your restaurant account has been temporarily suspended.
                </p>
                <p className="text-gray-500 mb-8">
                    This may be due to an overdue subscription or a policy issue.
                    Please contact support to restore access.
                </p>

                <a
                    href="mailto:hello@kkkhane.com"
                    className="block w-full py-3 px-6 bg-[#E85D04] text-white font-semibold rounded-xl hover:opacity-90 transition mb-3"
                >
                    Contact Support
                </a>

                <Link
                    href="/login"
                    className="block w-full py-3 px-6 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition text-sm"
                >
                    Sign In with a Different Account
                </Link>
            </div>
        </div>
    )
}
