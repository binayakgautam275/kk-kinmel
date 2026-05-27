import { requireRole } from '@/lib/auth'
import { getAllTablesAcrossRestaurants } from '../actions'
import { Grid3X3, Wifi } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function TablesPage() {
    await requireRole('super_admin')

    const result = await getAllTablesAcrossRestaurants()
    const tables = (result.data || []) as Array<{
        id: string
        label: string
        capacity: number | null
        qr_token: string
        is_active: boolean
        restaurant_id: string
        hasActiveSession: boolean
        restaurants: { name: string } | null
    }>

    const activeSessions = tables.filter(t => t.hasActiveSession).length

    // Group by restaurant
    const grouped: Record<string, typeof tables> = {}
    for (const t of tables) {
        const key = t.restaurants?.name || t.restaurant_id
        if (!grouped[key]) grouped[key] = []
        grouped[key].push(t)
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Tables & QR Codes</h1>
                <p className="text-gray-500 mt-1 text-sm">All tables across every restaurant tenant with active session status.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <div className="text-2xl font-bold text-gray-900">{tables.length}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Total Tables</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <div className="text-2xl font-bold text-emerald-600">{activeSessions}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Active Sessions</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <div className="text-2xl font-bold text-gray-900">{Object.keys(grouped).length}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Restaurants</div>
                </div>
            </div>

            {Object.entries(grouped).map(([restaurantName, restaurantTables]) => (
                <div key={restaurantName} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                        <h2 className="font-semibold text-gray-800">{restaurantName}</h2>
                        <span className="text-xs text-gray-500">{restaurantTables.length} tables · {restaurantTables.filter(t => t.hasActiveSession).length} active</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold border-b border-gray-100">
                                <tr>
                                    <th className="px-5 py-3 text-left">Table</th>
                                    <th className="px-5 py-3 text-left">Capacity</th>
                                    <th className="px-5 py-3 text-left">QR Token</th>
                                    <th className="px-5 py-3 text-center">Session</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {restaurantTables.map(t => (
                                    <tr key={t.id} className={`hover:bg-gray-50/50 ${t.hasActiveSession ? 'bg-emerald-50/30' : ''}`}>
                                        <td className="px-5 py-3 font-semibold text-gray-900">{t.label}</td>
                                        <td className="px-5 py-3 text-gray-600">{t.capacity ? `${t.capacity} seats` : '—'}</td>
                                        <td className="px-5 py-3 font-mono text-xs text-gray-400">{t.qr_token.slice(0, 20)}…</td>
                                        <td className="px-5 py-3 text-center">
                                            {t.hasActiveSession
                                                ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><Wifi size={11} />Active</span>
                                                : <span className="text-xs text-gray-400">—</span>
                                            }
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}

            {tables.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                    <Grid3X3 size={36} className="mx-auto mb-3 opacity-40" />
                    <p>No tables configured yet</p>
                </div>
            )}
        </div>
    )
}
