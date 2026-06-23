import { Wifi, ShieldAlert, RefreshCw } from 'lucide-react'
import { headers } from 'next/headers'
import { getClientIp } from '@/lib/ip-check'
import SignOutButton from './SignOutButton'

export const dynamic = 'force-dynamic'

export default async function WifiRequiredPage(props: {
    searchParams: Promise<{ redirect?: string }>
}) {
    const searchParams = await props.searchParams
    const redirectUrl = searchParams.redirect || '/login'
    const reqHeaders = await headers()
    const clientIp = getClientIp(reqHeaders)

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100 font-sans selection:bg-rose-500/30">
            {/* Background decorative glows */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-[128px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[128px] pointer-events-none" />

            <div className="relative w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
                <div className="mx-auto w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center text-rose-500 animate-pulse animate-duration-1000">
                    <Wifi size={32} />
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight text-white">WiFi Connection Required</h1>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        To access this staff panel, your device must be connected to the restaurant's local WiFi network.
                    </p>
                </div>

                <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 text-left space-y-2 text-xs">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Your Current IP:</span>
                        <span className="font-mono text-slate-300 font-medium">{clientIp}</span>
                    </div>
                    <div className="flex items-start gap-1.5 text-slate-500 mt-1">
                        <ShieldAlert size={12} className="shrink-0 mt-0.5" />
                        <span>IP restriction is active. Managers and administrators can bypass this and connect from anywhere.</span>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <a
                        href={redirectUrl}
                        className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white rounded-xl text-sm font-semibold transition-all duration-300 shadow-lg shadow-rose-500/10 hover:shadow-rose-600/20"
                    >
                        <RefreshCw size={15} />
                        Retry Connection
                    </a>
                    <SignOutButton />
                </div>
            </div>
        </div>
    )
}
