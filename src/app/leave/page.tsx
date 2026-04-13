'use client'

import { useEffect, useState } from 'react'
import { useProfile } from '@/lib/useProfile'
import { Leave, Profile } from '@/lib/types'
import Sidebar from '@/components/Sidebar'

export default function LeavePage() {
  const { profile, supabase, setProfile } = useProfile()
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [tab, setTab] = useState<'my' | 'approvals' | 'balances'>('my')

  // Management has no leaves — default them to approvals tab
  useEffect(() => {
    if (profile?.role === 'management') setTab('approvals')
  }, [profile?.role])
  const [staffProfiles, setStaffProfiles] = useState<Profile[]>([])
  const [showForm, setShowForm] = useState(false)

  // Form
  const [formType, setFormType] = useState<'Annual Leave' | 'Medical Leave'>('Annual Leave')
  const [formStart, setFormStart] = useState('')
  const [formEnd, setFormEnd] = useState('')
  const [formReason, setFormReason] = useState('')
  const [formFile, setFormFile] = useState<File | null>(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile) {
      loadLeaves()
      if (profile.role === 'hr' || profile.role === 'management') {
        supabase
          .from('profiles')
          .select('*')
          .neq('role', 'management')
          .order('name')
          .then(({ data }) => { if (data) setStaffProfiles(data as Profile[]) })
      }
    }
  }, [profile, tab])

  async function loadLeaves() {
    if (!profile) return
    let query = supabase.from('leaves').select('*').order('created_at', { ascending: false })

    if (tab === 'my') {
      query = query.eq('user_id', profile.id)
    }
    // For approvals tab, show all pending (filtered by role logic in UI)

    const { data } = await query
    if (data) setLeaves(data)
  }

  function calculateDays(start: string, end: string): number {
    if (!start || !end) return 0
    const s = new Date(start)
    const e = new Date(end)
    let count = 0
    const current = new Date(s)
    while (current <= e) {
      const day = current.getDay()
      if (day !== 0 && day !== 6) count++
      current.setDate(current.getDate() + 1)
    }
    return count
  }

  function canApprove(leave: Leave): boolean {
    if (!profile) return false
    // Management leave = exempt (auto-approved)
    if (leave.department === 'Management') return false
    // HR leave = only management can approve
    if (leave.department === 'HR') return profile.role === 'management'
    // Staff leave = HR or management can approve
    return profile.role === 'hr' || profile.role === 'management'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!profile) return

    const days = calculateDays(formStart, formEnd)
    if (days <= 0) {
      setFormError('Invalid date range')
      return
    }

    // Check balance
    if (formType === 'Annual Leave' && (profile.al_used + days) > profile.al_entitled) {
      setFormError(`Insufficient AL balance. Available: ${profile.al_entitled - profile.al_used} days`)
      return
    }
    if (formType === 'Medical Leave' && (profile.ml_used + days) > profile.ml_entitled) {
      setFormError(`Insufficient ML balance. Available: ${profile.ml_entitled - profile.ml_used} days`)
      return
    }

    // MC requires receipt
    if (formType === 'Medical Leave' && !formFile) {
      setFormError('Medical Leave requires a receipt/MC upload')
      return
    }

    setSaving(true)
    let receiptPath = null
    let receiptName = null

    if (formFile) {
      const ext = formFile.name.split('.').pop()
      const filePath = `${profile.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, formFile)
      if (uploadError) {
        setFormError('Failed to upload receipt: ' + uploadError.message)
        setSaving(false)
        return
      }
      receiptPath = filePath
      receiptName = formFile.name
    }

    // Management leave = auto-approved
    const isManagement = profile.role === 'management'

    const { error } = await supabase.from('leaves').insert({
      user_id: profile.id,
      user_name: profile.name,
      department: profile.department,
      type: formType,
      start_date: formStart,
      end_date: formEnd,
      days,
      reason: formReason,
      status: isManagement ? 'approved' : 'pending',
      receipt_path: receiptPath,
      receipt_name: receiptName,
      approved_by: isManagement ? 'Auto (Management)' : null,
      approved_at: isManagement ? new Date().toISOString() : null,
    })

    if (error) {
      setFormError(error.message)
    } else {
      // Update used count
      if (isManagement) {
        const field = formType === 'Annual Leave' ? 'al_used' : 'ml_used'
        const newVal = formType === 'Annual Leave' ? profile.al_used + days : profile.ml_used + days
        await supabase.from('profiles').update({ [field]: newVal }).eq('id', profile.id)
      }
      setShowForm(false)
      setFormType('Annual Leave')
      setFormStart('')
      setFormEnd('')
      setFormReason('')
      setFormFile(null)
      // Refresh profile to update leave balance
      const { data: updatedProf } = await supabase.from('profiles').select('*').eq('id', profile.id).single()
      if (updatedProf) setProfile(updatedProf)
      loadLeaves()
    }
    setSaving(false)
  }

  async function handleApproval(leave: Leave, status: 'approved' | 'rejected') {
    if (!profile) return

    const { error } = await supabase
      .from('leaves')
      .update({
        status,
        approved_by: profile.name,
        approved_at: new Date().toISOString(),
        remarks: status === 'rejected' ? 'Rejected by ' + profile.name : null,
      })
      .eq('id', leave.id)

    if (!error && status === 'approved') {
      const field = leave.type === 'Annual Leave' ? 'al_used' : 'ml_used'
      const { data: targetProfile } = await supabase.from('profiles').select('*').eq('id', leave.user_id).single()
      if (targetProfile) {
        const currentUsed = leave.type === 'Annual Leave' ? targetProfile.al_used : targetProfile.ml_used
        await supabase.from('profiles').update({ [field]: currentUsed + leave.days }).eq('id', leave.user_id)
      }
    }

    loadLeaves()
  }

  const alBalance = profile ? profile.al_entitled - profile.al_used : 0
  const mlBalance = profile ? profile.ml_entitled - profile.ml_used : 0
  const isHrOrMgmt = profile && (profile.role === 'hr' || profile.role === 'management')

  const filteredLeaves = tab === 'approvals'
    ? leaves.filter(l => l.status === 'pending' && canApprove(l))
    : leaves

  return (
    <div className="flex min-h-screen">
      <Sidebar profile={profile} />
      <main className="md:ml-[200px] flex-1 p-4 md:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Leave Management</h1>
            <p className="text-slate-500 text-sm mt-1">Apply for leave and track balances</p>
          </div>
          {profile?.role !== 'management' && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl transition"
            >
              + Apply Leave
            </button>
          )}
        </div>

        {/* Balance Cards — not shown to management */}
        {profile?.role !== 'management' && <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <p className="text-sm text-slate-500 font-medium">Annual Leave</p>
            <div className="flex items-end gap-2 mt-1">
              <span className="text-3xl font-bold text-slate-900">{alBalance}</span>
              <span className="text-sm text-slate-400 mb-1">/ {profile?.al_entitled || 0} days remaining</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-3">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all"
                style={{ width: `${profile ? (profile.al_used / profile.al_entitled) * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">{profile?.al_used || 0} days used</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <p className="text-sm text-slate-500 font-medium">Medical Leave</p>
            <div className="flex items-end gap-2 mt-1">
              <span className="text-3xl font-bold text-slate-900">{mlBalance}</span>
              <span className="text-sm text-slate-400 mb-1">/ {profile?.ml_entitled || 0} days remaining</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-3">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all"
                style={{ width: `${profile ? (profile.ml_used / profile.ml_entitled) * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">{profile?.ml_used || 0} days used</p>
          </div>
        </div>}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1 w-fit">
          {profile?.role !== 'management' && (
            <button
              onClick={() => setTab('my')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'my' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              My Leaves
            </button>
          )}
          {isHrOrMgmt && (
            <button
              onClick={() => setTab('approvals')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'approvals' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              Approvals
            </button>
          )}
          {isHrOrMgmt && (
            <button
              onClick={() => setTab('balances')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'balances' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              Staff Balances
            </button>
          )}
        </div>

        {/* Leave Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-slate-900">Apply for Leave</h2>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Leave Type</label>
                  <select
                    value={formType}
                    onChange={e => setFormType(e.target.value as 'Annual Leave' | 'Medical Leave')}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Annual Leave">Annual Leave</option>
                    <option value="Medical Leave">Medical Leave</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={formStart}
                      onChange={e => setFormStart(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={formEnd}
                      onChange={e => setFormEnd(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                {formStart && formEnd && (() => {
                  const days = calculateDays(formStart, formEnd)
                  const balance = formType === 'Annual Leave' ? alBalance : mlBalance
                  const remaining = balance - days
                  return (
                    <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-between text-sm">
                      <span className="text-slate-500">
                        <span className="font-semibold text-slate-800">{days}</span> working day(s) applied
                      </span>
                      <span className={`font-semibold ${remaining < 0 ? 'text-red-500' : remaining <= 2 ? 'text-amber-500' : 'text-emerald-600'}`}>
                        {remaining < 0 ? `Exceeds by ${Math.abs(remaining)}d` : `${remaining}d left after`}
                      </span>
                    </div>
                  )
                })()}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                  <textarea
                    value={formReason}
                    onChange={e => setFormReason(e.target.value)}
                    placeholder="Reason for leave"
                    required
                    rows={2}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
                {formType === 'Medical Leave' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      MC Receipt <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={e => setFormFile(e.target.files?.[0] || null)}
                      className="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                    />
                  </div>
                )}
                {formError && (
                  <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{formError}</p>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition disabled:opacity-50"
                >
                  {saving ? 'Submitting...' : 'Submit Leave'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Staff Balances Tab — HR + Management only */}
        {tab === 'balances' && (
          <div className="bg-white border border-gray-100 rounded-2xl overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">Name</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">Department</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">AL Remaining</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">AL Used / Entitled</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">ML Remaining</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">ML Used / Entitled</th>
                </tr>
              </thead>
              <tbody>
                {staffProfiles.map(p => {
                  const alRemaining = p.al_entitled - p.al_used
                  const mlRemaining = p.ml_entitled - p.ml_used
                  return (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-slate-900">{p.name}</p>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">{p.department}</td>
                      <td className="px-5 py-3">
                        <span className={`text-sm font-semibold ${alRemaining <= 3 ? 'text-red-500' : 'text-emerald-600'}`}>
                          {alRemaining} days
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-500">
                        {p.al_used} / {p.al_entitled}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-sm font-semibold ${mlRemaining <= 2 ? 'text-red-500' : 'text-emerald-600'}`}>
                          {mlRemaining} days
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-500">
                        {p.ml_used} / {p.ml_entitled}
                      </td>
                    </tr>
                  )
                })}
                {staffProfiles.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">
                      No staff found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Leave Table — My Leaves + Approvals tabs */}
        {tab !== 'balances' && <div className="bg-white border border-gray-100 rounded-2xl overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">Staff</th>
                <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">Type</th>
                <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">Period</th>
                <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">Days</th>
                <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">Reason</th>
                <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">Status</th>
                {tab === 'approvals' && (
                  <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">Action</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredLeaves.map(leave => (
                <tr key={leave.id} className="border-b border-gray-50 hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium text-slate-900">{leave.user_name}</p>
                    <p className="text-xs text-slate-400">{leave.department}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-medium ${
                      leave.type === 'Annual Leave' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {leave.type === 'Annual Leave' ? 'AL' : 'ML'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-600">
                    {new Date(leave.start_date + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}
                    {' - '}
                    {new Date(leave.end_date + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-600">{leave.days}</td>
                  <td className="px-5 py-3">
                    <p className="text-sm text-slate-600 max-w-[200px] truncate">{leave.reason}</p>
                    {leave.receipt_name && (
                      <button
                        onClick={async () => {
                          const { data } = await supabase.storage.from('receipts').createSignedUrl(leave.receipt_path!, 60)
                          if (data?.signedUrl) window.open(data.signedUrl, '_blank')
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-700 font-medium mt-0.5"
                      >
                        View Receipt
                      </button>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      leave.status === 'approved' ? 'bg-green-50 text-green-600' :
                      leave.status === 'rejected' ? 'bg-red-50 text-red-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                    </span>
                    {leave.approved_by && (
                      <p className="text-[10px] text-slate-400 mt-0.5">by {leave.approved_by}</p>
                    )}
                  </td>
                  {tab === 'approvals' && (
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproval(leave, 'approved')}
                          className="px-3 py-1 bg-green-50 text-green-600 text-xs font-semibold rounded-lg hover:bg-green-100 transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleApproval(leave, 'rejected')}
                          className="px-3 py-1 bg-red-50 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-100 transition"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredLeaves.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-sm text-slate-400">
                    No leave records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>}
      </main>
    </div>
  )
}
