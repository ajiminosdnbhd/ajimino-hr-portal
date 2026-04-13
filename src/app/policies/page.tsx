'use client'

import { useEffect, useState } from 'react'
import { useProfile } from '@/lib/useProfile'
import { Policy, DEPARTMENTS } from '@/lib/types'
import Sidebar from '@/components/Sidebar'

export default function PoliciesPage() {
  const { profile, supabase } = useProfile()
  const [policies, setPolicies] = useState<Policy[]>([])
  const [showForm, setShowForm] = useState(false)

  // Form
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formDepts, setFormDepts] = useState<string[]>([])
  const [formFile, setFormFile] = useState<File | null>(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [allDepts, setAllDepts] = useState(true)

  useEffect(() => { if (profile) loadPolicies() }, [profile])

  async function loadPolicies() {
    const { data } = await supabase.from('policies').select('*').order('created_at', { ascending: false })
    if (data && profile) {
      const filtered = data.filter(p =>
        p.target_departments.length === 0 ||
        p.target_departments.includes('All') ||
        p.target_departments.includes(profile.department) ||
        profile.role === 'hr' || profile.role === 'management'
      )
      setPolicies(filtered)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!profile) return
    setSaving(true)

    let attachmentPath = null
    let attachmentName = null

    if (formFile) {
      const filePath = `${Date.now()}-${formFile.name}`
      const { error: uploadError } = await supabase.storage
        .from('policy-attachments')
        .upload(filePath, formFile)
      if (uploadError) {
        setFormError('Failed to upload: ' + uploadError.message)
        setSaving(false)
        return
      }
      attachmentPath = filePath
      attachmentName = formFile.name
    }

    const targetDepartments = allDepts ? ['All'] : formDepts

    const { error } = await supabase.from('policies').insert({
      title: formTitle,
      content: formContent,
      target_departments: targetDepartments,
      attachment_path: attachmentPath,
      attachment_name: attachmentName,
      created_by: profile.name,
    })

    if (error) {
      setFormError(error.message)
    } else {
      setShowForm(false)
      setFormTitle('')
      setFormContent('')
      setFormDepts([])
      setFormFile(null)
      setAllDepts(true)
      loadPolicies()
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('policies').delete().eq('id', id)
    loadPolicies()
  }

  const isHrOrMgmt = profile && (profile.role === 'hr' || profile.role === 'management')

  return (
    <div className="flex min-h-screen">
      <Sidebar profile={profile} />
      <main className="md:ml-[200px] flex-1 p-4 md:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Company Policies</h1>
            <p className="text-slate-500 text-sm mt-1">View and manage company policies</p>
          </div>
          {isHrOrMgmt && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl transition"
            >
              + Publish Policy
            </button>
          )}
        </div>

        {/* Publish Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-slate-900">Publish Policy</h2>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Content</label>
                  <textarea
                    value={formContent}
                    onChange={e => setFormContent(e.target.value)}
                    required
                    rows={4}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Target Departments</label>
                  <label className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={allDepts}
                      onChange={e => setAllDepts(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-slate-600">All Departments</span>
                  </label>
                  {!allDepts && (
                    <div className="flex flex-wrap gap-2">
                      {DEPARTMENTS.map(dept => (
                        <label key={dept} className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={formDepts.includes(dept)}
                            onChange={e => {
                              if (e.target.checked) setFormDepts(d => [...d, dept])
                              else setFormDepts(d => d.filter(x => x !== dept))
                            }}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-slate-600">{dept}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">PDF Attachment (optional)</label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={e => setFormFile(e.target.files?.[0] || null)}
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
                  {saving ? 'Publishing...' : 'Publish Policy'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Policies List */}
        <div className="space-y-4">
          {policies.map(policy => (
            <div key={policy.id} className="bg-white border border-gray-100 rounded-2xl p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-base font-bold text-slate-900">{policy.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400">
                      Published by {policy.created_by} on{' '}
                      {new Date(policy.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-slate-100 rounded-lg text-slate-500">
                      {policy.target_departments.includes('All') ? 'All Departments' : policy.target_departments.join(', ')}
                    </span>
                  </div>
                </div>
                {isHrOrMgmt && (
                  <button
                    onClick={() => handleDelete(policy.id)}
                    className="text-slate-400 hover:text-red-500 transition"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                )}
              </div>
              <p className="text-sm text-slate-600 mt-3 whitespace-pre-wrap">{policy.content}</p>
              {policy.attachment_name && (
                <button
                  onClick={async () => {
                    const { data } = await supabase.storage.from('policy-attachments').createSignedUrl(policy.attachment_path!, 60)
                    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
                  }}
                  className="inline-flex items-center gap-2 mt-3 px-3 py-2 bg-slate-50 rounded-xl text-sm text-indigo-600 font-medium hover:bg-slate-100 transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  {policy.attachment_name}
                </button>
              )}
            </div>
          ))}
          {policies.length === 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
              <p className="text-slate-400">No policies published yet</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
