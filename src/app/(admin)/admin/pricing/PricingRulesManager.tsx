'use client'

import { useState } from 'react'
import { createPricingRuleAction, updatePricingRuleAction, deletePricingRuleAction } from './actions'
import { Plus, Trash2, Power, Pencil, CalendarClock, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCurrency } from '@/lib/contexts/FeatureContext'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const RULE_TYPES = [
    { value: 'percentage_off', label: '% Off' },
    { value: 'fixed_price', label: 'Fixed Price' },
    { value: 'amount_off', label: 'Amount Off' },
]
type TargetType = 'all' | 'category' | 'item'

interface Rule {
    id: string
    name: string
    description: string | null
    rule_type: string
    value: number
    applies_to_item_id: string | null
    applies_to_category_id: string | null
    applies_to_all: boolean
    days_of_week: number[]
    start_time: string
    end_time: string
    valid_from: string | null
    valid_until: string | null
    is_active: boolean
    priority: number
    menu_items?: { name: string } | null
}

const EMPTY_FORM = {
    name: '',
    description: '',
    rule_type: 'percentage_off',
    value: '10',
    target_type: 'all' as TargetType,
    applies_to_item_id: '' as string,
    applies_to_category_id: '' as string,
    days_of_week: [] as number[],
    start_time: '11:00',
    end_time: '14:00',
    valid_from: '',
    valid_until: '',
    priority: '0',
}
type FormState = typeof EMPTY_FORM

const today = () => new Date().toISOString().slice(0, 10)

function ruleStatus(r: Rule): { label: string; cls: string } {
    if (!r.is_active) return { label: 'Inactive', cls: 'bg-gray-100 text-gray-500' }
    const d = today()
    if (r.valid_from && d < r.valid_from) return { label: 'Scheduled', cls: 'bg-blue-50 text-blue-700' }
    if (r.valid_until && d > r.valid_until) return { label: 'Expired', cls: 'bg-amber-50 text-amber-700' }
    return { label: 'Active', cls: 'bg-green-50 text-green-700' }
}

const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

function dateRangeLabel(from: string | null, until: string | null): string {
    if (from && until) return `${fmtDate(from)} – ${fmtDate(until)}`
    if (from) return `From ${fmtDate(from)}`
    if (until) return `Until ${fmtDate(until)}`
    return 'Always'
}

export default function PricingRulesManager({ initialRules, menuItems, categories, restaurantId }: {
    initialRules: Rule[]
    menuItems: { id: string; name: string }[]
    categories: { id: string; name: string }[]
    restaurantId: string
}) {
    const [rules, setRules] = useState<Rule[]>(initialRules)
    const money = useCurrency()
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [form, setForm] = useState<FormState>(EMPTY_FORM)
    const [saving, setSaving] = useState(false)

    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')

    const filteredRules = rules.filter(r => {
        const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesStatus = statusFilter === 'all' || 
                              (statusFilter === 'active' ? r.is_active : !r.is_active)
        return matchesSearch && matchesStatus
    })

    const categoryName = (id: string | null) => categories.find(c => c.id === id)?.name

    function appliesToLabel(r: Rule): string {
        if (r.applies_to_all) return 'All items'
        if (r.applies_to_category_id) return `Category: ${categoryName(r.applies_to_category_id) || '—'}`
        return r.menu_items?.name || '—'
    }

    function valueLabel(r: Rule): string {
        return r.rule_type === 'percentage_off' ? `${r.value}% off` : money(r.value)
    }

    function toggleDay(d: number) {
        setForm(prev => ({
            ...prev,
            days_of_week: prev.days_of_week.includes(d)
                ? prev.days_of_week.filter(x => x !== d)
                : [...prev.days_of_week, d].sort(),
        }))
    }

    function openCreate() {
        setEditingId(null)
        setForm(EMPTY_FORM)
        setShowForm(true)
    }

    function openEdit(r: Rule) {
        setEditingId(r.id)
        setForm({
            name: r.name,
            description: r.description || '',
            rule_type: r.rule_type,
            value: String(r.value),
            target_type: r.applies_to_all ? 'all' : r.applies_to_category_id ? 'category' : 'item',
            applies_to_item_id: r.applies_to_item_id || '',
            applies_to_category_id: r.applies_to_category_id || '',
            days_of_week: r.days_of_week || [],
            start_time: r.start_time?.slice(0, 5) || '11:00',
            end_time: r.end_time?.slice(0, 5) || '14:00',
            valid_from: r.valid_from || '',
            valid_until: r.valid_until || '',
            priority: String(r.priority ?? 0),
        })
        setShowForm(true)
    }

    function closeForm() {
        setShowForm(false)
        setEditingId(null)
        setForm(EMPTY_FORM)
    }

    /** Shared validation + payload assembly for create and edit. */
    function buildPayload(): {
        name: string; description: string | null; rule_type: string; value: number
        applies_to_all: boolean; applies_to_item_id: string | null; applies_to_category_id: string | null
        days_of_week: number[]; start_time: string; end_time: string
        valid_from: string | null; valid_until: string | null; priority: number
    } | null {
        if (!form.name.trim()) { toast.error('Rule name is required'); return null }
        const value = parseFloat(form.value)
        if (Number.isNaN(value) || value < 0) { toast.error('Enter a valid value'); return null }
        if (form.rule_type === 'percentage_off' && value > 100) { toast.error('Percentage cannot exceed 100'); return null }
        if (form.target_type === 'item' && !form.applies_to_item_id) { toast.error('Select a menu item'); return null }
        if (form.target_type === 'category' && !form.applies_to_category_id) { toast.error('Select a category'); return null }
        if (form.end_time <= form.start_time) { toast.error('End time must be after start time'); return null }
        if (form.valid_from && form.valid_until && form.valid_until < form.valid_from) {
            toast.error('“Valid until” must be on or after “valid from”'); return null
        }
        return {
            name: form.name.trim(),
            description: form.description.trim() || null,
            rule_type: form.rule_type,
            value,
            applies_to_all: form.target_type === 'all',
            applies_to_item_id: form.target_type === 'item' ? form.applies_to_item_id : null,
            applies_to_category_id: form.target_type === 'category' ? form.applies_to_category_id : null,
            days_of_week: form.days_of_week,
            start_time: form.start_time,
            end_time: form.end_time,
            valid_from: form.valid_from || null,
            valid_until: form.valid_until || null,
            priority: parseInt(form.priority) || 0,
        }
    }

    async function handleSave() {
        const payload = buildPayload()
        if (!payload) return
        setSaving(true)
        if (editingId) {
            const result = await updatePricingRuleAction(editingId, payload)
            setSaving(false)
            if (result.error) { toast.error(result.error); return }
            setRules(prev => prev.map(r => r.id === editingId
                ? { ...r, ...payload, menu_items: payload.applies_to_item_id ? { name: menuItems.find(i => i.id === payload.applies_to_item_id)?.name || '' } : null }
                : r))
            toast.success('Rule updated')
        } else {
            const result = await createPricingRuleAction({ restaurant_id: restaurantId, ...payload })
            setSaving(false)
            if (result.error) { toast.error(result.error); return }
            if (result.data) {
                const created: Rule = {
                    ...(result.data as Rule),
                    menu_items: payload.applies_to_item_id ? { name: menuItems.find(i => i.id === payload.applies_to_item_id)?.name || '' } : null,
                }
                setRules(prev => [created, ...prev])
            }
            toast.success('Rule created')
        }
        closeForm()
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

    const valueHint = form.rule_type === 'percentage_off' ? '% off the base price'
        : form.rule_type === 'fixed_price' ? 'new price (Rs.)' : 'amount off (Rs.)'

    return (
        <div className="space-y-4">
            {/* Create / Edit Form */}
            {showForm ? (
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                    <h3 className="font-semibold text-gray-900">{editingId ? 'Edit Pricing Rule' : 'New Pricing Rule'}</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2">
                            <label className="block text-sm font-medium text-gray-600 mb-1">Rule Name</label>
                            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                placeholder="e.g. Happy Hour 20% Off"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Priority</label>
                            <input type="number" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
                            <p className="text-[11px] text-gray-400 mt-1">Higher wins when rules overlap.</p>
                        </div>

                        <div className="lg:col-span-3">
                            <label className="block text-sm font-medium text-gray-600 mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                            <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                                placeholder="Internal note about this rule"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Type</label>
                            <select value={form.rule_type} onChange={e => setForm({ ...form, rule_type: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10">
                                {RULE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Value</label>
                            <input type="text" inputMode="decimal" value={form.value}
                                onChange={e => { const v = e.target.value; if (/^\d*\.?\d*$/.test(v)) setForm({ ...form, value: v }) }}
                                placeholder="e.g. 10"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
                            <p className="text-[11px] text-gray-400 mt-1">{valueHint}</p>
                        </div>

                        {/* Target */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Applies To</label>
                            <select value={form.target_type} onChange={e => setForm({ ...form, target_type: e.target.value as TargetType })}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10">
                                <option value="all">All items</option>
                                <option value="category">A category</option>
                                <option value="item">A specific item</option>
                            </select>
                        </div>
                        {form.target_type === 'category' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Category</label>
                                <select value={form.applies_to_category_id} onChange={e => setForm({ ...form, applies_to_category_id: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10">
                                    <option value="">Select category…</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        )}
                        {form.target_type === 'item' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Menu Item</label>
                                <select value={form.applies_to_item_id} onChange={e => setForm({ ...form, applies_to_item_id: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10">
                                    <option value="">Select item…</option>
                                    {menuItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Schedule: date range + time window */}
                    <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-4 space-y-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <CalendarClock size={16} className="text-gray-500" /> Schedule
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Valid From <span className="text-gray-400 font-normal">(optional)</span></label>
                                <input type="date" value={form.valid_from} max={form.valid_until || undefined}
                                    onChange={e => setForm({ ...form, valid_from: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Valid Until <span className="text-gray-400 font-normal">(optional)</span></label>
                                <input type="date" value={form.valid_until} min={form.valid_from || undefined}
                                    onChange={e => setForm({ ...form, valid_until: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Start Time</label>
                                <input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">End Time</label>
                                <input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">Active Days <span className="text-gray-400 font-normal">(none = every day)</span></label>
                            <div className="flex flex-wrap gap-2">
                                {DAYS.map((label, i) => (
                                    <button key={i} type="button" onClick={() => toggleDay(i)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${form.days_of_week.includes(i) ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                        <button onClick={closeForm} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
                        <button onClick={handleSave} disabled={saving}
                            className="bg-gray-900 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                            {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Rule'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-xl border border-gray-200">
                    <div className="flex flex-1 gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:max-w-xs">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search pricing rules..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 w-32"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                    <button onClick={openCreate}
                        className="flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-medium w-full sm:w-auto shrink-0 shadow-sm transition hover:bg-primary/90">
                        <Plus size={16} /> Add Rule
                    </button>
                </div>
            )}

            {/* Rules Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                        <tr>
                            <th className="text-left px-4 py-3 font-medium">Name</th>
                            <th className="text-right px-4 py-3 font-medium">Adjustment</th>
                            <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Applies To</th>
                            <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Date Range</th>
                            <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">When</th>
                            <th className="text-center px-4 py-3 font-medium hidden sm:table-cell">Prio</th>
                            <th className="text-center px-4 py-3 font-medium">Status</th>
                            <th className="text-right px-4 py-3 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredRules.map(r => {
                            const status = ruleStatus(r)
                            return (
                                <tr key={r.id} className="hover:bg-gray-50 align-top">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-gray-900">{r.name}</div>
                                        {r.description && <div className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">{r.description}</div>}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-gray-700 whitespace-nowrap">{valueLabel(r)}</td>
                                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{appliesToLabel(r)}</td>
                                    <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell whitespace-nowrap">{dateRangeLabel(r.valid_from, r.valid_until)}</td>
                                    <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell whitespace-nowrap">
                                        {(r.days_of_week?.length ? r.days_of_week.map(d => DAYS[d]).join(', ') : 'All days')}
                                        <br />{r.start_time?.slice(0, 5)}–{r.end_time?.slice(0, 5)}
                                    </td>
                                    <td className="px-4 py-3 text-center text-gray-500 hidden sm:table-cell">{r.priority}</td>
                                    <td className="px-4 py-3 text-center">
                                        <button onClick={() => toggleActive(r)} className="inline-flex items-center gap-1.5" title="Toggle active">
                                            <Power size={14} className={r.is_active ? 'text-green-600' : 'text-gray-400'} />
                                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${status.cls}`}>{status.label}</span>
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-right whitespace-nowrap">
                                        <button onClick={() => openEdit(r)} className="text-gray-400 hover:text-gray-700 mr-3" title="Edit">
                                            <Pencil size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(r.id)} className="text-red-500 hover:text-red-700" title="Delete">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                        {filteredRules.length === 0 && (
                            <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No pricing rules found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
