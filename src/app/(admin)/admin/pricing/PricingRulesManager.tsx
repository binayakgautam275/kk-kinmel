'use client'

import { useState } from 'react'
import { createPricingRuleAction, updatePricingRuleAction, deletePricingRuleAction } from './actions'
import { Plus, Trash2, Power } from 'lucide-react'
import toast from 'react-hot-toast'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const RULE_TYPES = [
    { value: 'percentage_off', label: '% Off' },
    { value: 'fixed_price', label: 'Fixed Price' },
    { value: 'amount_off', label: '$ Off' },
]

interface Rule {
    id: string
    name: string
    rule_type: string
    value: number
    applies_to_item_id: string | null
    applies_to_all: boolean
    days_of_week: number[]
    start_time: string
    end_time: string
    is_active: boolean
    priority: number
    menu_items?: { name: string } | null
}

export default function PricingRulesManager({ initialRules, menuItems, restaurantId }: {
    initialRules: Rule[]
    menuItems: { id: string; name: string }[]
    restaurantId: string
}) {
    const [rules, setRules] = useState<Rule[]>(initialRules)
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({
        name: '',
        rule_type: 'percentage_off',
        value: '10',
        applies_to_item_id: '' as string | null,
        applies_to_all: false,
        days_of_week: [] as number[],
        start_time: '11:00',
        end_time: '14:00',
        priority: '0',
    })
    const [saving, setSaving] = useState(false)

    function toggleDay(d: number) {
        setForm(prev => ({
            ...prev,
            days_of_week: prev.days_of_week.includes(d)
                ? prev.days_of_week.filter(x => x !== d)
                : [...prev.days_of_week, d].sort(),
        }))
    }

    async function handleCreate() {
        if (!form.name.trim()) { toast.error('Name required'); return }
        setSaving(true)
        const result = await createPricingRuleAction({
            restaurant_id: restaurantId,
            name: form.name,
            rule_type: form.rule_type,
            value: parseFloat(form.value) || 0,
            applies_to_item_id: form.applies_to_item_id || null,
            applies_to_all: form.applies_to_all,
            days_of_week: form.days_of_week,
            start_time: form.start_time,
            end_time: form.end_time,
            priority: parseInt(form.priority) || 0,
        })
        setSaving(false)
        if (result.error) { toast.error(result.error); return }
        if (result.data) {
            setRules(prev => [result.data, ...prev])
        }
        toast.success('Rule created!')
        setShowForm(false)
        setForm({ name: '', rule_type: 'percentage_off', value: '10', applies_to_item_id: '', applies_to_all: false, days_of_week: [], start_time: '11:00', end_time: '14:00', priority: '0' })
    }

    async function toggleActive(rule: Rule) {
        const result = await updatePricingRuleAction(rule.id, { is_active: !rule.is_active })
        if (result.error) { toast.error(result.error); return }
        setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_active: !r.is_active } : r))
    }

    async function handleDelete(id: string) {
        if (!confirm('Delete this pricing rule?')) return
        const result = await deletePricingRuleAction(id)
        if (result.error) { toast.error(result.error); return }
        setRules(prev => prev.filter(r => r.id !== id))
        toast.success('Deleted')
    }

    return (
        <div className="space-y-4">
            {/* Create Form */}
            {showForm ? (
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                    <h3 className="font-semibold text-gray-900">New Pricing Rule</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Rule Name</label>
                            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                placeholder="e.g. Happy Hour 20% Off"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Type</label>
                            <select value={form.rule_type} onChange={e => setForm({ ...form, rule_type: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                                {RULE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Value</label>
                            <input type="text" inputMode="decimal" value={form.value}
                                onChange={e => { const v = e.target.value; if (/^\d*\.?\d*$/.test(v)) setForm({ ...form, value: v }) }}
                                placeholder="e.g. 10"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Menu Item (optional)</label>
                            <select value={form.applies_to_item_id || ''} onChange={e => setForm({ ...form, applies_to_item_id: e.target.value || null, applies_to_all: !e.target.value })}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                                <option value="">All items</option>
                                {menuItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Start Time</label>
                            <input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">End Time</label>
                            <input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">Active Days</label>
                        <div className="flex flex-wrap gap-2">
                            {DAYS.map((label, i) => (
                                <button key={i} type="button" onClick={() => toggleDay(i)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${form.days_of_week.includes(i) ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                        <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
                        <button onClick={handleCreate} disabled={saving}
                            className="bg-gray-900 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                            {saving ? 'Creating...' : 'Create Rule'}
                        </button>
                    </div>
                </div>
            ) : (
                <button onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium">
                    <Plus size={16} /> Add Rule
                </button>
            )}

            {/* Rules Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                        <tr>
                            <th className="text-left px-4 py-3 font-medium">Name</th>
                            <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Type</th>
                            <th className="text-right px-4 py-3 font-medium">Value</th>
                            <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Applies To</th>
                            <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Schedule</th>
                            <th className="text-center px-4 py-3 font-medium">Status</th>
                            <th className="text-right px-4 py-3 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {rules.map(r => (
                            <tr key={r.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                                <td className="px-4 py-3 text-gray-500 capitalize hidden md:table-cell">{r.rule_type.replace('_', ' ')}</td>
                                <td className="px-4 py-3 text-right font-mono text-gray-700">
                                    {r.rule_type === 'percentage_off' ? `${r.value}%` : `$${r.value.toFixed(2)}`}
                                </td>
                                <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                                    {r.applies_to_all ? 'All items' : r.menu_items?.name || '—'}
                                </td>
                                <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">
                                    {r.days_of_week?.map(d => DAYS[d]).join(', ') || 'All days'} {r.start_time}–{r.end_time}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <button onClick={() => toggleActive(r)} title={r.is_active ? 'Active' : 'Inactive'}>
                                        <Power size={16} className={r.is_active ? 'text-green-600' : 'text-gray-400'} />
                                    </button>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button onClick={() => handleDelete(r.id)} className="text-red-500 hover:text-red-700">
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {rules.length === 0 && (
                            <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No pricing rules yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
