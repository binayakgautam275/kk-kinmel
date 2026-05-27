import { requireRole } from '@/lib/auth'
import { getAllShiftsAcrossRestaurants } from '../actions'
import { Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

type Shift = {
    id: string
    user_id: string
    restaurant_id: string
    clock_in: string
    clock_out: string | null
    hours_worked: number | null
    restaurants: { name: string } | null
    users: { full_name: string; roles: { name: string } | null } | null
}

function formatDuration(clockIn: string, clockOut: string | null): string {
    if (!clockOut) return 'Ongoing'
    const diffMs = new Date(clockOut).getTime() - new Date(clockIn).getTime()
    const hours = Math.floor(diffMs / 3600000)
    const mins = Math.floor((diffMs % 3600000) / 60000)
    return `${hours}h ${mins}m`
}

const ROLE_COLORS: Record<string, string> = {
    manager: 'bg-blue-100 text-blue-700',
    kitchen: 'bg-orange-100 text-orange-700',
    waiter: 'bg-teal-100 text-teal-700',
    super_admin: 'bg-indigo-100 text-indigo-700',
}

export default async function ShiftsPage() {
    await requireRole('super_admin')

    const result = await getAllShiftsAcrossRestaurants(200)
    const activeShifts = result.activeShifts as unknown as Shift[]
    const recentShifts = result.recentShifts as unknown as Shift[]

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Staff Shifts</h1>
                <p className="text-gray-500 mt-1 text-sm">Active and recent staff shifts across all restaurant tenants.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="text-2xl font-bold text-emerald-700">{activeShifts.length}</div>
                    <div className="text-xs text-emerald-600 mt-0.5 font-medium">Currently Clocked In</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <div className="text-2xl font-bold text-gray-900">{recentShifts.length}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Recent Shifts</div>
                </div>
            </div>

            {/* Active Shifts */}
            {activeShifts.length > 0 && (
                <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-emerald-100 bg-emerald-50/50 flex items-center gap-2">
                        <Clock size={14} className="text-emerald-600" />
                        <h2 className="font-semibold text-emerald-800">Active Shifts ({activeShifts.length})</h2>
                    </div>
                    <ShiftTable shifts={activeShifts} />
                </div>
            )}

            {/* Recent Shifts */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="font-semibold text-gray-800">Recent Shifts</h2>
                </div>
                {recentShifts.length > 0 ? <ShiftTable shifts={recentShifts} /> : (
                    <div className="p-12 text-center text-gray-400">
                        <Clock size={32} className="mx-auto mb-2 opacity-40" />
                        <p className="text-sm">No recent shifts</p>
                    </div>
                )}
            </div>
        </div>
    )
}

function ShiftTable({ shifts }: { shifts: Shift[] }) {
    const ROLE_COLORS: Record<string, string> = {
        manager: 'bg-blue-100 text-blue-700',
        kitchen: 'bg-orange-100 text-orange-700',
        waiter: 'bg-teal-100 text-teal-700',
        super_admin: 'bg-indigo-100 text-indigo-700',
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold border-b border-gray-100">
                    <tr>
                        <th className="px-5 py-3 text-left">Staff</th>
                        <th className="px-5 py-3 text-left">Restaurant</th>
                        <th className="px-5 py-3 text-left">Role</th>
                        <th className="px-5 py-3 text-left">Clock In</th>
                        <th className="px-5 py-3 text-left">Clock Out</th>
                        <th className="px-5 py-3 text-left">Duration</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {shifts.map(s => {
                        const roleName = s.users?.roles?.name || ''
                        return (
                            <tr key={s.id} className="hover:bg-gray-50/50">
                                <td className="px-5 py-3 font-medium text-gray-900">{s.users?.full_name || '—'}</td>
                                <td className="px-5 py-3 text-gray-600">{s.restaurants?.name || '—'}</td>
                                <td className="px-5 py-3">
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[roleName] || 'bg-gray-100 text-gray-600'}`}>
                                        {roleName.replace('_', ' ') || '—'}
                                    </span>
                                </td>
                                <td className="px-5 py-3 text-gray-500 text-xs">{new Date(s.clock_in).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                <td className="px-5 py-3 text-gray-500 text-xs">
                                    {s.clock_out
                                        ? new Date(s.clock_out).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                        : <span className="text-emerald-600 font-semibold">Active</span>
                                    }
                                </td>
                                <td className="px-5 py-3 text-gray-600 text-xs font-medium">{formatDuration(s.clock_in, s.clock_out)}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
