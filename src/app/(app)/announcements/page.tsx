// Run in Supabase SQL Editor:
// ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
// CREATE TABLE IF NOT EXISTS announcements (
//   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//   title TEXT NOT NULL,
//   content TEXT,
//   attachment_path TEXT,
//   attachment_name TEXT,
//   visibility TEXT NOT NULL DEFAULT 'all',
//   target_departments TEXT[] DEFAULT '{}',
//   target_user_ids TEXT[] DEFAULT '{}',
//   created_by TEXT NOT NULL,
//   created_by_id TEXT NOT NULL,
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
// Also create Supabase storage bucket 'announcements' (public: false)

'use client'

import { useEffect, useState, useRef } from 'react'
import { useProfile } from '@/lib/useProfile'
import { Announcement, Profile, DEPARTMENTS } from '@/lib/types'
import { adminRead } from '@/lib/adminRead'
import LoadError from '@/components/LoadError'

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('60')) return digits
  if (digits.startsWith('0')) return '60' + digits.slice(1)
  return digits
}

export default function AnnouncementsPage() {
  const { profile, supabase } = useProfile()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [whatsappAnn, setWhatsappAnn] = useState<Announcement | null>(null)
  const [allProfiles, setAllProfiles] = useState<Profile[]>([])
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [loadingSignedUrl, setLoadingSignedUrl] = useState(false)

  // Create form state
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formVisibility, setFormVisibility] = useState<'all' | 'department' | 'individual'>('all')
  const [formDepts, setFormDepts] = useState<string[]>([])
  const [formUserIds, setFormUserIds] = useState<string[]>([])
  const [formFile, setFormFile] = useState<File | null>(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isHrOrMgmt = profile && (profile.role === 'hr' || profile.role === 'management')

  useEffect(() => {
    if (profile) {
      loadAnnouncements()
      if (isHrOrMgmt) loadAllProfiles()
    }
  }, [profile])

  async function loadAnnouncements() {
    setLoadError(null)
    const { data, error } = await adminRead<Announcement>('announcements', {
      order: { col: 'created_at', asc: false },
    })
    if (error) { setLoadError(error); return }

    if (!profile) return

    if (isHrOrMgmt) {
      setAnnouncements(data)
    } else {
      // Staff: filter to only announcements targeted to them
      const filtered = data.filter(a => {
        if (a.visibility === 'all') return true
        if (a.visibility === 'department' && a.target_departments.includes(profile.department)) return true
        if (a.visibility === 'individual' && a.target_user_ids.includes(profile.id)) return true
        return false
      })
      setAnnouncements(filtered)
    }
  }

  async function loadAllProfiles() {
    const { data } = await adminRead<Profile>('profiles', { order: { col: 'name' } })
    setAllProfiles(data)
  }

  function resetCreateForm() {
    setFormTitle('')
    setFormContent('')
    setFormVisibility('all')
    setFormDepts([])
    setFormUserIds([])
    setFormFile(null)
    setFormError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setFormError('')
    setSaving(true)

    let attachment_path: string | null = null
    let attachment_name: string | null = null

    if (formFile) {
      const ext = formFile.name.split('.').pop()
      const path = `${profile.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('announcements')
        .upload(path, formFile)
      if (uploadError) {
        setFormError('File upload failed: ' + uploadError.message)
        setSaving(false)
        return
      }
      attachment_path = path
      attachment_name = formFile.name
    }

    const { error } = await supabase.from('announcements').insert({
      title: formTitle,
      content: formContent || null,
      attachment_path,
      attachment_name,
      visibility: formVisibility,
      target_departments: formVisibility === 'department' ? formDepts : [],
      target_user_ids: formVisibility === 'individual' ? formUserIds : [],
      created_by: profile.name,
      created_by_id: profile.id,
    })

    if (error) {
      setFormError(error.message)
    } else {
      setShowCreate(false)
      resetCreateForm()
      loadAnnouncements()
    }
    setSaving(false)
  }

  async function handleDelete(ann: Announcement) {
    if (!confirm('Delete this announcement?')) return
    if (ann.attachment_path) {
      await supabase.storage.from('announcements').remove([ann.attachment_path])
    }
    await supabase.from('announcements').delete().eq('id', ann.id)
    loadAnnouncements()
  }

  async function openWhatsApp(ann: Announcement) {
    setWhatsappAnn(ann)
    setSignedUrl(null)
    if (ann.attachment_path) {
      setLoadingSignedUrl(true)
      const { data } = await supabase.storage
        .from('announcements')
        .createSignedUrl(ann.attachment_path, 3600)
      setSignedUrl(data?.signedUrl ?? null)
      setLoadingSignedUrl(false)
    }
  }

  function getRecipients(ann: Announcement): Profile[] {
    if (!allProfiles.length) return []
    if (ann.visibility === 'all') return allProfiles
    if (ann.visibility === 'department') {
      return allProfiles.filter(p => ann.target_departments.includes(p.department))
    }
    if (ann.visibility === 'individual') {
      return allProfiles.filter(p => ann.target_user_ids.includes(p.id))
    }
    return []
  }

  function buildMessage(ann: Announcement, url: string | null): string {
    const lines = [`📢 ${ann.title}`, '', ann.content || '', '', 'From: AJIMINO HR']
    if (url) lines.push('', `Document: ${url}`)
    return lines.join('\n')
  }

  function openWa(phone: string, msg: string) {
    const formatted = formatPhone(phone)
    const encoded = encodeURIComponent(msg)
    window.open(`https://wa.me/${formatted}?text=${encoded}`, '_blank')
  }

  async function sendToAll(ann: Announcement) {
    const recipients = getRecipients(ann).filter(r => r.phone)
    const msg = buildMessage(ann, signedUrl)
    for (let i = 0; i < recipients.length; i++) {
      setTimeout(() => {
        if (recipients[i].phone) openWa(recipients[i].phone!, msg)
      }, i * 300)
    }
  }

  function toggleDept(dept: string) {
    setFormDepts(prev =>
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    )
  }

  function toggleUser(id: string) {
    setFormUserIds(prev =>
      prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]
    )
  }

  async function downloadAttachment(ann: Announcement) {
    if (!ann.attachment_path) return
    const { data } = await supabase.storage
      .from('announcements')
      .createSignedUrl(ann.attachment_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Announcements</h1>
          {loadError && <LoadError message={loadError} />}
          <p className="text-slate-500 text-sm mt-1">Company-wide announcements and notices</p>
        </div>
        {isHrOrMgmt && (
          <button
            onClick={() => { resetCreateForm(); setShowCreate(true) }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl transition text-sm"
          >
            + New Announcement
          </button>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">New Announcement</h2>
              <button
                onClick={() => { setShowCreate(false); resetCreateForm() }}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  required
                  placeholder="Announcement title"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Content <span className="text-slate-400 font-normal">(optional)</span></label>
                <textarea
                  value={formContent}
                  onChange={e => setFormContent(e.target.value)}
                  rows={4}
                  placeholder="Announcement details..."
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Attachment (PDF) <span className="text-slate-400 font-normal">(optional)</span></label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={e => setFormFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Visibility</label>
                <div className="flex gap-3 flex-wrap">
                  {(['all', 'department', 'individual'] as const).map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setFormVisibility(v)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        formVisibility === v
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {v === 'all' ? 'Everyone' : v === 'department' ? 'By Department' : 'Specific People'}
                    </button>
                  ))}
                </div>
              </div>

              {formVisibility === 'department' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Select Departments</label>
                  <div className="space-y-2">
                    {DEPARTMENTS.map(dept => (
                      <label key={dept} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formDepts.includes(dept)}
                          onChange={() => toggleDept(dept)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-slate-700">{dept}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {formVisibility === 'individual' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Select Recipients</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-100 rounded-xl p-3">
                    {allProfiles.map(p => (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formUserIds.includes(p.id)}
                          onChange={() => toggleUser(p.id)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-slate-700">{p.name}</span>
                        <span className="text-xs text-slate-400">{p.department}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {formError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{formError}</p>
              )}
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition disabled:opacity-50 text-sm"
              >
                {saving ? 'Publishing...' : 'Publish Announcement'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {whatsappAnn && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">Send via WhatsApp</h2>
              <button
                onClick={() => setWhatsappAnn(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <p className="font-semibold text-sm text-slate-800">{whatsappAnn.title}</p>
              {whatsappAnn.content && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-3">{whatsappAnn.content}</p>
              )}
              {loadingSignedUrl && (
                <p className="text-xs text-slate-400 mt-1">Generating document link...</p>
              )}
              {signedUrl && (
                <p className="text-xs text-indigo-500 mt-1 truncate">Document link ready</p>
              )}
            </div>

            {(() => {
              const recipients = getRecipients(whatsappAnn)
              const withPhone = recipients.filter(r => r.phone)
              const msg = buildMessage(whatsappAnn, signedUrl)
              return (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-slate-700">
                      Recipients ({recipients.length})
                    </p>
                    {withPhone.length > 0 && (
                      <button
                        onClick={() => sendToAll(whatsappAnn)}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
                      >
                        Send to All ({withPhone.length})
                      </button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {recipients.length === 0 && (
                      <p className="text-sm text-slate-400 text-center py-4">No recipients found</p>
                    )}
                    {recipients.map(r => (
                      <div key={r.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{r.name}</p>
                          {r.phone ? (
                            <p className="text-xs text-slate-500">{r.phone}</p>
                          ) : (
                            <p className="text-xs text-slate-400">No phone registered</p>
                          )}
                        </div>
                        <button
                          disabled={!r.phone}
                          onClick={() => r.phone && openWa(r.phone, msg)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                            r.phone
                              ? 'bg-green-50 text-green-700 hover:bg-green-100'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                            <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.932.535 3.736 1.464 5.279L2.05 21.95l4.74-1.424A9.952 9.952 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.938 7.938 0 01-4.045-1.107l-.292-.174-2.815.847.847-2.814-.189-.302A7.954 7.954 0 014 12c0-4.418 3.582-8 8-8s8 3.582 8 8-3.582 8-8 8z"/>
                          </svg>
                          {r.phone ? 'Open WhatsApp' : 'No phone'}
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Announcements List */}
      {announcements.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          </div>
          <p className="text-slate-500 text-sm">No announcements yet</p>
          {isHrOrMgmt && (
            <p className="text-slate-400 text-xs mt-1">Create the first one above</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map(ann => (
            <div key={ann.id} className="bg-white border border-gray-100 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900 text-base">{ann.title}</h3>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      ann.visibility === 'all'
                        ? 'bg-green-50 text-green-700'
                        : ann.visibility === 'department'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-purple-50 text-purple-700'
                    }`}>
                      {ann.visibility === 'all' ? 'Everyone' :
                       ann.visibility === 'department' ? ann.target_departments.join(', ') :
                       'Specific People'}
                    </span>
                  </div>
                  {isHrOrMgmt && (
                    <p className="text-xs text-slate-400 mt-0.5">By {ann.created_by}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(ann.created_at).toLocaleDateString('en-MY', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                  {ann.content && (
                    <p className="text-sm text-slate-600 mt-2 whitespace-pre-line line-clamp-3">{ann.content}</p>
                  )}
                  {ann.attachment_name && (
                    <button
                      onClick={() => downloadAttachment(ann)}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {ann.attachment_name}
                    </button>
                  )}
                </div>
                {isHrOrMgmt && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => openWhatsApp(ann)}
                      className="p-2 hover:bg-green-50 rounded-lg transition text-slate-400 hover:text-green-600"
                      title="Send via WhatsApp"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.932.535 3.736 1.464 5.279L2.05 21.95l4.74-1.424A9.952 9.952 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.938 7.938 0 01-4.045-1.107l-.292-.174-2.815.847.847-2.814-.189-.302A7.954 7.954 0 014 12c0-4.418 3.582-8 8-8s8 3.582 8 8-3.582 8-8 8z"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(ann)}
                      className="p-2 hover:bg-red-50 rounded-lg transition text-slate-400 hover:text-red-500"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
