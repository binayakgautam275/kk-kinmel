'use client'

import { useState } from 'react'
import { approveShiftAction, forceClockOutAction, correctShiftAction } from './actions'
import { Clock, CheckCircle, LogOut, User, Pencil, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface ShiftRow {
    id: string
    user_id: string
    clock_in: string
    clock_out: string | null
    hours_worked: number | null
    break_minutes: number
    notes: string | null
    is_approved: boolean
    users?: { full_name: string | null; role_id: number; roles: { name: string } | null } | null
}

function getStaffName(shift: ShiftRow) {
    return shift.users?.full_name || '—'
}

function getStaffRole(shift: ShiftRow) {
    return shift.users?.roles?.name || '—'
}

function duration(clockIn: string, clockOut?: string | null) {
    const start = new Date(clockIn)
    const end = clockOut ? new Date(clockOut) : new Date()
    const mins = Math.floor((end.getTime() - start.getTime()) / 60000)
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${h}h ${m}m`
}

// Format ISO datetime to local datetime-local input value (YYYY-MM-DDTHH:mm)
function toDatetimeLocal(iso: string) {
    const d = new Date(iso)
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function CorrectionModal({ shift, onClose, onSaved }: {
    shift: ShiftRow
    onClose: () => void
    onSaved: (updated: ShiftRow) => void
}) {
    const [clockIn, setClockIn] = useState(toDatetimeLocal(shift.clock_in))
    const [clockOut, setClockOut] = useState(shift.clock_out ? toDatetimeLocal(shift.clock_out) : '')
    const [breakMins, setBreakMins] = useState(String(shift.break_minutes || 0))
    const [notes, setNotes] = useState(shift.notes || '')
    const [saving, setSaving] = useState(false)

    async function handleSave() {
        setSaving(true)
        const result = await correctShiftAction(shift.id, {
            clock_in: new Date(clockIn).toISOString(),
            clock_out: clockOut ? new Date(clockOut).toISOString() : undefined,
            break_minutes: parseInt(breakMins) || 0,
            notes: notes || undefined,
        })
        setSaving(false)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('Shift corrected — pending re-approval')
            const totalMins = clockOut
                ? (new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 60000
                : 0
            const hoursWorked = clockOut
                ? Math.max(0, Math.round((totalMins - (parseInt(breakMins) || 0)) / 60 * 100) / 100)
                : null
            onSaved({
                ...shift,
                clock_in: new Date(clockIn).toISOString(),
                clock_out: clockOut ? new Date(clockOut).toISOString() : null,
                break_minutes: parseInt(breakMins) || 0,
                notes: notes || null,
                hours_worked: hoursWorked,
                is_approved: false,
            })
            onClose()
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <Pencil size={16} className="text-blue-500" /> Correct Shift — {getStaffName(shift)}
                    </h2>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={16} /></button>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Clock In</label>
                        <input type="datetime-local" value={clockIn} onChange={e => setClockIn(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Clock Out <span className="text-gray-400">(leave blank if still active)</span></label>
                        <input type="datetime-local" value={clockOut} onChange={e => setClockOut(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Break (minutes)</label>
                        <input type="number" min="0" value={breakMins} onChange={e => setBreakMins(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Notes <span className="text-gray-400">(optional)</span></label>
                        <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                            placeholder="e.g. missed punch, system error…"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                </div>

                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Corrected shifts are reset to <strong>Pending</strong> and must be re-approved.
                </p>

                <div className="flex gap-2 justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-gray-200 hover:bg-gray-50 transition" disabled={saving}>Cancel</button>
                    <button onClick={handleSave} disabled={saving || !clockIn}
                        className="px-4 py-2 text-sm rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-1.5">
                        {saving && <Loader2 size={14} className="animate-spin" />}
                        Save Correction
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function ShiftsManager({ activeShifts, recentShifts }: {
    activeShifts: ShiftRow[]
    recentShifts: ShiftRow[]
}) {
    const [active, setActive] = useState(activeShifts)
    const [recent, setRecent] = useState(recentShifts)
    const [correcting, setCorrecting] = useState<ShiftRow | null>(null)

    async function handleForceClockOut(shift: ShiftRow) {
        if (!confirm(`Force clock-out ${getStaffName(shift)}?`)) return
        const result = await forceClockOutAction(shift.id)
        if (result.error) { toast.error(result.error); return }
        setActive(prev => prev.filter(s => s.id !== shift.id))
        toast.success('Clocked out')
    }

    async function handleApprove(shift: ShiftRow) {
        const result = await approveShiftAction(shift.id, shift.user_id)
        if (result.error) { toast.error(result.error); return }
        setRecent(prev => prev.map(s => s.id === shift.id ? { ...s, is_approved: true } : s))
        toast.success('Shift approved')
    }

    return (
        <div className="space-y-6">
            {correcting && (
                <CorrectionModal
                    shift={correcting}
                    onClose={() => setCorrecting(null)}
                    onSaved={(updated) => {
                        setRecent(prev => prev.map(s => s.id === updated.id ? updated : s))
                        setActive(prev => prev.map(s => s.id === updated.id ? updated : s))
                    }}
                />
            )}

            {/* Active Shifts */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                    <Clock size={18} className="text-green-600" />
                    <h2 className="font-semibold text-gray-900">Currently Clocked In ({active.length})</h2>
                </div>
                {active.length === 0 ? (
                    <div className="px-6 py-8 text-center text-gray-400">No staff currently clocked in.</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600">
                            <tr>
                                <th className="text-left px-4 py-3 font-medium">Staff</th>
                                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Role</th>
                                <th className="text-left px-4 py-3 font-medium">Clocked In</th>
                                <th className="text-right px-4 py-3 font-medium">Duration</th>
                                <th className="text-right px-4 py-3 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {active.map(s => (
                                <tr key={s.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 flex items-center gap-2">
                                        <User size={14} className="text-gray-400" />
                                        <span className="font-medium text-gray-900">{getStaffName(s)}</span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 capitalize hidden md:table-cell">{getStaffRole(s)}</td>
                                    <td className="px-4 py-3 text-gray-600">{new Date(s.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                    <td className="px-4 py-3 text-right font-mono text-gray-700">{duration(s.clock_in)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center gap-2 justify-end">
                                            <button onClick={() => setCorrecting(s)}
                                                className="text-blue-500 hover:text-blue-700 text-xs flex items-center gap-1">
                                                <Pencil size={13} /> Correct
                                            </button>
                                            <button onClick={() => handleForceClockOut(s)}
                                                className="text-red-600 hover:text-red-800 text-xs flex items-center gap-1">
                                                <LogOut size={14} /> Force Out
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Recent Shifts */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900">Recent Shifts</h2>
                </div>
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                        <tr>
                            <th className="text-left px-4 py-3 font-medium">Staff</th>
                            <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Role</th>
                            <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Date</th>
                            <th className="text-left px-4 py-3 font-medium">In/Out</th>
                            <th className="text-right px-4 py-3 font-medium">Hours</th>
                            <th className="text-center px-4 py-3 font-medium">Status</th>
                            <th className="text-right px-4 py-3 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {recent.map(s => (
                            <tr key={s.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-900">{getStaffName(s)}</td>
                                <td className="px-4 py-3 text-gray-500 capitalize hidden md:table-cell">{getStaffRole(s)}</td>
                                <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{new Date(s.clock_in).toLocaleDateString()}</td>
                                <td className="px-4 py-3 text-gray-600 text-xs">
                                    {new Date(s.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {' → '}
                                    {s.clock_out ? new Date(s.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-gray-700">
                                    {s.hours_worked != null ? `${s.hours_worked.toFixed(1)}h` : '—'}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {s.is_approved ? (
                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">Approved</span>
                                    ) : (
                                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium">Pending</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center gap-2 justify-end">
                                        <button onClick={() => setCorrecting(s)}
                                            className="text-blue-500 hover:text-blue-700 text-xs flex items-center gap-1">
                                            <Pencil size={13} /> Correct
                                        </button>
                                        {!s.is_approved && (
                                            <button onClick={() => handleApprove(s)}
                                                className="text-green-600 hover:text-green-800 text-xs flex items-center gap-1">
                                                <CheckCircle size={14} /> Approve
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {recent.length === 0 && (
                            <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No completed shifts yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
