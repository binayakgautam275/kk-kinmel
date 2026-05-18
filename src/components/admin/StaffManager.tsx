'use client'

import { useState } from 'react'
import { Shield, ChefHat, Users, User, Check, AlertTriangle, Loader2 } from 'lucide-react'
import { updateStaffRoleAction, toggleStaffStatusAction } from '@/app/(admin)/admin/staff/actions'
import { toast } from 'react-hot-toast'
import { useConfirmStore } from '@/lib/stores/confirm'

type StaffMember = {
    id: string
    full_name: string
    avatar_url: string | null
    is_active: boolean
    role_id: number
    created_at: string
    // Supabase can return arrays for joins depending on the query shape
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    roles: any
}

type Role = {
    id: number
    name: string
    description: string | null
}

export default function StaffManager({
    initialStaff,
    roles,
    currentUserRole,
    currentUserId,
    restaurantId
}: {
    initialStaff: StaffMember[]
    roles: Role[]
    currentUserRole: string
    currentUserId: string
    restaurantId: string
}) {
    const [staff, setStaff] = useState<StaffMember[]>(initialStaff)
    const [submittingId, setSubmittingId] = useState<string | null>(null)
    const { confirm } = useConfirmStore()

    // Modals
    const [changeRoleModal, setChangeRoleModal] = useState<{ isOpen: boolean, user: StaffMember | null, newRoleId: number }>({
        isOpen: false,
        user: null,
        newRoleId: 0
    })

    const [createModal, setCreateModal] = useState({
        isOpen: false,
        fullName: '',
        email: '',
        password: '',
        phone: '',
        roleId: 4, // Default to waiter
        isCreating: false
    })

    const handleRoleChange = async () => {
        const user = changeRoleModal.user
        if (!user) return

        setSubmittingId(user.id)
        const res = await updateStaffRoleAction(user.id, changeRoleModal.newRoleId)

        if (res.success) {
            const newRoleName = roles.find(r => r.id === changeRoleModal.newRoleId)?.name || ''
            setStaff(staff.map(s => s.id === user.id ? { ...s, role_id: changeRoleModal.newRoleId, roles: { ...s.roles, name: newRoleName } } : s))
            toast.success('Role updated')
        } else {
            toast.error(res.error || 'Failed to update role')
        }

        setSubmittingId(null)
        setChangeRoleModal({ isOpen: false, user: null, newRoleId: 0 })
    }

    const handleToggleStatus = async (user: StaffMember) => {
        const isOk = await confirm({
            title: user.is_active ? 'Suspend User?' : 'Activate User?',
            message: `Are you sure you want to ${user.is_active ? 'suspend' : 'activate'} ${user.full_name}?`,
            confirmText: user.is_active ? 'Suspend' : 'Activate',
            isDestructive: user.is_active
        })
        if (!isOk) return

        setSubmittingId(user.id)
        const res = await toggleStaffStatusAction(user.id, !user.is_active)

        if (res.success) {
            setStaff(staff.map(s => s.id === user.id ? { ...s, is_active: !user.is_active } : s))
            toast.success(user.is_active ? 'User suspended' : 'User activated')
        } else {
            toast.error(res.error || 'Failed to update status')
        }
        setSubmittingId(null)
    }

    const handleCreateStaff = async () => {
        if (!createModal.fullName || !createModal.email || !createModal.password) {
            toast.error('Please fill in all required fields')
            return
        }

        if (createModal.password.length < 8) {
            toast.error('Password must be at least 8 characters')
            return
        }

        setCreateModal(prev => ({ ...prev, isCreating: true }))

        try {
            const response = await fetch('/api/staff/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    full_name: createModal.fullName,
                    email: createModal.email,
                    password: createModal.password,
                    phone: createModal.phone || undefined,
                    role_id: createModal.roleId,
                    restaurant_id: restaurantId,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                toast.error(data.error || 'Failed to create staff member')
                return
            }

            // Add new staff to list
            if (data.staff) {
                setStaff(prev => [data.staff, ...prev])
            }

            toast.success(data.message || 'Staff member created successfully')
            setCreateModal({
                isOpen: false,
                fullName: '',
                email: '',
                password: '',
                phone: '',
                roleId: 4,
                isCreating: false
            })
        } catch (error) {
            console.error('Staff creation error:', error)
            toast.error('An error occurred while creating staff')
        } finally {
            setCreateModal(prev => ({ ...prev, isCreating: false }))
        }
    }

    const formatRoleName = (name: string) => {
        return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    }

    const getRoleIcon = (roleName: string) => {
        switch (roleName) {
            case 'super_admin': return <Shield size={16} className="text-purple-500" />
            case 'manager': return <Users size={16} className="text-blue-500" />
            case 'kitchen': return <ChefHat size={16} className="text-orange-500" />
            case 'waiter': return <User size={16} className="text-green-500" />
            default: return <User size={16} className="text-gray-500" />
        }
    }

    // Business Logic: Only super_admin can assign super_admin
    const availableRoles = roles.filter(r => r.name !== 'customer' && (currentUserRole === 'super_admin' || r.name !== 'super_admin'))

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 bg-gray-50/50">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800">Team Roster ({staff.length})</h3>
                    <p className="text-sm text-gray-500 mt-1">Create staff accounts and manage roles</p>
                </div>
                <button
                    onClick={() => setCreateModal(prev => ({ ...prev, isOpen: true }))}
                    className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 shrink-0"
                >
                    <Users size={16} />
                    Add Staff
                </button>
            </div>

            {/* Desktop Table — hidden on mobile */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-sm font-semibold text-gray-600">
                            <th className="p-4 font-medium pl-6">Staff Member</th>
                            <th className="p-4 font-medium">System Role</th>
                            <th className="p-4 font-medium">Status</th>
                            <th className="p-4 font-medium text-right pr-6">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {staff.map((user) => {
                            const isMe = user.id === currentUserId
                            const roleObj = Array.isArray(user.roles) ? user.roles[0] : user.roles
                            const roleName = roleObj?.name || ''
                            const isSuperAdmin = roleName === 'super_admin'
                            const canEdit = currentUserRole === 'super_admin' ? !isMe : (!isSuperAdmin && roleName !== 'manager' && !isMe)

                            return (
                                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="p-4 pl-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden shrink-0 border border-gray-200 flex items-center justify-center">
                                                {user.avatar_url ? (
                                                    <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-gray-500 font-medium text-sm">
                                                        {user.full_name.charAt(0).toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900 flex items-center gap-2">
                                                    {user.full_name}
                                                    {isMe && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase">You</span>}
                                                </div>
                                                <div className="text-xs text-gray-500">ID: {user.id.substring(0, 8)}...</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-sm font-medium text-gray-700">
                                            {getRoleIcon(roleName)}
                                            {formatRoleName(roleName || 'Unknown')}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {user.is_active ? 'Active' : 'Suspended'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right pr-6">
                                        {canEdit ? (
                                            <div className="flex items-center justify-end gap-2">
                                                <button disabled={submittingId === user.id} onClick={() => setChangeRoleModal({ isOpen: true, user, newRoleId: user.role_id })} className="text-sm font-medium text-primary hover:text-opacity-80 px-3 py-1.5 rounded-md hover:bg-primary/10 transition-colors">
                                                    Change Role
                                                </button>
                                                <button disabled={submittingId === user.id} onClick={() => handleToggleStatus(user)} className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${user.is_active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                                                    {submittingId === user.id ? <Loader2 size={16} className="animate-spin inline" /> : (user.is_active ? 'Suspend' : 'Activate')}
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-400 font-medium px-3 py-1.5">—</span>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                        {staff.length === 0 && (
                            <tr><td colSpan={4} className="p-8 text-center text-gray-500">No staff members found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card List — visible only on small screens */}
            <div className="md:hidden divide-y divide-gray-100">
                {staff.map((user) => {
                    const isMe = user.id === currentUserId
                    const roleObj = Array.isArray(user.roles) ? user.roles[0] : user.roles
                    const roleName = roleObj?.name || ''
                    const isSuperAdmin = roleName === 'super_admin'
                    const canEdit = currentUserRole === 'super_admin' ? !isMe : (!isSuperAdmin && roleName !== 'manager' && !isMe)

                    return (
                        <div key={user.id} className="p-4 space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden shrink-0 border border-gray-200 flex items-center justify-center">
                                    {user.avatar_url ? (
                                        <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-gray-500 font-medium text-sm">{user.full_name.charAt(0).toUpperCase()}</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-gray-900 flex items-center gap-2 truncate">
                                        {user.full_name}
                                        {isMe && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-700 uppercase shrink-0">You</span>}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700">
                                            {getRoleIcon(roleName)} {formatRoleName(roleName || 'Unknown')}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {user.is_active ? 'Active' : 'Suspended'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            {canEdit && (
                                <div className="grid grid-cols-2 gap-2">
                                    <button disabled={submittingId === user.id} onClick={() => setChangeRoleModal({ isOpen: true, user, newRoleId: user.role_id })} className="py-2 text-sm font-medium text-primary bg-primary/5 rounded-lg border border-primary/20 active:scale-95 transition">
                                        Change Role
                                    </button>
                                    <button disabled={submittingId === user.id} onClick={() => handleToggleStatus(user)} className={`py-2 text-sm font-medium rounded-lg border active:scale-95 transition ${user.is_active ? 'text-red-600 bg-red-50 border-red-200' : 'text-green-600 bg-green-50 border-green-200'}`}>
                                        {submittingId === user.id ? <Loader2 size={16} className="animate-spin mx-auto" /> : (user.is_active ? 'Suspend' : 'Activate')}
                                    </button>
                                </div>
                            )}
                        </div>
                    )
                })}
                {staff.length === 0 && (
                    <div className="p-8 text-center text-gray-500">No staff members found.</div>
                )}
            </div>

            {/* Role Change Modal */}
            {changeRoleModal.isOpen && changeRoleModal.user && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Change Role</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Select a new role for <span className="font-semibold text-gray-900">{changeRoleModal.user.full_name}</span>.
                            </p>

                            <div className="space-y-3">
                                {availableRoles.map(role => (
                                    <label key={role.id} className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${changeRoleModal.newRoleId === role.id ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}>
                                        <input
                                            type="radio"
                                            name="role"
                                            value={role.id}
                                            checked={changeRoleModal.newRoleId === role.id}
                                            onChange={() => setChangeRoleModal({ ...changeRoleModal, newRoleId: role.id })}
                                            className="mt-1 text-primary focus:ring-primary"
                                        />
                                        <div>
                                            <div className="font-medium text-gray-900 flex items-center gap-2">
                                                {getRoleIcon(role.name)}
                                                {formatRoleName(role.name)}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">{role.description}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>

                            {changeRoleModal.newRoleId === 1 && (
                                <div className="mt-4 p-3 bg-amber-50 text-amber-800 rounded-lg text-sm flex items-start gap-2 border border-amber-200">
                                    <AlertTriangle size={18} className="shrink-0 text-amber-500" />
                                    <p>Warning: You are granting full Super Admin access. This user will have complete control over the system.</p>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button onClick={() => setChangeRoleModal({ isOpen: false, user: null, newRoleId: 0 })} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">
                                Cancel
                            </button>
                            <button
                                disabled={submittingId === changeRoleModal.user.id}
                                onClick={handleRoleChange}
                                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg shadow-sm hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                            >
                                {submittingId === changeRoleModal.user.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                Save Role
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Staff Modal */}
            {createModal.isOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Create Staff Account</h3>
                            <p className="text-sm text-gray-500 mb-6">Add a new staff member to your restaurant.</p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
                                    <input
                                        type="text"
                                        value={createModal.fullName}
                                        onChange={(e) => setCreateModal(prev => ({ ...prev, fullName: e.target.value }))}
                                        placeholder="John Doe"
                                        disabled={createModal.isCreating}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address *</label>
                                    <input
                                        type="email"
                                        value={createModal.email}
                                        onChange={(e) => setCreateModal(prev => ({ ...prev, email: e.target.value }))}
                                        placeholder="john@example.com"
                                        disabled={createModal.isCreating}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Password *</label>
                                    <input
                                        type="password"
                                        value={createModal.password}
                                        onChange={(e) => setCreateModal(prev => ({ ...prev, password: e.target.value }))}
                                        placeholder="At least 8 characters"
                                        disabled={createModal.isCreating}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                                    <input
                                        type="tel"
                                        value={createModal.phone}
                                        onChange={(e) => setCreateModal(prev => ({ ...prev, phone: e.target.value }))}
                                        placeholder="123-456-7890"
                                        disabled={createModal.isCreating}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Initial Role</label>
                                    <select
                                        value={createModal.roleId}
                                        onChange={(e) => setCreateModal(prev => ({ ...prev, roleId: parseInt(e.target.value) }))}
                                        disabled={createModal.isCreating}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50"
                                    >
                                        {availableRoles.map(role => (
                                            <option key={role.id} value={role.id}>
                                                {formatRoleName(role.name)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button
                                onClick={() => setCreateModal(prev => ({ ...prev, isOpen: false }))}
                                disabled={createModal.isCreating}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateStaff}
                                disabled={createModal.isCreating}
                                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg shadow-sm hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                            >
                                {createModal.isCreating ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                Create Staff
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
