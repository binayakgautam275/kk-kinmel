'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Edit2, Trash2, GripVertical, Check, X, Tag, Loader2, Image as ImageIcon, Globe, Upload, Link } from 'lucide-react'
import type { MenuCategory, MenuItem } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import {
    addCategoryAction, updateCategoryAction, deleteCategoryAction,
    addItemAction, updateItemAction, deleteItemAction
} from '@/app/(admin)/admin/menu/actions'
import { getRestaurantTranslationConfig } from '@/app/(admin)/admin/menu/translation-actions'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'react-hot-toast'
import { useConfirmStore } from '@/lib/stores/confirm'
import TranslationModal from '@/components/admin/TranslationModal'

type TranslationRow = { language_code: string; entity_type: string; entity_id: string; translated_text: string }

export default function MenuManager({
    initialCategories,
    initialItems,
    restaurantId
}: {
    initialCategories: MenuCategory[]
    initialItems: MenuItem[]
    restaurantId: string
}) {
    const [categories, setCategories] = useState<MenuCategory[]>(initialCategories)
    const [items, setItems] = useState<MenuItem[]>(initialItems)
    const [activeTab, setActiveTab] = useState<'categories' | 'items'>('items')
    const { confirm } = useConfirmStore()

    // Category Modal State
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
    const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null)
    const [categoryName, setCategoryName] = useState('')
    const [categorySort, setCategorySort] = useState(0)
    const [categoryVisible, setCategoryVisible] = useState(true)

    // Item Modal State
    const [isItemModalOpen, setIsItemModalOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
    const [itemFormData, setItemFormData] = useState<Partial<MenuItem>>({
        name: '', description: '', price: 0, is_available: true, category_id: '', image_url: ''
    })

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [imageUploading, setImageUploading] = useState(false)
    const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload')
    const imageInputRef = useRef<HTMLInputElement>(null)

    // Translation modal state
    const [translations, setTranslations] = useState<TranslationRow[]>([])
    const [hasNepali, setHasNepali] = useState(false)
    const [translateTarget, setTranslateTarget] = useState<{
        entityId: string; entityType: 'menu_item' | 'category'; name: string; description?: string | null
    } | null>(null)

    useEffect(() => {
        getRestaurantTranslationConfig().then(({ translations: t, languages: l }) => {
            setTranslations(t)
            setHasNepali(l.some(lang => lang.language_code === 'ne'))
        })
    }, [])

    // --- Category Handlers ---
    const openCategoryModal = (cat?: MenuCategory) => {
        if (cat) {
            setEditingCategory(cat)
            setCategoryName(cat.name)
            setCategorySort(cat.sort_order)
            setCategoryVisible(cat.is_visible)
        } else {
            setEditingCategory(null)
            setCategoryName('')
            setCategorySort(categories.length * 10)
            setCategoryVisible(true)
        }
        setIsCategoryModalOpen(true)
    }

    const saveCategory = async () => {
        if (!categoryName.trim()) return
        setIsSubmitting(true)

        if (editingCategory) {
            const res = await updateCategoryAction(editingCategory.id, {
                name: categoryName,
                sort_order: categorySort,
                is_visible: categoryVisible
            })
            if (res.success) {
                setCategories(categories.map(c => c.id === editingCategory.id ? { ...c, name: categoryName, sort_order: categorySort, is_visible: categoryVisible } : c))
                toast.success('Category updated')
            } else {
                toast.error(res.error || 'Failed to update category')
            }
        } else {
            const res = await addCategoryAction(restaurantId, categoryName, categorySort, categoryVisible)
            if (res.data) {
                setCategories([...categories, res.data])
                toast.success('Category created')
            } else {
                toast.error(res.error || 'Failed to create category')
            }
        }

        setIsCategoryModalOpen(false)
        setIsSubmitting(false)
    }

    const deleteCategory = async (id: string) => {
        const isOk = await confirm({
            title: 'Delete Category?',
            message: 'Are you sure? Items within this category might be orphaned.',
            confirmText: 'Delete Category',
            isDestructive: true
        })
        if (!isOk) return

        const res = await deleteCategoryAction(id)
        if (res.success) {
            setCategories(categories.filter(c => c.id !== id))
            toast.success('Category deleted')
        } else {
            toast.error(res.error || 'Failed to delete category')
        }
    }

    // --- Image Upload Handler ---
    const uploadMenuImage = async (file: File) => {
        setImageUploading(true)
        try {
            const supabase = createClient()
            const ext = file.name.split('.').pop()
            const path = `${restaurantId}/${Date.now()}.${ext}`
            const { error } = await supabase.storage.from('menu-images').upload(path, file, { upsert: true })
            if (error) throw error
            const { data: urlData } = supabase.storage.from('menu-images').getPublicUrl(path)
            setItemFormData(prev => ({ ...prev, image_url: urlData.publicUrl }))
            toast.success('Image uploaded')
        } catch {
            toast.error('Failed to upload image')
        } finally {
            setImageUploading(false)
        }
    }

    // --- Item Handlers ---
    const openItemModal = (item?: MenuItem) => {
        if (item) {
            setEditingItem(item)
            setItemFormData({ ...item })
        } else {
            setEditingItem(null)
            setItemFormData({
                name: '', description: '', price: 0, is_available: true,
                category_id: categories[0]?.id || '', image_url: ''
            })
        }
        setIsItemModalOpen(true)
    }

    const saveItem = async () => {
        if (!itemFormData.name || !itemFormData.price || !itemFormData.category_id) return
        setIsSubmitting(true)

        const payload = {
            ...itemFormData,
            restaurant_id: restaurantId,
            price: Number(itemFormData.price)
        }

        if (editingItem) {
            const res = await updateItemAction(editingItem.id, payload)
            if (res.success) {
                setItems(items.map(i => i.id === editingItem.id ? { ...i, ...payload } as MenuItem : i))
                toast.success('Item updated')
            } else {
                toast.error(res.error || 'Failed to update item')
            }
        } else {
            const res = await addItemAction(payload)
            if (res.data) {
                setItems([...items, res.data])
                toast.success('Item added')
            } else {
                toast.error(res.error || 'Failed to add item')
            }
        }

        setIsItemModalOpen(false)
        setIsSubmitting(false)
    }

    const deleteItem = async (id: string) => {
        const isOk = await confirm({
            title: 'Delete Item?',
            message: 'Are you sure you want to delete this menu item?',
            confirmText: 'Delete Item',
            isDestructive: true
        })
        if (!isOk) return

        const res = await deleteItemAction(id)
        if (res.success) {
            setItems(items.filter(i => i.id !== id))
            toast.success('Item deleted')
        } else {
            toast.error(res.error || 'Failed to delete item')
        }
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50/50">
                <button
                    onClick={() => setActiveTab('items')}
                    className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'items' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                    Menu Items
                </button>
                <button
                    onClick={() => setActiveTab('categories')}
                    className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'categories' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                    Categories
                </button>
            </div>

            {/* Content Area */}
            <div className="p-6">
                {activeTab === 'categories' ? (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold text-gray-800">Manage Categories</h3>
                            <button
                                onClick={() => openCategoryModal()}
                                className="flex items-center gap-2 bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-opacity-90 transition-colors"
                            >
                                <Plus size={16} /> Add Category
                            </button>
                        </div>
                        <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                            {categories.sort((a, b) => a.sort_order - b.sort_order).map((cat) => (
                                <li key={cat.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors bg-white">
                                    <div className="flex items-center gap-4">
                                        <GripVertical size={16} className="text-gray-300 cursor-grab" />
                                        <div>
                                            <div className="font-medium text-gray-900 flex items-center gap-2">
                                                {cat.name}
                                                {!cat.is_visible && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500 uppercase">Hidden</span>}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-0.5">Sort: {cat.sort_order}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {hasNepali && (
                                            <button onClick={() => setTranslateTarget({ entityId: cat.id, entityType: 'category', name: cat.name })} className="p-2 text-gray-400 hover:text-purple-500 rounded-lg hover:bg-purple-50" title="Translate">
                                                <Globe size={16} />
                                            </button>
                                        )}
                                        <button onClick={() => openCategoryModal(cat)} className="p-2 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => deleteCategory(cat.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </li>
                            ))}
                            {categories.length === 0 && (
                                <li className="p-8 text-center text-gray-500 text-sm">No categories created yet.</li>
                            )}
                        </ul>
                    </div>
                ) : (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold text-gray-800">Menu Items</h3>
                            <button
                                onClick={() => openItemModal()}
                                className="flex items-center gap-2 bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-opacity-90 transition-colors"
                                disabled={categories.length === 0}
                            >
                                <Plus size={16} /> Add Item
                            </button>
                        </div>

                        {categories.length === 0 && (
                            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-sm mb-6 flex items-start gap-3">
                                <Tag className="shrink-0 mt-0.5 text-amber-500" size={18} />
                                <div>
                                    <p className="font-semibold">You need categories first!</p>
                                    <p className="mt-1">Please create at least one category before adding menu items.</p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-8">
                            {categories.map(cat => {
                                const catItems = items.filter(i => i.category_id === cat.id)
                                if (catItems.length === 0) return null

                                return (
                                    <div key={cat.id}>
                                        <h4 className="font-semibold text-gray-700 bg-gray-50/80 px-4 py-2 rounded-lg mb-3 border border-gray-100 flex items-center gap-2">
                                            <Tag size={14} className="text-[var(--color-primary)]" />
                                            {cat.name}
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {catItems.map(item => (
                                                <div key={item.id} className="flex gap-4 p-4 border border-gray-200 rounded-xl bg-white hover:border-gray-300 transition-colors group">
                                                    <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200">
                                                        {item.image_url ? (
                                                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                                                        ) : (
                                                            <ImageIcon className="text-gray-300" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start">
                                                            <h5 className="font-semibold text-gray-900 truncate pr-2">{item.name}</h5>
                                                            <span className="font-bold text-[var(--color-primary)] shrink-0">{formatCurrency(item.price)}</span>
                                                        </div>
                                                        <p className="text-sm text-gray-500 line-clamp-2 mt-1 leading-snug">{item.description}</p>
                                                        <div className="mt-3 flex items-center gap-2">
                                                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${item.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                {item.is_available ? 'Available' : 'Sold Out'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {hasNepali && (
                                                            <button onClick={() => setTranslateTarget({ entityId: item.id, entityType: 'menu_item', name: item.name, description: item.description })} className="p-1.5 text-gray-400 hover:text-purple-500 rounded bg-gray-50 hover:bg-purple-50" title="Translate">
                                                                <Globe size={14} />
                                                            </button>
                                                        )}
                                                        <button onClick={() => openItemModal(item)} className="p-1.5 text-gray-400 hover:text-blue-500 rounded bg-gray-50 hover:bg-blue-50">
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button onClick={() => deleteItem(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded bg-gray-50 hover:bg-red-50">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Category Modal Overlay */}
            {isCategoryModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-semibold text-gray-900">{editingCategory ? 'Edit Category' : 'New Category'}</h3>
                            <button onClick={() => setIsCategoryModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={categoryName}
                                    onChange={e => setCategoryName(e.target.value)}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] sm:text-sm p-2.5 border"
                                    placeholder="e.g. Starters"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                                    <input
                                        type="number"
                                        value={categorySort}
                                        onChange={e => setCategorySort(Number(e.target.value))}
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] sm:text-sm p-2.5 border"
                                    />
                                </div>
                                <div className="flex items-center pt-6">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={categoryVisible}
                                            onChange={e => setCategoryVisible(e.target.checked)}
                                            className="rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)] w-4 h-4"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Visible to Customers</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button onClick={() => setIsCategoryModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">
                                Cancel
                            </button>
                            <button disabled={!categoryName.trim() || isSubmitting} onClick={saveCategory} className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] rounded-lg shadow-sm hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save Category
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Item Modal Overlay */}
            {isItemModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
                            <h3 className="font-semibold text-gray-900">{editingItem ? 'Edit Item' : 'New Menu Item'}</h3>
                            <button onClick={() => setIsItemModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                                <input
                                    type="text"
                                    value={itemFormData.name}
                                    onChange={e => setItemFormData({ ...itemFormData, name: e.target.value })}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] sm:text-sm p-2.5 border"
                                    placeholder="e.g. Classic Cheeseburger"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-gray-500 sm:text-sm">$</span>
                                        </div>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={itemFormData.price}
                                            onChange={e => setItemFormData({ ...itemFormData, price: Number(e.target.value) })}
                                            className="w-full pl-7 border-gray-300 rounded-lg shadow-sm focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] sm:text-sm p-2.5 border"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                                    <select
                                        value={itemFormData.category_id || ''}
                                        onChange={e => setItemFormData({ ...itemFormData, category_id: e.target.value })}
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] sm:text-sm p-2.5 border"
                                    >
                                        <option value="" disabled>Select category</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    value={itemFormData.description || ''}
                                    onChange={e => setItemFormData({ ...itemFormData, description: e.target.value })}
                                    rows={3}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] sm:text-sm p-2.5 border resize-none"
                                    placeholder="Delicious beef patty with cheddar..."
                                />
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-medium text-gray-700">Image (Optional)</label>
                                    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                                        <button type="button" onClick={() => setImageMode('upload')} className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${imageMode === 'upload' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                                            <Upload size={11} /> Upload
                                        </button>
                                        <button type="button" onClick={() => setImageMode('url')} className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${imageMode === 'url' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                                            <Link size={11} /> URL
                                        </button>
                                    </div>
                                </div>
                                {imageMode === 'upload' ? (
                                    <div>
                                        <input
                                            ref={imageInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={e => { const f = e.target.files?.[0]; if (f) uploadMenuImage(f) }}
                                        />
                                        {itemFormData.image_url ? (
                                            <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50" style={{ height: 140 }}>
                                                <img src={itemFormData.image_url} alt="Preview" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                    <button type="button" onClick={() => imageInputRef.current?.click()} className="bg-white text-gray-900 text-xs font-medium px-3 py-1.5 rounded-lg shadow flex items-center gap-1">
                                                        <Upload size={12} /> Change
                                                    </button>
                                                    <button type="button" onClick={() => setItemFormData(prev => ({ ...prev, image_url: '' }))} className="bg-red-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow flex items-center gap-1">
                                                        <X size={12} /> Remove
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button type="button" onClick={() => imageInputRef.current?.click()} disabled={imageUploading} className="w-full border-2 border-dashed border-gray-200 rounded-xl h-28 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors disabled:opacity-50">
                                                {imageUploading ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} />}
                                                <span className="text-xs font-medium">{imageUploading ? 'Uploading…' : 'Click to upload photo'}</span>
                                                {!imageUploading && <span className="text-xs text-gray-300">JPG, PNG, WEBP up to 5MB</span>}
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <input
                                            type="url"
                                            value={itemFormData.image_url || ''}
                                            onChange={e => setItemFormData({ ...itemFormData, image_url: e.target.value })}
                                            className="w-full border-gray-300 rounded-lg shadow-sm focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] sm:text-sm p-2.5 border"
                                            placeholder="https://example.com/image.jpg"
                                        />
                                        {itemFormData.image_url && (
                                            <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50" style={{ height: 120 }}>
                                                <img src={itemFormData.image_url} alt="Preview" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 mt-2">
                                <div>
                                    <span className="text-sm font-medium text-gray-900 block">Availability</span>
                                    <span className="text-xs text-gray-500">Customers can order this item</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={!!itemFormData.is_available} onChange={e => setItemFormData({ ...itemFormData, is_available: e.target.checked })} />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                                </label>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                            <button onClick={() => setIsItemModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">
                                Cancel
                            </button>
                            <button disabled={!itemFormData.name || !itemFormData.price || !itemFormData.category_id || isSubmitting} onClick={saveItem} className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] rounded-lg shadow-sm hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save Item
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Translation Modal */}
            {translateTarget && (
                <TranslationModal
                    entityId={translateTarget.entityId}
                    entityType={translateTarget.entityType}
                    englishName={translateTarget.name}
                    englishDescription={translateTarget.description}
                    existingTranslations={translations}
                    onClose={() => {
                        setTranslateTarget(null)
                        // Refresh translations after save
                        getRestaurantTranslationConfig().then(({ translations: t }) => setTranslations(t))
                    }}
                />
            )}
        </div>
    )
}
