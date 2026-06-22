import { ReactNode } from 'react'
import Logo from '@/components/shared/Logo'
import { SupportWidget } from '@/components/ui/SupportWidget'

export default function OnboardingLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen w-full relative bg-[radial-gradient(circle,#EAEAEA_1.6px,#fafafb_1.6px)] bg-[size:28px_28px]">
            {/* Header / Logo */}
            <header className="absolute top-0 left-0 right-0 p-8 flex justify-center z-10">
                <Logo className="h-8" />
            </header>

            {/* Main Content Container */}
            <main className="min-h-screen pt-24 pb-12 px-4 flex items-center justify-center">
                {children}
            </main>

            {/* Floating Support Widget */}
            <SupportWidget />
        </div>
    )
}
