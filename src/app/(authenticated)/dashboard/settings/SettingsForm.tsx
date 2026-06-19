'use client'

import { useActionState } from 'react'
import { updateRestaurantSettings } from '../actions'

interface RestaurantData {
    name: string | null
    address: string | null
    contact_phone: string | null
    contact_email: string | null
    pan_number: string | null
    vat_registered: boolean | null
    payment_qr_label: string | null
    payment_qr_url: string | null
}

export default function SettingsForm({ restaurant }: { restaurant: RestaurantData }) {
    const [state, formAction, pending] = useActionState(updateRestaurantSettings, {})

    return (
        <form action={formAction} className="space-y-6" encType="multipart/form-data">
            {state.success && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 font-medium">
                    Settings saved successfully.
                </div>
            )}
            {state.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                    {state.error}
                </div>
            )}

            {/* Restaurant info */}
            <div className="bg-white rounded-xl border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-base font-semibold text-gray-900">Restaurant Information</h2>
                </div>
                <div className="px-6 py-5 space-y-5">
                    <Field label="Restaurant Name" name="name" defaultValue={restaurant.name || ''} required />
                    <Field label="Address" name="address" defaultValue={restaurant.address || ''} />
                    <div className="grid sm:grid-cols-2 gap-5">
                        <Field label="Phone" name="contact_phone" type="tel" defaultValue={restaurant.contact_phone || ''} />
                        <Field label="Email" name="contact_email" type="email" defaultValue={restaurant.contact_email || ''} />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-5">
                        <Field label="PAN Number" name="pan_number" defaultValue={restaurant.pan_number || ''} placeholder="9-digit PAN" />
                        <div className="flex items-center gap-3 pt-6">
                            <input
                                type="checkbox"
                                id="vat_registered"
                                name="vat_registered"
                                defaultChecked={restaurant.vat_registered || false}
                                className="h-4 w-4 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                            />
                            <label htmlFor="vat_registered" className="text-sm font-medium text-gray-700">
                                VAT Registered
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* Physical Menus */}
            <div className="bg-white rounded-xl border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-base font-semibold text-gray-900">Physical Menus</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Upload images of your physical menus for customers to view.</p>
                    </div>
                </div>
                <div className="px-6 py-5 space-y-5">
                    <Field
                        label="Upload Menu Images"
                        name="physical_menus"
                        type="file"
                        // @ts-ignore
                        multiple
                        accept="image/*"
                    />
                    
                    {/* @ts-ignore */}
                    {restaurant.physical_menu_urls && restaurant.physical_menu_urls.length > 0 && (
                        <div>
                            <p className="text-xs font-medium text-gray-500 mb-2">Current Physical Menus</p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {/* @ts-ignore */}
                                {restaurant.physical_menu_urls.map((url: string, idx: number) => (
                                    <div key={idx} className="relative aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={url} alt={`Menu Page ${idx + 1}`} className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Payment QR */}
            <div className="bg-white rounded-xl border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-base font-semibold text-gray-900">Payment QR</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Shown to customers on their order receipt when they need to pay.</p>
                </div>
                <div className="px-6 py-5 space-y-5">
                    <Field
                        label="QR Label"
                        name="payment_qr_label"
                        defaultValue={restaurant.payment_qr_label || ''}
                        placeholder="e.g. eSewa — 9849XXXXXX"
                    />
                    {restaurant.payment_qr_url && (
                        <div>
                            <p className="text-xs font-medium text-gray-500 mb-2">Current QR Image</p>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={restaurant.payment_qr_url}
                                alt="Payment QR"
                                className="w-32 h-32 object-contain border border-gray-200 rounded-lg"
                            />
                            <p className="text-xs text-gray-400 mt-1">To update the QR image, use the Admin Panel → Settings.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={pending}
                    className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
                >
                    {pending ? 'Saving…' : 'Save Changes'}
                </button>
            </div>
        </form>
    )
}

function Field({ label, name, type = 'text', defaultValue, placeholder, required, ...rest }: {
    label: string
    name: string
    type?: string
    defaultValue?: string
    placeholder?: string
    required?: boolean
    [key: string]: any
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            <input
                type={type}
                name={name}
                defaultValue={defaultValue}
                placeholder={placeholder}
                required={required}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition"
                {...rest}
            />
        </div>
    )
}
