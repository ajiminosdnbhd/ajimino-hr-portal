'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useProfile } from '@/lib/useProfile'
import { Leave, Profile } from '@/lib/types'
import { adminRead } from '@/lib/adminRead'
import LoadError from '@/components/LoadError'

async function exportLeavesPDF(leaves: Leave[], staffProfiles: Profile[], title: string) {
  try {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF({ orientation: 'landscape' })
    const now = new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })
    doc.setFontSize(16); doc.setTextColor(10, 17, 40)
    doc.text('AJIMINO SDN. BHD.', 14, 16)
    doc.setFontSize(11); doc.setTextColor(80, 80, 80)
    doc.text(title, 14, 23)
    doc.setFontSize(9)
    doc.text(`Generated: ${now}`, 14, 29)
    autoTable(doc, {
      startY: 34,
      head: [['Staff Name', 'Department', 'Type', 'Start Date', 'End Date', 'Days', 'Reason', 'Status', 'Approved By']],
      body: leaves.map(l => [
        l.user_name, l.department,
        l.type === 'Annual Leave' ? 'AL' : 'ML',
        new Date(l.start_date + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }),
        new Date(l.end_date + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }),
        l.days.toString(), l.reason,
        l.status.charAt(0).toUpperCase() + l.status.slice(1),
        l.approved_by || '-',
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [10, 17, 40], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 249, 251] },
      columnStyles: { 6: { cellWidth: 40 } },
    })
    if (staffProfiles.length > 0) {
      const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
      doc.setFontSize(12); doc.setTextColor(10, 17, 40)
      doc.text('Staff Leave Balance Summary', 14, finalY)
      autoTable(doc, {
        startY: finalY + 4,
        head: [['Name', 'Department', 'AL Entitled', 'AL Used', 'AL Remaining', 'ML Entitled', 'ML Used', 'ML Remaining']],
        body: staffProfiles.map(p => [
          p.name, p.department,
          p.al_entitled.toString(), p.al_used.toString(), (p.al_entitled - p.al_used).toString(),
          p.ml_entitled.toString(), p.ml_used.toString(), (p.ml_entitled - p.ml_used).toString(),
        ]),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [67, 56, 202], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 249, 251] },
      })
    }
    doc.save(`Leave_Report_${new Date().toISOString().split('T')[0]}.pdf`)
  } catch (err) {
    console.error('PDF export error:', err)
    alert('PDF export failed. Please try again.')
  }
}

function statusBadge(status: Leave['status']) {
  switch (status) {
    case 'approved':               return 'bg-green-50 text-green-600'
    case 'rejected':               return 'bg-red-50 text-red-600'
    case 'cancelled':              return 'bg-slate-100 text-slate-500'
    case 'cancellation_requested': return 'bg-orange-50 text-orange-600'
    default:                       return 'bg-amber-50 text-amber-600' // pending
  }
}

function statusLabel(status: Leave['status']) {
  switch (status) {
    case 'cancellation_requested': return 'Cancel Requested'
    case 'cancelled':              return 'Cancelled'
    default: return status.charAt(0).toUpperCase() + status.slice(1)
  }
}

export default function LeavePage() {
  const { profile, supabase, setProfile } = useProfile()
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [tab, setTab] = useState<'my' | 'approvals' | 'balances'>('my')
  const [staffProfiles, setStaffProfiles] = useState<Profile[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Leave application form state
  const [formType, setFormType] = useState<'Annual Leave' | 'Medical Leave'>('Annual Leave')
  const [formStart, setFormStart] = useState('')
  const [formEnd, setFormEnd] = useState('')
  const [formReason, setFormReason] = useState('')
  const [formFile, setFormFile] = useState<File | null>(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  // Cancellation request state
  const [cancellingLeave, setCancellingLeave] = useState<Leave | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelError, setCancelError] = useState('')
  const [cancelSaving, setCancelSaving] = useState(false)

  const isHrOrMgmt = profile && (profile.role === 'hr' || profile.role === 'management')

  useEffect(() => {
    if (profile?.role === 'management') setTab('approvals')
  }, [profile?.role])

  useEffect(() => {
    if (profile) {
      loadLeaves()
      if (isHrOrMgmt) {
        adminRead<Profile>('profiles', {
          filters: [{ type: 'neq', col: 'role', val: 'management' }],
          order: { col: 'name' },
        }).then(({ data }) => setStaffProfiles(data))
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  async function loadLeaves() {
    if (!profile) return
    setLoadError(null)
    setLoading(true)
    // HR/Management load all leaves so the approval badge count is always accurate
    // regardless of which tab they are on. Staff only load their own leaves.
    const filters = isHrOrMgmt ? [] : [{ type: 'eq' as const, col: 'user_id', val: profile.id }]
    const { data, error } = await adminRead<Leave>('leaves', {
      filters,
      order: { col: 'created_at', asc: false },
    })
    setLoading(false)
    if (error) { setLoadError(error); return }
    setLeaves(data)
  }

  function calculateDays(start: string, end: string): number {
    if (!start || !end) return 0
    const s = new Date(start), e = new Date(end)
    let count = 0
    const cur = new Date(s)
    while (cur <= e) {
      const d = cur.getDay()
      if (d !== 0 && d !== 6) count++
      cur.setDate(cur.getDate() + 1)
    }
    return count
  }

  function canApprove(leave: Leave): boolean {
    if (!profile) return false
    if (leave.department === 'Management') return false
    if (leave.department === 'HR') return profile.role === 'management'
    return profile.role === 'hr' || profile.role === 'management'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!profile) return
    if (formEnd < formStart) { setFormError('End date cannot be before start date'); return }
    const days = calculateDays(formStart, formEnd)
    if (days <= 0) { setFormError('No working days in selected range (weekends only?)'); return }
    if (formType === 'Annual Leave' && (profile.al_used + days) > profile.al_entitled) {
      setFormError(`Insufficient AL. Available: ${profile.al_entitled - profile.al_used} days`); return
    }
    if (formType === 'Medical Leave' && (profile.ml_used + days) > profile.ml_entitled) {
      setFormError(`Insufficient ML. Available: ${profile.ml_entitled - profile.ml_used} days`); return
    }
    if (formType === 'Medical Leave' && !formFile) {
      setFormError('Medical Leave requires a receipt/MC upload'); return
    }
    setSaving(true)
    let receiptPath = null, receiptName = null
    if (formFile) {
      const ext = formFile.name.split('.').pop()
      const filePath = `${profile.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('receipts').upload(filePath, formFile)
      if (uploadError) { setFormError('Failed to upload receipt: ' + uploadError.message); setSaving(false); return }
      receiptPath = filePath; receiptName = formFile.name
    }
    const isManagement = profile.role === 'management'
    const { error } = await supabase.from('leaves').insert({
      user_id: profile.id, user_name: profile.name, department: profile.department,
      type: formType, start_date: formStart, end_date: formEnd, days, reason: formReason,
      status: isManagement ? 'approved' : 'pending',
      receipt_path: receiptPath, receipt_name: receiptName,
      approved_by: isManagement ? 'Auto (Management)' : null,
      approved_at: isManagement ? new Date().toISOString() : null,
      cancellation_reason: null,
    })
    if (error) { setFormError(error.message) } else {
      if (isManagement) {
        const field = formType === 'Annual Leave' ? 'al_used' : 'ml_used'
        await supabase.from('profiles').update({ [field]: (formType === 'Annual Leave' ? profile.al_used : profile.ml_used) + days }).eq('id', profile.id)
      }
      setShowForm(false); setFormType('Annual Leave'); setFormStart(''); setFormEnd(''); setFormReason(''); setFormFile(null)
      const { data: profData } = await adminRead<Profile>('profiles', { filters: [{ type: 'eq', col: 'id', val: profile.id }] })
      if (profData[0]) setProfile(profData[0])
      loadLeaves()
    }
    setSaving(false)
  }

  // Staff requests cancellation of their own leave
  async function handleRequestCancellation(e: React.FormEvent) {
    e.preventDefault()
    if (!cancellingLeave || !profile) return
    setCancelError('')
    setCancelSaving(true)
    const { error } = await supabase.from('leaves').update({
      status: 'cancellation_requested',
      cancellation_reason: cancelReason || null,
    }).eq('id', cancellingLeave.id)
    if (error) {
      setCancelError(error.message)
    } else {
      setCancellingLeave(null)
      setCancelReason('')
      loadLeaves()
    }
    setCancelSaving(false)
  }

  // HR/Mgmt approves or rejects a leave application (pending → approved/rejected)
  async function handleApproval(leave: Leave, status: 'approved' | 'rejected') {
    if (!profile) return
    const { error } = await supabase.from('leaves').update({
      status, approved_by: profile.name, approved_at: new Date().toISOString(),
      remarks: status === 'rejected' ? 'Rejected by ' + profile.name : null,
    }).eq('id', leave.id)
    if (error) { setLoadError('Failed to update leave status: ' + error.message); return }
    if (status === 'approved') {
      const field = leave.type === 'Annual Leave' ? 'al_used' : 'ml_used'
      const { data: tpData } = await adminRead<Profile>('profiles', { filters: [{ type: 'eq', col: 'id', val: leave.user_id }] })
      const tp = tpData[0]
      if (tp) {
        const { error: balErr } = await supabase.from('profiles').update({
          [field]: (leave.type === 'Annual Leave' ? tp.al_used : tp.ml_used) + leave.days
        }).eq('id', leave.user_id)
        if (balErr) setLoadError('Leave approved but balance update failed — please adjust manually.')
      }
    }
    loadLeaves()
  }

  // HR/Mgmt approves or rejects a cancellation request
  async function handleCancellationApproval(leave: Leave, action: 'approve' | 'reject') {
    if (!profile) return
    if (action === 'approve') {
      const { error } = await supabase.from('leaves').update({ status: 'cancelled' }).eq('id', leave.id)
      if (error) { setLoadError('Failed to cancel leave: ' + error.message); return }
      // Only decrement balance if the leave had been approved previously (approved_by is set)
      if (leave.approved_by) {
        const field = leave.type === 'Annual Leave' ? 'al_used' : 'ml_used'
        const { data: tpData } = await adminRead<Profile>('profiles', { filters: [{ type: 'eq', col: 'id', val: leave.user_id }] })
        const tp = tpData[0]
        if (tp) {
          const current = leave.type === 'Annual Leave' ? tp.al_used : tp.ml_used
          const { error: balErr } = await supabase.from('profiles').update({
            [field]: Math.max(0, current - leave.days)
          }).eq('id', leave.user_id)
          if (balErr) setLoadError('Cancellation approved but balance update failed — please adjust manually.')
        }
      }
    } else {
      const restored = leave.approved_by ? 'approved' : 'pending'
      const { error } = await supabase.from('leaves').update({ status: restored, cancellation_reason: null }).eq('id', leave.id)
      if (error) { setLoadError('Failed to reject cancellation: ' + error.message); return }
    }
    loadLeaves()
  }

  const alBalance = profile ? profile.al_entitled - profile.al_used : 0
  const mlBalance = profile ? profile.ml_entitled - profile.ml_used : 0

  // Approvals tab: pending leaves + cancellation requests
  // My tab: HR/Mgmt may have all leaves loaded, so filter to current user's leaves
  const filteredLeaves = tab === 'approvals'
    ? leaves.filter(l => (l.status === 'pending' || l.status === 'cancellation_requested') && canApprove(l))
    : tab === 'my'
    ? leaves.filter(l => l.user_id === profile?.id)
    : leaves

  const approvalCount = leaves.filter(l => (l.status === 'pending' || l.status === 'cancellation_requested') && canApprove(l)).length

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leave Management</h1>
          {loadError && <LoadError message={loadError} />}
          <p className="text-slate-500 text-sm mt-1">Apply for leave and track balances</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/calendar"
            className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-xl transition text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            View Calendar
          </Link>
          {isHrOrMgmt && (
            <button onClick={() => exportLeavesPDF(leaves, staffProfiles, 'Leave Report — All Staff')}
              className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-xl transition text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Export PDF
            </button>
          )}
          {profile?.role !== 'management' && (
            <button onClick={() => setShowForm(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl transition">
              + Apply Leave
            </button>
          )}
        </div>
      </div>

      {/* Leave balance cards */}
      {profile?.role !== 'management' && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <p className="text-sm text-slate-500 font-medium">Annual Leave</p>
            <div className="flex items-end gap-2 mt-1">
              <span className="text-3xl font-bold text-slate-900">{alBalance}</span>
              <span className="text-sm text-slate-400 mb-1">/ {profile?.al_entitled || 0} days</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
              <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${profile ? Math.min((profile.al_used / profile.al_entitled) * 100, 100) : 0}%` }} />
            </div>
            <p className="text-xs text-slate-400 mt-1">{profile?.al_used || 0} used</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <p className="text-sm text-slate-500 font-medium">Medical Leave</p>
            <div className="flex items-end gap-2 mt-1">
              <span className="text-3xl font-bold text-slate-900">{mlBalance}</span>
              <span className="text-sm text-slate-400 mb-1">/ {profile?.ml_entitled || 0} days</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${profile ? Math.min((profile.ml_used / profile.ml_entitled) * 100, 100) : 0}%` }} />
            </div>
            <p className="text-xs text-slate-400 mt-1">{profile?.ml_used || 0} used</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1 w-fit">
        {profile?.role !== 'management' && (
          <button onClick={() => setTab('my')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'my' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
            My Leaves
          </button>
        )}
        {isHrOrMgmt && (
          <button onClick={() => setTab('approvals')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition relative ${tab === 'approvals' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
            Approvals
            {approvalCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {approvalCount > 9 ? '9+' : approvalCount}
              </span>
            )}
          </button>
        )}
        {isHrOrMgmt && (
          <button onClick={() => setTab('balances')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === 'balances' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
            Staff Balances
          </button>
        )}
      </div>

      {/* Leave application form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">Apply for Leave</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Leave Type</label>
                <select value={formType} onChange={e => setFormType(e.target.value as 'Annual Leave' | 'Medical Leave')}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="Annual Leave">Annual Leave</option>
                  <option value="Medical Leave">Medical Leave</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                  <input type="date" value={formStart} onChange={e => setFormStart(e.target.value)} required
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                  <input type="date" value={formEnd} onChange={e => setFormEnd(e.target.value)} required
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              {formStart && formEnd && (() => {
                const days = calculateDays(formStart, formEnd)
                const balance = formType === 'Annual Leave' ? alBalance : mlBalance
                const remaining = balance - days
                return (
                  <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-between text-sm">
                    <span className="text-slate-500"><span className="font-semibold text-slate-800">{days}</span> working day(s)</span>
                    <span className={`font-semibold ${remaining < 0 ? 'text-red-500' : remaining <= 2 ? 'text-amber-500' : 'text-emerald-600'}`}>
                      {remaining < 0 ? `Exceeds by ${Math.abs(remaining)}d` : `${remaining}d left after`}
                    </span>
                  </div>
                )
              })()}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                <textarea value={formReason} onChange={e => setFormReason(e.target.value)} required rows={2}
                  placeholder="Reason for leave"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
              {formType === 'Medical Leave' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">MC Receipt <span className="text-red-500">*</span></label>
                  <input type="file" accept="image/*,.pdf" onChange={e => setFormFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100" />
                </div>
              )}
              {formError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{formError}</p>}
              <button type="submit" disabled={saving}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition disabled:opacity-50">
                {saving ? 'Submitting...' : 'Submit Leave'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Cancellation request modal */}
      {cancellingLeave && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Request Leave Cancellation</h2>
              <button onClick={() => { setCancellingLeave(null); setCancelReason(''); setCancelError('') }} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4">
              <p className="text-sm font-semibold text-slate-800">{cancellingLeave.type}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {new Date(cancellingLeave.start_date + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })} –{' '}
                {new Date(cancellingLeave.end_date + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })} · {cancellingLeave.days} day(s)
              </p>
            </div>
            <p className="text-xs text-slate-500 mb-4">Your cancellation request will be reviewed by HR or Management. Your leave will remain active until approved.</p>
            <form onSubmit={handleRequestCancellation} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason for cancellation <span className="text-slate-400">(optional)</span></label>
                <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} rows={2}
                  placeholder="Why are you cancelling this leave?"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
              {cancelError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{cancelError}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => { setCancellingLeave(null); setCancelReason(''); setCancelError('') }}
                  className="flex-1 py-2.5 border border-gray-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition">
                  Back
                </button>
                <button type="submit" disabled={cancelSaving}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl transition disabled:opacity-50">
                  {cancelSaving ? 'Submitting...' : 'Request Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Balances */}
      {tab === 'balances' && (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">Name</th>
                <th className="text-left text-xs font-medium text-slate-400 px-5 py-3 hidden sm:table-cell">Department</th>
                <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">AL Left</th>
                <th className="text-left text-xs font-medium text-slate-400 px-5 py-3 hidden md:table-cell">AL Used/Total</th>
                <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">ML Left</th>
                <th className="text-left text-xs font-medium text-slate-400 px-5 py-3 hidden md:table-cell">ML Used/Total</th>
              </tr>
            </thead>
            <tbody>
              {staffProfiles.map(p => {
                const alR = p.al_entitled - p.al_used, mlR = p.ml_entitled - p.ml_used
                return (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-400 sm:hidden">{p.department}</p>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600 hidden sm:table-cell">{p.department}</td>
                    <td className="px-5 py-3"><span className={`text-sm font-semibold ${alR <= 3 ? 'text-red-500' : 'text-emerald-600'}`}>{alR}d</span></td>
                    <td className="px-5 py-3 text-sm text-slate-500 hidden md:table-cell">{p.al_used} / {p.al_entitled}</td>
                    <td className="px-5 py-3"><span className={`text-sm font-semibold ${mlR <= 2 ? 'text-red-500' : 'text-emerald-600'}`}>{mlR}d</span></td>
                    <td className="px-5 py-3 text-sm text-slate-500 hidden md:table-cell">{p.ml_used} / {p.ml_entitled}</td>
                  </tr>
                )
              })}
              {staffProfiles.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">No staff found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Leave list — card layout on mobile, table on md+ */}
      {tab !== 'balances' && loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 animate-pulse">
              <div className="h-4 bg-slate-100 rounded-lg w-1/3 mb-3" />
              <div className="h-3 bg-slate-100 rounded-lg w-2/3 mb-2" />
              <div className="h-3 bg-slate-100 rounded-lg w-1/2" />
            </div>
          ))}
        </div>
      )}
      {tab !== 'balances' && !loading && (
        <>
          {/* Mobile card layout */}
          <div className="md:hidden space-y-3">
            {filteredLeaves.map(leave => (
              <div key={leave.id} className="bg-white border border-gray-100 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    {tab === 'approvals' && (
                      <p className="text-sm font-semibold text-slate-900">{leave.user_name}</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-medium ${leave.type === 'Annual Leave' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {leave.type === 'Annual Leave' ? 'AL' : 'ML'}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(leave.start_date + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}
                        {' – '}
                        {new Date(leave.end_date + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' · '}{leave.days}d
                      </span>
                    </div>
                  </div>
                  <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0 ${statusBadge(leave.status)}`}>
                    {statusLabel(leave.status)}
                  </span>
                </div>
                {leave.reason && <p className="text-xs text-slate-500 mb-1 line-clamp-2">{leave.reason}</p>}
                {leave.cancellation_reason && (
                  <p className="text-xs text-orange-500 mb-1">Cancel: {leave.cancellation_reason}</p>
                )}
                {leave.receipt_name && (
                  <button onClick={async () => {
                    try {
                      const { data, error } = await supabase.storage.from('receipts').createSignedUrl(leave.receipt_path!, 60)
                      if (error) throw error
                      if (data?.signedUrl) window.open(data.signedUrl, '_blank')
                    } catch { alert('Could not open receipt. Please try again.') }
                  }} className="text-xs text-indigo-600 font-medium mb-2 block">View Receipt</button>
                )}
                <div className="flex gap-2 flex-wrap mt-2">
                  {tab === 'my' && profile && leave.user_id === profile.id &&
                    (leave.status === 'pending' || leave.status === 'approved') && (
                    <button onClick={() => { setCancellingLeave(leave); setCancelReason(''); setCancelError('') }}
                      className="px-3 py-1.5 bg-orange-50 text-orange-600 text-xs font-semibold rounded-lg hover:bg-orange-100 transition">
                      Request Cancel
                    </button>
                  )}
                  {tab === 'approvals' && leave.status === 'pending' && (
                    <>
                      <button onClick={() => handleApproval(leave, 'approved')}
                        className="flex-1 py-1.5 bg-green-50 text-green-600 text-xs font-semibold rounded-lg hover:bg-green-100 transition">Approve</button>
                      <button onClick={() => handleApproval(leave, 'rejected')}
                        className="flex-1 py-1.5 bg-red-50 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-100 transition">Reject</button>
                    </>
                  )}
                  {tab === 'approvals' && leave.status === 'cancellation_requested' && (
                    <>
                      <button onClick={() => handleCancellationApproval(leave, 'approve')}
                        className="flex-1 py-1.5 bg-orange-50 text-orange-600 text-xs font-semibold rounded-lg hover:bg-orange-100 transition">Approve Cancel</button>
                      <button onClick={() => handleCancellationApproval(leave, 'reject')}
                        className="flex-1 py-1.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-200 transition">Keep Leave</button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {filteredLeaves.length === 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl px-5 py-8 text-center text-sm text-slate-400">No leave records found</div>
            )}
          </div>

          {/* Desktop table layout */}
          <div className="hidden md:block bg-white border border-gray-100 rounded-2xl overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">Staff</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">Type</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">Period</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">Days</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">Reason</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-slate-400 px-5 py-3">Action</th>
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
                      <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-medium ${leave.type === 'Annual Leave' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {leave.type === 'Annual Leave' ? 'AL' : 'ML'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">
                      {new Date(leave.start_date + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}
                      {' – '}
                      {new Date(leave.end_date + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">{leave.days}</td>
                    <td className="px-5 py-3">
                      <p className="text-sm text-slate-600 max-w-[180px] truncate">{leave.reason}</p>
                      {leave.cancellation_reason && (
                        <p className="text-xs text-orange-500 mt-0.5 max-w-[180px] truncate">Cancel: {leave.cancellation_reason}</p>
                      )}
                      {leave.receipt_name && (
                        <button onClick={async () => {
                          const { data } = await supabase.storage.from('receipts').createSignedUrl(leave.receipt_path!, 60)
                          if (data?.signedUrl) window.open(data.signedUrl, '_blank')
                        }} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium mt-0.5">
                          View Receipt
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${statusBadge(leave.status)}`}>
                        {statusLabel(leave.status)}
                      </span>
                      {leave.approved_by && leave.status !== 'cancellation_requested' && (
                        <p className="text-[10px] text-slate-400 mt-0.5">by {leave.approved_by}</p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {tab === 'my' && profile && leave.user_id === profile.id &&
                        (leave.status === 'pending' || leave.status === 'approved') && (
                        <button onClick={() => { setCancellingLeave(leave); setCancelReason(''); setCancelError('') }}
                          className="px-3 py-1 bg-orange-50 text-orange-600 text-xs font-semibold rounded-lg hover:bg-orange-100 transition whitespace-nowrap">
                          Request Cancel
                        </button>
                      )}
                      {tab === 'approvals' && leave.status === 'pending' && (
                        <div className="flex gap-2">
                          <button onClick={() => handleApproval(leave, 'approved')}
                            className="px-3 py-1 bg-green-50 text-green-600 text-xs font-semibold rounded-lg hover:bg-green-100 transition">Approve</button>
                          <button onClick={() => handleApproval(leave, 'rejected')}
                            className="px-3 py-1 bg-red-50 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-100 transition">Reject</button>
                        </div>
                      )}
                      {tab === 'approvals' && leave.status === 'cancellation_requested' && (
                        <div className="flex gap-2">
                          <button onClick={() => handleCancellationApproval(leave, 'approve')}
                            className="px-3 py-1 bg-orange-50 text-orange-600 text-xs font-semibold rounded-lg hover:bg-orange-100 transition whitespace-nowrap">Approve Cancel</button>
                          <button onClick={() => handleCancellationApproval(leave, 'reject')}
                            className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-200 transition whitespace-nowrap">Keep Leave</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredLeaves.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-slate-400">No leave records found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}
