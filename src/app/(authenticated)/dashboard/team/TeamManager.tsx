'use client'

import { useActionState, useState, useEffect } from 'react'
import { inviteStaffMember, removeStaffMember } from '../actions'
import { UserPlus, Copy, Check, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface StaffMember {
    id: string
    full_name: string | null
    email: string | null
    role_id: number | null
    roles: { name: string }[] | null
    created_at: string | null
    is_active: boolean | null
}

const ROLE_COLORS: Record<string, string> = {
    super_admin: 'bg-purple-100 text-purple-800',
    manager:     'bg-blue-100 text-blue-700',
    kitchen:     'bg-orange-100 text-orange-700',
    waiter:      'bg-green-100 text-green-700',
    cashier:     'bg-emerald-100 text-emerald-700',
}

export default function TeamManager({ initialStaff }: { initialStaff: StaffMember[] }) {
    const [staff, setStaff] = useState(initialStaff)
    const [showInvite, setShowInvite] = useState(false)
    const [copied, setCopied] = useState(false)
    const [removingId, setRemovingId] = useState<string | null>(null)

    const [inviteState, inviteAction, invitePending] = useActionState(inviteStaffMember, {})

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleRemove = async (userId: string) => {
        if (!confirm('Deactivate this staff member? They will lose access immediately.')) return
        setRemovingId(userId)
        const result = await removeStaffMember(userId)
        setRemovingId(null)
        if (!result.error) {
            setStaff(prev => prev.filter(s => s.id !== userId))
            toast.success("Staff member deactivated.")
        } else {
            toast.error(result.error)
        }
    }

    useEffect(() => {
        if (inviteState.error) {
            toast.error(inviteState.error)
        }
    }, [inviteState.error])

    // After successful invite, collapse form
    const showSuccessBanner = !!inviteState.tempPassword

    return (
        <div className="space-y-5">
            {/* Temp password reveal */}
            {showSuccessBanner && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-green-800 mb-1">Staff member invited!</p>
                    <p className="text-sm text-green-700 mb-3">Share this temporary password with them. It will only be shown once.</p>
                    <div className="flex items-center gap-2 bg-white border border-green-300 rounded-lg px-3 py-2">
                        <code className="flex-1 text-sm font-mono text-gray-900 tracking-widest">{inviteState.tempPassword}</code>
                        <button
                            onClick={() => handleCopy(inviteState.tempPassword!)}
                            className="shrink-0 p-1.5 text-green-600 hover:text-green-800 transition"
                            title="Copy to clipboard"
                        >
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                    </div>
                </div>
            )}

            {/* Staff table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-gray-900">Staff Members</h2>
                    <button
                        onClick={() => setShowInvite(v => !v)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition"
                    >
                        <UserPlus size={15} />
                        Invite Staff
                        {showInvite ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                </div>

                {/* Invite form */}
                {showInvite && (
                    <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                        <form action={inviteAction} className="space-y-4">
                            <div className="grid sm:grid-cols-3 gap-3">
                                <input
                                    type="text"
                                    name="full_name"
                                    placeholder="Full name"
                                    required
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                />
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Email address"
                                    required
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                />
                                <select
                                    name="role"
                                    defaultValue="waiter"
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                >
                                    <option value="waiter">Waiter</option>
                                    <option value="kitchen">Kitchen</option>
                                    <option value="cashier">Cashier</option>
                                    <option value="manager">Manager</option>
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={invitePending}
                                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
                                >
                                    {invitePending ? 'Creating account…' : 'Send Invite'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowInvite(false)}
                                    className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Staff list */}
                {staff.length === 0 ? (
                    <div className="px-5 py-12 text-center text-sm text-gray-400">
                        No staff members yet. Invite your team to get started.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {staff.map(member => (
                            <div key={member.id} className="px-5 py-4 flex items-center justify-between gap-3 hover:bg-gray-50 transition">
                                <div className="min-w-0">
                                    <p className="font-medium text-gray-900 text-sm truncate">{member.full_name || '—'}</p>
                                    <p className="text-xs text-gray-500 truncate">{member.email || '—'}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {member.roles?.[0]?.name && (
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${ROLE_COLORS[member.roles[0].name] || 'bg-gray-100 text-gray-700'}`}>
                                            {member.roles[0].name.replace('_', ' ')}
                                        </span>
                                    )}
                                    {!member.is_active && (
                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">inactive</span>
                                    )}
                                    <button
                                        onClick={() => handleRemove(member.id)}
                                        disabled={removingId === member.id}
                                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-40"
                                        title="Remove staff member"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <p className="text-xs text-gray-400 text-center">
                Staff members receive login credentials and can access the{' '}
                <span className="font-medium">kitchen</span> or <span className="font-medium">waiter</span> portal.
            </p>
        </div>
    )
}
