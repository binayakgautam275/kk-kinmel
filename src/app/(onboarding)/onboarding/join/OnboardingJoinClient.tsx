'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, RefreshCcw, Lightbulb } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { checkInvitationStatus } from './actions'

export default function OnboardingJoinClient({
    userId,
    userEmail,
    userName
}: {
    userId: string
    userEmail: string
    userName: string
}) {
    const router = useRouter()
    const [isRefreshing, setIsRefreshing] = useState(false)

    const handleRefresh = async () => {
        setIsRefreshing(true)
        try {
            const result = await checkInvitationStatus()
            if (result.success) {
                // Yay! We have been assigned to a restaurant.
                router.push('/admin/dashboard')
            } else {
                // Optionally show a toast that no invitation was found
            }
        } finally {
            setTimeout(() => setIsRefreshing(false), 500)
        }
    }

    const qrData = JSON.stringify({ type: 'kkkhane_invite', userId, email: userEmail, name: userName })

    return (
        <div className="flex flex-col md:flex-row bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[500px]">
            
            {/* Left Pane - QR Code */}
            <div className="w-full md:w-1/2 p-8 sm:p-10 border-b md:border-b-0 md:border-r border-gray-100 flex flex-col">
                <div className="flex items-center gap-4 mb-10">
                    <button 
                        onClick={() => router.push('/onboarding')}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors shrink-0"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <h2 className="text-xl font-extrabold text-gray-900">Join a restaurant</h2>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xl mb-6">
                        <QRCodeSVG 
                            value={qrData}
                            size={200}
                            level="H"
                            includeMargin={false}
                        />
                    </div>
                    <p className="text-gray-600 font-medium max-w-[250px] mx-auto leading-relaxed mb-8">
                        Ask an Owner or Admin to scan this and invite you.
                    </p>

                    <div className="w-full flex items-center gap-4 mb-8">
                        <div className="flex-1 h-px bg-gray-100"></div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">OR</span>
                        <div className="flex-1 h-px bg-gray-100"></div>
                    </div>

                    <p className="text-xs text-gray-400 mb-4 font-medium uppercase tracking-wider">Share your details to be found</p>
                    
                    <div className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-left space-y-3">
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-bold text-gray-400 w-20 shrink-0">Username</span>
                            <span className="text-sm font-bold text-gray-900 truncate">{userName}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-bold text-gray-400 w-20 shrink-0">Email</span>
                            <span className="text-sm font-bold text-gray-900 truncate">{userEmail}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Pane - Pending Invitations */}
            <div className="w-full md:w-1/2 p-8 sm:p-10 bg-gray-50/30 flex flex-col">
                <div className="flex items-center justify-between mb-10">
                    <h2 className="text-lg font-bold text-gray-900">Pending Invitations</h2>
                    <button 
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        <RefreshCcw size={14} className={isRefreshing ? "animate-spin text-[var(--color-primary)]" : ""} /> Refresh
                    </button>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                        <Lightbulb size={24} className="text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Invitations Found</h3>
                    <p className="text-gray-500 font-medium">Ask an owner to invite you, then refresh.</p>
                </div>
            </div>
            
        </div>
    )
}
