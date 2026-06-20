'use client'

import { useState } from 'react'
import { createIngredientAction, addStockMovementAction, deleteIngredientAction } from './actions'
import { Plus, Trash2, AlertTriangle, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Ingredient } from '@/types/database'

export default function IngredientsManager({ initialIngredients, restaurantId }: {
    initialIngredients: Ingredient[]
    restaurantId: string
}) {
    const [ingredients, setIngredients] = useState(initialIngredients)
    const [showAdd, setShowAdd] = useState(false)
    const [stockModal, setStockModal] = useState<Ingredient | null>(null)
    const [form, setForm] = useState({
        name: '', unit: 'kg', stock_quantity: '', reorder_level: '10', cost_per_unit: '', supplier: '',
    })
    const [moveForm, setMoveForm] = useState({ movement_type: 'purchase', quantity: '', notes: '' })
    const [saving, setSaving] = useState(false)

    async function handleCreate() {
        if (!form.name.trim()) { toast.error('Name required'); return }
        setSaving(true)
        const result = await createIngredientAction({
            restaurant_id: restaurantId,
            name: form.name,
            unit: form.unit,
            stock_quantity: parseFloat(form.stock_quantity) || 0,
            reorder_level: parseFloat(form.reorder_level) || 0,
            cost_per_unit: parseFloat(form.cost_per_unit) || 0,
            supplier: form.supplier || null,
        })
        setSaving(false)
        if (result.error) { toast.error(result.error); return }
        if (result.data) setIngredients(prev => [...prev, result.data].sort((a, b) => a.name.localeCompare(b.name)))
        toast.success('Ingredient added!')
        setShowAdd(false)
        setForm({ name: '', unit: 'kg', stock_quantity: '', reorder_level: '10', cost_per_unit: '', supplier: '' })
    }

    async function handleStockMove() {
        if (!stockModal || !parseFloat(moveForm.quantity)) { toast.error('Enter a valid quantity'); return }
        setSaving(true)
        const result = await addStockMovementAction({
            ingredient_id: stockModal.id,
            movement_type: moveForm.movement_type,
            quantity: parseFloat(moveForm.quantity) || 0,
            notes: moveForm.notes || undefined,
        })
        setSaving(false)
        if (result.error) { toast.error(result.error); return }
        // Update local state
        const delta = moveForm.movement_type === 'purchase' ? (parseFloat(moveForm.quantity) || 0) : -(parseFloat(moveForm.quantity) || 0)
        setIngredients(prev => prev.map(i =>
            i.id === stockModal.id ? { ...i, stock_quantity: Math.max(0, i.stock_quantity + delta) } : i
        ))
        toast.success('Stock updated!')
        setStockModal(null)
        setMoveForm({ movement_type: 'purchase', quantity: '', notes: '' })
    }

    async function handleDelete(id: string) {
        if (!confirm('Delete this ingredient?')) return
        const result = await deleteIngredientAction(id)
        if (result.error) { toast.error(result.error); return }
        setIngredients(prev => prev.filter(i => i.id !== id))
        toast.success('Deleted')
    }

    const lowStock = ingredients.filter(i => i.reorder_level !== null && i.stock_quantity <= (i.reorder_level ?? 0))

    return (
        <div className="space-y-4">
            {/* Low Stock Alert */}
            {lowStock.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle size={20} className="text-amber-600 mt-0.5" />
                    <div>
                        <p className="font-medium text-amber-900">Low Stock Alert</p>
                        <p className="text-sm text-amber-700 mt-1">
                            {lowStock.map(i => i.name).join(', ')} {lowStock.length === 1 ? 'is' : 'are'} at or below reorder level.
                        </p>
                    </div>
                </div>
            )}

            {/* Add Button / Form */}
            {showAdd ? (
                <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                    <h3 className="font-semibold text-gray-900">New Ingredient</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Name</label>
                            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Unit</label>
                            <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                                {['kg', 'g', 'L', 'mL', 'pcs', 'lbs', 'oz', 'cups', 'tbsp', 'tsp'].map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Initial Stock</label>
                            <input type="text" inputMode="decimal" value={form.stock_quantity}
                                onChange={e => { const v = e.target.value; if (/^\d*\.?\d*$/.test(v)) setForm({ ...form, stock_quantity: v }) }}
                                placeholder="e.g. 50"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Reorder Level</label>
                            <input type="text" inputMode="decimal" value={form.reorder_level}
                                onChange={e => { const v = e.target.value; if (/^\d*\.?\d*$/.test(v)) setForm({ ...form, reorder_level: v }) }}
                                placeholder="e.g. 10"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Cost per Unit ($)</label>
                            <input type="text" inputMode="decimal" value={form.cost_per_unit}
                                onChange={e => { const v = e.target.value; if (/^\d*\.?\d*$/.test(v)) setForm({ ...form, cost_per_unit: v }) }}
                                placeholder="e.g. 2.50"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Supplier</label>
                            <input type="text" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                        </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
                        <button onClick={handleCreate} disabled={saving}
                            className="bg-gray-900 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                            {saving ? 'Adding...' : 'Add Ingredient'}
                        </button>
                    </div>
                </div>
            ) : (
                <button onClick={() => setShowAdd(true)}
                    className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium">
                    <Plus size={16} /> Add Ingredient
                </button>
            )}

            {/* Stock Movement Modal */}
            {stockModal && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
                        <h3 className="font-semibold text-gray-900">Stock Movement — {stockModal.name}</h3>
                        <p className="text-sm text-gray-500">Current: {stockModal.stock_quantity} {stockModal.unit}</p>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Type</label>
                                <select value={moveForm.movement_type} onChange={e => setMoveForm({ ...moveForm, movement_type: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                                    <option value="purchase">Purchase (add)</option>
                                    <option value="usage">Usage (subtract)</option>
                                    <option value="waste">Waste (subtract)</option>
                                    <option value="adjustment">Adjustment (subtract)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Quantity ({stockModal.unit})</label>
                                <input type="text" inputMode="decimal" value={moveForm.quantity}
                                    onChange={e => { const v = e.target.value; if (/^\d*\.?\d*$/.test(v)) setMoveForm({ ...moveForm, quantity: v }) }}
                                    placeholder="e.g. 5"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Notes</label>
                                <input type="text" value={moveForm.notes} onChange={e => setMoveForm({ ...moveForm, notes: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setStockModal(null)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
                            <button onClick={handleStockMove} disabled={saving}
                                className="bg-gray-900 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                                {saving ? 'Saving...' : 'Submit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Ingredients Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                        <tr>
                            <th className="text-left px-4 py-3 font-medium">Name</th>
                            <th className="text-right px-4 py-3 font-medium">Stock</th>
                            <th className="text-right px-4 py-3 font-medium hidden md:table-cell">Reorder</th>
                            <th className="text-right px-4 py-3 font-medium hidden md:table-cell">Cost/Unit</th>
                            <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Supplier</th>
                            <th className="text-right px-4 py-3 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {ingredients.map(ing => {
                            const isLow = ing.reorder_level !== null && ing.stock_quantity <= (ing.reorder_level ?? 0)
                            return (
                                <tr key={ing.id} className={`hover:bg-gray-50 ${isLow ? 'bg-amber-50' : ''}`}>
                                    <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-2">
                                        {isLow && <AlertTriangle size={14} className="text-amber-600" />}
                                        {ing.name}
                                    </td>
                                    <td className={`px-4 py-3 text-right font-mono ${isLow ? 'text-amber-700 font-semibold' : 'text-gray-700'}`}>
                                        {ing.stock_quantity} {ing.unit}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-500 hidden md:table-cell">{ing.reorder_level ?? '—'} {ing.unit}</td>
                                    <td className="px-4 py-3 text-right text-gray-500 hidden md:table-cell">${ing.cost_per_unit.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{ing.supplier || '—'}</td>
                                    <td className="px-4 py-3 text-right flex items-center gap-2 justify-end">
                                        <button onClick={() => { setStockModal(ing); setMoveForm({ movement_type: 'purchase', quantity: '', notes: '' }) }}
                                            className="text-gray-600 hover:text-gray-900" title="Stock Movement">
                                            <Package size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(ing.id)} className="text-red-500 hover:text-red-700" title="Delete">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                        {ingredients.length === 0 && (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No ingredients tracked yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
