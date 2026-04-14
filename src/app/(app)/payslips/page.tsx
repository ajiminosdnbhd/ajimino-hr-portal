'use client'

import { useEffect, useState } from 'react'
import { useProfile } from '@/lib/useProfile'
import { Profile, Payslip } from '@/lib/types'
import { adminRead } from '@/lib/adminRead'
import LoadError from '@/components/LoadError'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function PayslipsPage() {
  const { profile, supabase } = useProfile()
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [allProfiles, setAllProfiles] = useState<Profile[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Form
  const [formUserId, setFormUserId] = useState('')
  const [formMonth, setFormMonth] = useState(new Date().getMonth() + 1)
  const [formYear, setFormYear] = useState(new Date().getFullYear())
  const [formFile, setFormFile] = useState<File | null>(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  // Filter
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())

  useEffect(() => {
    if (profile) {
      loadPayslips()
      if (profile.role === 'hr' || profile.role === 'management') {
        adminRead<Profile>('profiles', { order: { col: 'name' } })
          .then(({ data }) => setAllProfiles(data))
      }
    }
  }, [profile, filterYear])

  async function loadPayslips() {
    if (!profile) return
    const filters = [
      { type: 'eq' as const, col: 'year', val: filterYear },
      ...(profile.role === 'staff' ? [{ type: 'eq' as const, col: 'user_id', val: profile.id }] : []),
    ]
    const { data, error } = await adminRead<Payslip>('payslips', {
      filters,
      order: { col: 'month', asc: false },
    })
    if (error) { setLoadError(error); return }
    setPayslips(data)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!profile || !formFile) return
    setSaving(true)

    const targetProfile = allProfiles.find(p => p.id === formUserId)
    if (!targetProfile) {
      setFormError('Select a staff member')
      setSaving(false)
      return
    }

    const filePath = `${formUserId}/${formYear}-${String(formMonth).padStart(2, '0')}.pdf`
    const { error: uploadError } = await supabase.storage
      .from('payslips')
      .upload(filePath, formFile, { upsert: true })

    if (uploadError) {
      setFormError('Upload failed: ' + uploadError.message)
      setSaving(false)
      return
    }

    // Upsert payslip record
    const { error } = await supabase.from('payslips').upsert({
      user_id: formUserId,
      user_name: targetProfile.name,
      department: targetProfile.department,
      month: formMonth,
      year: formYear,
      file_path: filePath,
      file_name: formFile.name,
      uploaded_by: profile.name,
    }, { onConflict: 'user_id,month,year' })

    if (error) {
      setFormError(error.message)
    } else {
      setShowForm(false)
      setFormFile(null)
      loadPayslips()
    }
    setSaving(false)
  }

  async function handleDownload(payslip: Payslip) {
    const { data } = await supabase.storage.from('payslips').createSignedUrl(payslip.file_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function handleDelete(payslip: Payslip) {
    if (!confirm(`Delete ${MONTH_NAMES[payslip.month - 1]} ${payslip.year} payslip for ${payslip.user_name}? This cannot be undone.`)) return
    await supabase.storage.from('payslips').remove([payslip.file_path])
    await supabase.from('payslips').delete().eq('id', payslip.id)
    loadPayslips()
  }

  const isHrOrMgmt = profile && (profile.role === 'hr' || profile.role === 'management')

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payslips</h1>
          {loadError && <LoadError message={loadError} />}
          <p className="text-slate-500 text-sm mt-1">
            {isHrOrMgmt ? 'Upload and manage staff payslips' : 'View and download your payslips'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <select
            value={filterYear}
            onChange={e => setFilterYear(Number(e.target.value))}
            className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {isHrOrMgmt && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl transition text-sm"
            >
              + Upload Payslip
            </button>
          )}
        </div>
      </div>

      {/* Upload Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">Upload Payslip</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Staff</label>
                <select
                  value={formUserId}
                  onChange={e => setFormUserId(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select staff member</option>
                  {allProfiles.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.department})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Month</label>
                  <select
                    value={formMonth}
                    onChange={e => setFormMonth(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {MONTH_NAMES.map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                  <select
                    value={formYear}
                    onChange={e => setFormYear(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {[2024, 2025, 2026, 2027].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payslip PDF</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={e => setFormFile(e.target.files?.[0] || null)}
                  required
                  className="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                />
              </div>
              {formError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{formError}</p>
              )}
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition disabled:opacity-50"
              >
                {saving ? 'Uploading...' : 'Upload Payslip'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Payslips Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {payslips.map(payslip => (
          <div key={payslip.id} className="bg-white border border-gray-100 rounded-2xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {MONTH_NAMES[payslip.month - 1]} {payslip.year}
                </h3>
                {isHrOrMgmt && (
                  <p className="text-xs text-slate-500 mt-0.5">{payslip.user_name} ({payslip.department})</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleDownload(payslip)}
                  className="p-2 hover:bg-indigo-50 rounded-lg transition text-indigo-600"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </button>
                {isHrOrMgmt && (
                  <button
                    onClick={() => handleDelete(payslip)}
                    className="p-2 hover:bg-red-50 rounded-lg transition text-slate-400 hover:text-red-500"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              {payslip.file_name}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Uploaded by {payslip.uploaded_by}</p>
          </div>
        ))}
        {payslips.length === 0 && (
          <div className="col-span-full bg-white border border-gray-100 rounded-2xl p-12 text-center">
            <p className="text-slate-400">No payslips found for {filterYear}</p>
          </div>
        )}
      </div>
    </>
  )
}
