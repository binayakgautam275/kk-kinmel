'use client'

import { useState } from 'react'
import { createPromoCodeAction, updatePromoCodeAction, deletePromoCodeAction } from './actions'
import type { PromoCode } from '@/types/database'
import { Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'

const PROMO_TYPES = [
    { value: 'percentage_off', label: '% Off' },
    { value: 'amount_off', label: '$ Off' },
    { value: 'bogo', label: 'BOGO' },
    { value: 'free_item', label: 'Free Item' },
]

export default function PromoCodesManager({ initialPromos, restaurantId }: {
    initialPromos: PromoCode[]
    restaurantId: string
}) {
    const [promos, setPromos] = useState(initialPromos)
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({
        code: '', promo_type: 'percentage_off', value: '10',
        min_order_amount: '', max_discount_amount: '', max_uses: '', valid_until: '',
    })
    const [saving, setSaving] = useState(false)

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault()
        setSaving(true)
        const result = await createPromoCodeAction({
            restaurant_id: restaurantId,
            code: form.code,
            promo_type: form.promo_type,
            value: parseFloat(form.value) || 0,
            min_order_amount: form.min_order_amount ? parseFloat(form.min_order_amount) : undefined,
            max_discount_amount: form.max_discount_amount ? parseFloat(form.max_discount_amount) : undefined,
            max_uses: form.max_uses ? parseInt(form.max_uses) : undefined,
            valid_until: form.valid_until || undefined,
            is_active: true,
        })
        setSaving(false)
        if (result.error) { toast.error(result.error); return }
        setPromos([result.data, ...promos])
        setShowForm(false)
        setForm({ code: '', promo_type: 'percentage_off', value: '10', min_order_amount: '', max_discount_amount: '', max_uses: '', valid_until: '' })
        toast.success('Promo code created!')
    }

    async function toggleActive(promo: PromoCode) {
        const result = await updatePromoCodeAction(promo.id, { is_active: !promo.is_active })
        if (result.error) { toast.error(result.error); return }
        setPromos(promos.map(p => p.id === promo.id ? { ...p, is_active: !p.is_active } : p))
    }

    async function handleDelete(id: string) {
        if (!confirm('Delete this promo code?')) return
        const result = await deletePromoCodeAction(id)
        if (result.error) { toast.error(result.error); return }
        setPromos(promos.filter(p => p.id !== id))
        toast.success('Deleted')
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800">
                    <Plus size={16} /> New Promo Code
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                            <input type="text" required value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="e.g. WELCOME20" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select value={form.promo_type} onChange={e => setForm({ ...form, promo_type: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                                {PROMO_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Value {form.promo_type === 'percentage_off' ? '(%)' : '($)'}
                            </label>
                            <input type="text" inputMode="decimal" required value={form.value}
                                onChange={e => { const v = e.target.value; if (/^\d*\.?\d*$/.test(v)) setForm({ ...form, value: v }) }}
                                placeholder={form.promo_type === 'percentage_off' ? 'e.g. 10' : 'e.g. 5'}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Min Order ($)</label>
                            <input type="text" inputMode="decimal" value={form.min_order_amount}
                                onChange={e => { const v = e.target.value; if (/^\d*\.?\d*$/.test(v)) setForm({ ...form, min_order_amount: v }) }}
                                placeholder="e.g. 500"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Max Discount ($)</label>
                            <input type="text" inputMode="decimal" value={form.max_discount_amount}
                                onChange={e => { const v = e.target.value; if (/^\d*\.?\d*$/.test(v)) setForm({ ...form, max_discount_amount: v }) }}
                                placeholder="e.g. 200"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses (0 = unlimited)</label>
                            <input type="text" inputMode="numeric" value={form.max_uses}
                                onChange={e => { const v = e.target.value; if (/^\d*$/.test(v)) setForm({ ...form, max_uses: v }) }}
                                placeholder="Leave empty for unlimited"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                            <input type="datetime-local" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                        </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button type="submit" disabled={saving} className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg disabled:opacity-50">
                            {saving ? 'Creating...' : 'Create Code'}
                        </button>
                    </div>
                </form>
            )}

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                        <tr>
                            <th className="text-left px-4 py-3 font-medium">Code</th>
                            <th className="text-left px-4 py-3 font-medium">Type</th>
                            <th className="text-left px-4 py-3 font-medium">Value</th>
                            <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Uses</th>
                            <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Expires</th>
                            <th className="text-left px-4 py-3 font-medium">Status</th>
                            <th className="text-right px-4 py-3 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {promos.map(promo => (
                            <tr key={promo.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-mono font-semibold text-gray-900">{promo.code}</td>
                                <td className="px-4 py-3 capitalize text-gray-600">{promo.promo_type.replace('_', ' ')}</td>
                                <td className="px-4 py-3 text-gray-700">{promo.promo_type === 'percentage_off' ? `${promo.value}%` : `$${promo.value}`}</td>
                                <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{promo.current_uses}/{promo.max_uses || '∞'}</td>
                                <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{promo.valid_until ? new Date(promo.valid_until).toLocaleDateString() : '—'}</td>
                                <td className="px-4 py-3">
                                    <button onClick={() => toggleActive(promo)} className="text-gray-500 hover:text-gray-900">
                                        {promo.is_active ? <ToggleRight size={22} className="text-green-500" /> : <ToggleLeft size={22} />}
                                    </button>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button onClick={() => handleDelete(promo.id)} className="text-gray-400 hover:text-red-500 p-1">
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {promos.length === 0 && (
                            <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No promo codes yet. Create your first one!</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
