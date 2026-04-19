'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/lib/useProfile'
import { Profile, DEPARTMENTS, getRoleFromDepartment } from '@/lib/types'
import { adminRead } from '@/lib/adminRead'
import LoadError from '@/components/LoadError'

export default function UsersPage() {
  const { profile, supabase, setProfile } = useProfile()
  const router = useRouter()
  const [users, setUsers] = useState<Profile[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [editSelfOnly, setEditSelfOnly] = useState(false)

  // Form
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formDept, setFormDept] = useState<string>(DEPARTMENTS[0])
  const [formAL, setFormAL] = useState(14)
  const [formML, setFormML] = useState(14)
  const [formJoinDate, setFormJoinDate] = useState(new Date().toISOString().split('T')[0])
  const [formPhone, setFormPhone] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (profile) loadUsers() }, [profile])

  async function loadUsers() {
    setLoadError(null)
    setLoading(true)
    const { data, error } = await adminRead<Profile>('profiles', { order: { col: 'name' } })
    setLoading(false)
    if (error) { setLoadError(error); return }
    const roleOrder: Record<string, number> = { management: 0, hr: 1, staff: 2 }
    setUsers(data.sort((a, b) => (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3)))
  }

  function resetForm() {
    setFormName('')
    setFormEmail('')
    setFormPassword('')
    setFormDept(DEPARTMENTS[0])
    setFormAL(14)
    setFormML(14)
    setFormJoinDate(new Date().toISOString().split('T')[0])
    setFormPhone('')
    setFormError('')
    setEditingUser(null)
    setEditSelfOnly(false)
  }

  function startEdit(user: Profile) {
    const isSelf = profile?.id === user.id
    // Management can edit all fields for anyone else
    // HR can edit all fields only for non-management users
    // Self-edit and HR-editing-management = name only
    const canEditAll = !isSelf && (
      profile?.role === 'management' ||
      (profile?.role === 'hr' && user.role !== 'management')
    )

    setEditingUser(user)
    setEditSelfOnly(!canEditAll)
    setFormName(user.name)
    setFormDept(user.department)
    setFormAL(user.al_entitled)
    setFormML(user.ml_entitled)
    setFormJoinDate(user.join_date)
    setFormPhone(user.phone || '')
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!profile) return
    setSaving(true)

    if (editingUser) {
      // Self-edit (staff): only name and phone
      if (editSelfOnly) {
        const { error } = await supabase.from('profiles').update({
          name: formName,
          phone: formPhone || null,
        }).eq('id', editingUser.id)

        if (error) {
          setFormError(error.message)
        } else {
          setShowForm(false)
          resetForm()
          // Refresh own profile if editing self
          if (editingUser.id === profile.id) {
            const { data: updated } = await adminRead<Profile>('profiles', { filters: [{ type: 'eq', col: 'id', val: profile.id }] })
            if (updated[0]) setProfile(updated[0])
          }
          loadUsers()
        }
      } else {
        // HR/Management: edit all fields
        const role = getRoleFromDepartment(formDept)
        const { error } = await supabase.from('profiles').update({
          name: formName,
          department: formDept,
          role,
          al_entitled: formAL,
          ml_entitled: formML,
          join_date: formJoinDate,
          phone: formPhone || null,
        }).eq('id', editingUser.id)

        if (error) {
          setFormError(error.message)
        } else {
          setShowForm(false)
          resetForm()
          if (editingUser.id === profile.id) {
            const { data: updated } = await adminRead<Profile>('profiles', { filters: [{ type: 'eq', col: 'id', val: profile.id }] })
            if (updated[0]) setProfile(updated[0])
          }
          loadUsers()
        }
      }
    } else {
      // Create new user (HR/Management only)
      if (!formEmail || !formPassword) {
        setFormError('Email and password are required for new users')
        setSaving(false)
        return
      }

      const role = getRoleFromDepartment(formDept)

      const res = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formEmail,
          password: formPassword,
          name: formName,
          department: formDept,
          role,
          al_entitled: formAL,
          ml_entitled: formML,
          join_date: formJoinDate,
          phone: formPhone || null,
        }),
      })

      const result = await res.json()
      if (!res.ok) {
        setFormError(result.error || 'Failed to create user')
      } else {
        setShowForm(false)
        resetForm()
        loadUsers()
      }
    }
    setSaving(false)
  }

  async function handleDelete(userId: string) {
    if (!confirm('Delete this staff member? This cannot be undone.')) return
    setLoadError(null)
    const { error } = await supabase.from('profiles').delete().eq('id', userId)
    if (error) { setLoadError('Failed to delete: ' + error.message); return }
    loadUsers()
  }

  const isHrOrMgmt = profile && (profile.role === 'hr' || profile.role === 'management')

  useEffect(() => {
    if (profile && !isHrOrMgmt) {
      router.replace('/dashboard')
    }
  }, [profile])

  if (!profile || !isHrOrMgmt) return null

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          {loadError && <LoadError message={loadError} />}
          <p className="text-slate-500 text-sm mt-1">
            {isHrOrMgmt ? 'Manage staff accounts and entitlements' : 'View staff directory'}
          </p>
        </div>
        {isHrOrMgmt && (
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl transition"
          >
            + Add Staff
          </button>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 pb-8 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">
                {editingUser
                  ? editSelfOnly ? 'Edit My Profile' : 'Edit Staff'
                  : 'Add New Staff'}
              </h2>
              <button onClick={() => { setShowForm(false); resetForm() }} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number <span className="text-slate-400 font-normal">(for WhatsApp)</span></label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={e => setFormPhone(e.target.value)}
                  placeholder="e.g. 0123456789 or 60123456789"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-slate-400 mt-1">Malaysian number — starts with 01x or 601x</p>
              </div>
              {!editingUser && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={e => setFormEmail(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                    <input
                      type="password"
                      value={formPassword}
                      onChange={e => setFormPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </>
              )}
              {!editSelfOnly && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                    <select
                      value={formDept}
                      onChange={e => setFormDept(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <p className="text-xs text-slate-400 mt-1">
                      Role: <span className="font-medium">{getRoleFromDepartment(formDept)}</span> (auto-assigned)
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Join Date</label>
                    <input
                      type="date"
                      value={formJoinDate}
                      onChange={e => setFormJoinDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">AL Entitled</label>
                      <input
                        type="number"
                        value={formAL}
                        onChange={e => setFormAL(Number(e.target.value))}
                        min={0}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">ML Entitled</label>
                      <input
                        type="number"
                        value={formML}
                        onChange={e => setFormML(Number(e.target.value))}
                        min={0}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </>
              )}
              {formError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{formError}</p>
              )}
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingUser ? 'Update' : 'Create Staff'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">Name</th>
              <th className="text-left text-xs font-medium text-slate-400 px-5 py-3 hidden sm:table-cell">Department</th>
              <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">Role</th>
              <th className="text-left text-xs font-medium text-slate-400 px-5 py-3 hidden lg:table-cell">AL</th>
              <th className="text-left text-xs font-medium text-slate-400 px-5 py-3 hidden lg:table-cell">ML</th>
              <th className="text-left text-xs font-medium text-slate-400 px-5 py-3 hidden md:table-cell">Phone</th>
              <th className="text-left text-xs font-medium text-slate-400 px-5 py-3 hidden xl:table-cell">Join Date</th>
              <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && [1,2,3,4].map(i => (
              <tr key={i} className="border-b border-gray-50">
                <td className="px-5 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse w-32" /></td>
                <td className="px-5 py-3 hidden sm:table-cell"><div className="h-4 bg-slate-100 rounded animate-pulse w-20" /></td>
                <td className="px-5 py-3"><div className="h-5 bg-slate-100 rounded-lg animate-pulse w-14" /></td>
                <td className="px-5 py-3 hidden lg:table-cell"><div className="h-4 bg-slate-100 rounded animate-pulse w-10" /></td>
                <td className="px-5 py-3 hidden lg:table-cell"><div className="h-4 bg-slate-100 rounded animate-pulse w-10" /></td>
                <td className="px-5 py-3 hidden md:table-cell"><div className="h-4 bg-slate-100 rounded animate-pulse w-24" /></td>
                <td className="px-5 py-3 hidden xl:table-cell"><div className="h-4 bg-slate-100 rounded animate-pulse w-20" /></td>
                <td className="px-5 py-3"><div className="h-7 bg-slate-100 rounded animate-pulse w-16" /></td>
              </tr>
            ))}
            {users.map(user => {
              const isSelf = profile?.id === user.id
              // Management can edit anyone; HR can edit non-management users only
              const canEdit = profile?.role === 'management' ||
                (profile?.role === 'hr' && user.role !== 'management')
              // Management can delete anyone except self; HR can delete staff/HR only (not management, not self)
              const canDelete = (!isSelf) && (
                profile?.role === 'management' ||
                (profile?.role === 'hr' && user.role !== 'management')
              )

              return (
                <tr key={user.id} className="border-b border-gray-50 hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium text-slate-900">
                      {user.name}
                      {isSelf && <span className="ml-1.5 text-[10px] text-indigo-500 font-semibold">(You)</span>}
                    </p>
                    <p className="text-xs text-slate-400 sm:hidden">{user.department}</p>
                  </td>
                  <td className="px-5 py-3 hidden sm:table-cell">
                    <span className="text-sm text-slate-600">{user.department}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-semibold ${
                      user.role === 'management' ? 'bg-purple-50 text-purple-600' :
                      user.role === 'hr' ? 'bg-blue-50 text-blue-600' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-600 hidden lg:table-cell">
                    {user.role === 'management' ? <span className="text-slate-300">—</span> : `${user.al_used}/${user.al_entitled}`}
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-600 hidden lg:table-cell">
                    {user.role === 'management' ? <span className="text-slate-300">—</span> : `${user.ml_used}/${user.ml_entitled}`}
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-600 hidden md:table-cell">
                    {user.phone || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-600 hidden xl:table-cell">
                    {new Date(user.join_date + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {canEdit && (
                        <button
                          onClick={() => startEdit(user)}
                          className="p-1.5 hover:bg-indigo-50 rounded-lg transition text-slate-400 hover:text-indigo-600"
                          title={isSelf && !isHrOrMgmt ? 'Edit name' : 'Edit'}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition text-slate-400 hover:text-red-500"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-sm text-slate-400">
                  No staff members found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
