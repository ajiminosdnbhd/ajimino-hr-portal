'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useProfile } from '@/lib/useProfile'
import { CalendarEvent, Leave, Booking, ROOMS } from '@/lib/types'
import { SELANGOR_HOLIDAYS, isHoliday } from '@/lib/holidays'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const EVENT_COLORS = [
  { value: '#4f46e5', label: 'Indigo' },
  { value: '#059669', label: 'Green' },
  { value: '#d97706', label: 'Amber' },
  { value: '#dc2626', label: 'Red' },
  { value: '#7c3aed', label: 'Purple' },
  { value: '#0891b2', label: 'Cyan' },
]

const TIME_SLOTS = Array.from({ length: 20 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8
  const min = i % 2 === 0 ? '00' : '30'
  return `${String(hour).padStart(2, '0')}:${min}`
})

function formatTime(t: string | null) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

function formatTimeRange(start: string | null, end: string | null) {
  if (!start) return null
  return end ? `${formatTime(start)} – ${formatTime(end)}` : formatTime(start)
}

export default function PlannerPage() {
  const { profile, supabase } = useProfile()
  const [month, setMonth] = useState(new Date().getMonth())
  const [year, setYear] = useState(new Date().getFullYear())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [activeForm, setActiveForm] = useState<'event' | 'booking' | null>(null)

  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])

  // Event form
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [allProfiles, setAllProfiles] = useState<{ id: string; name: string; department: string }[]>([])
  const [formTitle, setFormTitle] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formTime, setFormTime] = useState('')
  const [formEndTime, setFormEndTime] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formColor, setFormColor] = useState('#4f46e5')
  const [formVisibility, setFormVisibility] = useState<'all' | 'department' | 'individual'>('all')
  const [formDept, setFormDept] = useState('')
  const [formUserIds, setFormUserIds] = useState<string[]>([])
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  // Booking form
  const [bkDate, setBkDate] = useState('')
  const [bkRoom, setBkRoom] = useState<string>(ROOMS[0].id)
  const [bkStart, setBkStart] = useState('09:00')
  const [bkEnd, setBkEnd] = useState('10:00')
  const [bkPurpose, setBkPurpose] = useState('')
  const [bkError, setBkError] = useState('')
  const [bkSaving, setBkSaving] = useState(false)

  const isHrOrMgmt = profile && (profile.role === 'hr' || profile.role === 'management')

  useEffect(() => {
    if (profile) {
      loadMonthData()
      if (isHrOrMgmt) {
        supabase.from('profiles').select('id, name, department').order('name')
          .then(({ data }) => { if (data) setAllProfiles(data) })
      }
    }
  }, [profile, month, year])

  async function loadMonthData() {
    if (!profile) return
    const pad = String(month + 1).padStart(2, '0')
    const from = `${year}-${pad}-01`
    const to = `${year}-${pad}-31`

    let evtQ = supabase.from('events').select('*').gte('date', from).lte('date', to).order('date')
    if (!isHrOrMgmt) {
      evtQ = evtQ.or(`visibility.eq.all,and(visibility.eq.department,target_department.eq.${profile.department}),and(visibility.eq.individual,target_user_ids.cs.{${profile.id}})`)
    }
    const { data: evtData } = await evtQ
    if (evtData) setEvents(evtData as CalendarEvent[])

    let leaveQ = supabase.from('leaves').select('*').or(`and(start_date.lte.${to},end_date.gte.${from})`)
    if (!isHrOrMgmt) leaveQ = leaveQ.eq('user_id', profile.id)
    const { data: leaveData } = await leaveQ
    if (leaveData) setLeaves(leaveData)

    let bookQ = supabase.from('bookings').select('*').gte('date', from).lte('date', to)
    if (!isHrOrMgmt) bookQ = bookQ.eq('user_id', profile.id)
    const { data: bookData } = await bookQ
    if (bookData) setBookings(bookData)
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1)
  }

  function getForDate<T extends { date?: string; start_date?: string; end_date?: string }>(
    arr: T[], dateStr: string, dateField: 'date' | 'range'
  ): T[] {
    if (dateField === 'date') return arr.filter((x: T) => (x as { date: string }).date === dateStr)
    return arr.filter(x => (x as { start_date: string }).start_date <= dateStr && (x as { end_date: string }).end_date >= dateStr)
  }

  function canModifyEvent(ev: CalendarEvent) {
    if (!profile) return false
    if (isHrOrMgmt) return true
    if (ev.created_by_role === 'hr' || ev.created_by_role === 'management') return false
    return ev.created_by_id === profile.id
  }

  function getBookingConflicts() {
    return bookings.filter(
      b => b.date === bkDate && b.room_id === bkRoom &&
        b.start_time < bkEnd && b.end_time > bkStart
    )
  }

  // ── Event form helpers ───────────────────────────────────────────────────
  function openAddEvent(date?: string) {
    setEditingEvent(null)
    setFormDate(date || new Date().toISOString().split('T')[0])
    setFormTitle(''); setFormTime(''); setFormEndTime(''); setFormDesc('')
    setFormColor('#4f46e5'); setFormVisibility('all'); setFormDept(''); setFormUserIds([])
    setFormError(''); setActiveForm('event')
  }

  function openEditEvent(ev: CalendarEvent) {
    setEditingEvent(ev)
    setFormTitle(ev.title); setFormDate(ev.date)
    setFormTime(ev.event_time?.slice(0, 5) || '')
    setFormEndTime(ev.event_end_time?.slice(0, 5) || '')
    setFormDesc(ev.description || ''); setFormColor(ev.color)
    setFormVisibility(ev.visibility || 'all')
    setFormDept(ev.target_department || ''); setFormUserIds(ev.target_user_ids || [])
    setFormError(''); setActiveForm('event')
  }

  function closeForm() {
    setActiveForm(null); setEditingEvent(null)
    setFormTitle(''); setFormDate(''); setFormTime(''); setFormEndTime(''); setFormDesc('')
    setFormColor('#4f46e5'); setFormVisibility('all'); setFormDept(''); setFormUserIds([])
    setFormError('')
    setBkError(''); setBkPurpose(''); setBkRoom(ROOMS[0].id); setBkStart('09:00'); setBkEnd('10:00')
  }

  async function handleSubmitEvent(e: React.FormEvent) {
    e.preventDefault(); setFormError(''); setSaving(true)
    if (!profile) return
    const payload = {
      title: formTitle, date: formDate,
      event_time: formTime || null, event_end_time: formEndTime || null,
      description: formDesc || null, color: formColor,
      created_by: profile.name, created_by_id: profile.id, created_by_role: profile.role,
      visibility: formVisibility,
      target_department: formVisibility === 'department' ? formDept : null,
      target_user_ids: formVisibility === 'individual' ? formUserIds : null,
    }
    const res = editingEvent
      ? await supabase.from('events').update(payload).eq('id', editingEvent.id)
      : await supabase.from('events').insert(payload)
    if (res.error) { setFormError(res.error.message); setSaving(false); return }
    closeForm(); loadMonthData(); setSaving(false)
  }

  async function handleDeleteEvent(id: string) {
    await supabase.from('events').delete().eq('id', id)
    loadMonthData()
  }

  // ── Booking form helpers ─────────────────────────────────────────────────
  function openBookingForm(date?: string) {
    setBkDate(date || new Date().toISOString().split('T')[0])
    setBkRoom(ROOMS[0].id); setBkStart('09:00'); setBkEnd('10:00')
    setBkPurpose(''); setBkError(''); setActiveForm('booking')
  }

  async function handleSubmitBooking(e: React.FormEvent) {
    e.preventDefault(); setBkError(''); setBkSaving(true)
    if (!profile) return
    if (bkStart >= bkEnd) { setBkError('End time must be after start time'); setBkSaving(false); return }
    if (getBookingConflicts().length > 0) { setBkError('Time slot conflicts with an existing booking'); setBkSaving(false); return }
    const { error } = await supabase.from('bookings').insert({
      user_id: profile.id, user_name: profile.name, department: profile.department,
      room_id: bkRoom, date: bkDate, start_time: bkStart, end_time: bkEnd, purpose: bkPurpose,
    })
    if (error) { setBkError(error.message); setBkSaving(false); return }
    closeForm(); loadMonthData(); setBkSaving(false)
  }

  async function handleCancelBooking(id: string) {
    await supabase.from('bookings').delete().eq('id', id)
    loadMonthData()
  }

  // ── Leave approval ───────────────────────────────────────────────────────
  async function handleLeaveApproval(leave: Leave, status: 'approved' | 'rejected') {
    if (!profile) return
    await supabase.from('leaves').update({
      status, approved_by: profile.name, approved_at: new Date().toISOString(),
    }).eq('id', leave.id)
    if (status === 'approved') {
      const field = leave.type === 'Annual Leave' ? 'al_used' : 'ml_used'
      const { data: tp } = await supabase.from('profiles').select('*').eq('id', leave.user_id).single()
      if (tp) await supabase.from('profiles').update({ [field]: (leave.type === 'Annual Leave' ? tp.al_used : tp.ml_used) + leave.days }).eq('id', leave.user_id)
    }
    loadMonthData()
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()

  const selEvents = selectedDate ? getForDate(events, selectedDate, 'date') : []
  const selLeaves = selectedDate ? getForDate(leaves, selectedDate, 'range') : []
  const selBookings = selectedDate ? getForDate(bookings, selectedDate, 'date') : []
  const selHoliday = selectedDate ? isHoliday(selectedDate) : undefined

  const monthEvents = events.length
  const monthLeaves = leaves.filter(l => l.status === 'approved').length
  const monthBookings = bookings.length

  const bkConflicts = activeForm === 'booking' ? getBookingConflicts() : []

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Planner</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isHrOrMgmt
              ? `${monthEvents} event(s) · ${monthLeaves} approved leave(s) · ${monthBookings} booking(s) this month`
              : 'Your schedule — events, leaves, and bookings'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isHrOrMgmt && (
            <Link href="/leave"
              className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-xl transition text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              Manage Leaves
            </Link>
          )}
          {profile?.role !== 'management' && (
            <Link href="/leave"
              className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-xl transition text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              Apply Leave
            </Link>
          )}
          {profile && (
            <button onClick={() => openBookingForm()}
              className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-xl transition text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Book Room
            </button>
          )}
          {profile && (
            <button onClick={() => openAddEvent()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl transition text-sm">
              + Add Event
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* Main calendar */}
        <div className="flex-1 bg-white border border-gray-100 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">{MONTHS[month]} {year}</h2>
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg transition">
                <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button onClick={() => { setMonth(new Date().getMonth()); setYear(new Date().getFullYear()) }}
                className="px-3 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition">Today</button>
              <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg transition">
                <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-xs mb-4">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 border border-red-200 inline-block" />Holiday</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />Event</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-100 inline-block" />Approved Leave</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 inline-block" />Pending Leave</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-100 inline-block" />Room Booking</span>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[11px] font-semibold text-slate-400 py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-xl overflow-hidden border border-slate-100">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`e-${i}`} className="bg-slate-50 min-h-[80px] md:min-h-[100px]" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const holiday = isHoliday(dateStr)
              const isToday = dateStr === todayStr
              const isSelected = dateStr === selectedDate
              const isWeekend = new Date(year, month, day).getDay() === 0 || new Date(year, month, day).getDay() === 6
              const dayEvents = getForDate(events, dateStr, 'date')
              const dayLeaves = getForDate(leaves, dateStr, 'range')
              const dayBookings = getForDate(bookings, dateStr, 'date')
              const hasApproved = dayLeaves.some(l => l.status === 'approved')
              const hasPending = dayLeaves.some(l => l.status === 'pending' && !hasApproved)
              const hasBooking = dayBookings.length > 0

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDate(selectedDate === dateStr ? null : dateStr)}
                  className={`bg-white min-h-[80px] md:min-h-[100px] p-1.5 cursor-pointer transition-all
                    ${holiday ? 'bg-red-50' : hasApproved ? 'bg-emerald-50' : hasPending ? 'bg-amber-50' : hasBooking ? 'bg-blue-50' : ''}
                    ${isSelected ? 'ring-2 ring-inset ring-indigo-500' : 'hover:brightness-95'}
                  `}
                >
                  <div className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full
                    ${isToday ? 'bg-indigo-600 text-white' : holiday ? 'text-red-600' : isWeekend ? 'text-slate-400' : 'text-slate-700'}
                  `}>
                    {day}
                  </div>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-1 flex-wrap">
                      {dayEvents.slice(0, 3).map(ev => (
                        <div key={ev.id} className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: ev.color }} />
                      ))}
                      {dayEvents.length > 3 && <span className="text-[9px] text-slate-400">+{dayEvents.length - 3}</span>}
                    </div>
                  )}
                  <div className="space-y-0.5 mt-1">
                    {dayLeaves.slice(0, 2).map(l => (
                      <div key={l.id} className={`text-[9px] font-medium truncate rounded px-1 leading-tight py-0.5 ${
                        l.status === 'approved' ? 'bg-emerald-200 text-emerald-800' :
                        l.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {isHrOrMgmt ? l.user_name.split(' ')[0] : l.type === 'Annual Leave' ? 'AL' : 'ML'}
                      </div>
                    ))}
                    {dayLeaves.length > 2 && <div className="text-[9px] text-slate-400 px-1">+{dayLeaves.length - 2} more</div>}
                  </div>
                  {dayBookings.length > 0 && (
                    <div className="mt-0.5">
                      {dayBookings.slice(0, 1).map(b => (
                        <div key={b.id} className="text-[9px] font-medium truncate rounded px-1 py-0.5 bg-blue-100 text-blue-700 leading-tight">
                          {isHrOrMgmt ? `${b.user_name.split(' ')[0]}: ${ROOMS.find(r => r.id === b.room_id)?.name.split(' ')[0] || b.room_id}` : ROOMS.find(r => r.id === b.room_id)?.name.split(' ')[0] || b.room_id}
                        </div>
                      ))}
                      {dayBookings.length > 1 && <div className="text-[9px] text-slate-400 px-1">+{dayBookings.length - 1}</div>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right panel */}
        <div className="xl:w-80 flex-shrink-0 space-y-4">
          {selectedDate ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                <button onClick={() => setSelectedDate(null)} className="text-slate-400 hover:text-slate-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {selHoliday && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl mb-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-red-700">{selHoliday.name}</p>
                    <p className="text-[10px] text-red-400">Public Holiday</p>
                  </div>
                </div>
              )}

              {selEvents.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Events</p>
                  <div className="space-y-2">
                    {selEvents.map(ev => (
                      <div key={ev.id} className="flex items-start gap-2 p-3 bg-slate-50 rounded-xl">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: ev.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate">{ev.title}</p>
                          {ev.event_time && <p className="text-[10px] text-indigo-600 font-medium">{formatTimeRange(ev.event_time, ev.event_end_time)}</p>}
                          {ev.description && <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{ev.description}</p>}
                          <p className="text-[10px] text-slate-400 mt-0.5">by {ev.created_by}</p>
                        </div>
                        {canModifyEvent(ev) && (
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => openEditEvent(ev)} className="p-1 hover:bg-indigo-50 rounded text-slate-400 hover:text-indigo-600 transition">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={() => handleDeleteEvent(ev.id)} className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-500 transition">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selLeaves.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Leaves</p>
                  <div className="space-y-2">
                    {selLeaves.map(l => (
                      <div key={l.id} className={`p-3 rounded-xl border ${
                        l.status === 'approved' ? 'bg-emerald-50 border-emerald-100' :
                        l.status === 'rejected' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'
                      }`}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold text-slate-900">
                            {isHrOrMgmt ? l.user_name : l.type === 'Annual Leave' ? 'Annual Leave' : 'Medical Leave'}
                          </p>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            l.status === 'approved' ? 'bg-emerald-200 text-emerald-800' :
                            l.status === 'rejected' ? 'bg-red-200 text-red-800' : 'bg-amber-200 text-amber-800'
                          }`}>{l.status}</span>
                        </div>
                        {isHrOrMgmt && <p className="text-[10px] text-slate-500">{l.type} · {l.department}</p>}
                        <p className="text-[10px] text-slate-500">
                          {new Date(l.start_date + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })} –{' '}
                          {new Date(l.end_date + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })} · {l.days} day(s)
                        </p>
                        {l.reason && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{l.reason}</p>}
                        {isHrOrMgmt && l.status === 'pending' && (
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => handleLeaveApproval(l, 'approved')}
                              className="flex-1 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-semibold rounded-lg hover:bg-emerald-200 transition">
                              Approve
                            </button>
                            <button onClick={() => handleLeaveApproval(l, 'rejected')}
                              className="flex-1 py-1 bg-red-100 text-red-600 text-[10px] font-semibold rounded-lg hover:bg-red-200 transition">
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selBookings.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Room Bookings</p>
                  <div className="space-y-2">
                    {selBookings.map(b => {
                      const room = ROOMS.find(r => r.id === b.room_id)
                      return (
                        <div key={b.id} className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-900">{room?.name || b.room_id}</p>
                            {(profile && b.user_id === profile.id) && (
                              <button onClick={() => handleCancelBooking(b.id)}
                                className="text-[10px] text-red-500 hover:text-red-700 font-medium transition">
                                Cancel
                              </button>
                            )}
                          </div>
                          {isHrOrMgmt && <p className="text-[10px] text-slate-500 mt-0.5">{b.user_name} · {b.department}</p>}
                          <p className="text-[10px] text-blue-600 font-medium mt-0.5">
                            {b.start_time.slice(0, 5)} – {b.end_time.slice(0, 5)}
                          </p>
                          {b.purpose && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{b.purpose}</p>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {!selHoliday && selEvents.length === 0 && selLeaves.length === 0 && selBookings.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">Nothing scheduled</p>
              )}

              {profile && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => openAddEvent(selectedDate)}
                    className="flex-1 px-3 py-2 bg-indigo-50 text-indigo-600 text-xs font-semibold rounded-xl hover:bg-indigo-100 transition">
                    + Event
                  </button>
                  <button onClick={() => openBookingForm(selectedDate)}
                    className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 text-xs font-semibold rounded-xl hover:bg-blue-100 transition">
                    + Book Room
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <p className="text-sm font-semibold text-slate-700 mb-1">Select a day</p>
              <p className="text-xs text-slate-400">Click any date to see events, leaves, and bookings.</p>
            </div>
          )}

          {/* Upcoming holidays */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Upcoming Holidays</h3>
            <div className="space-y-2">
              {SELANGOR_HOLIDAYS
                .filter(h => h.date >= new Date().toISOString().split('T')[0])
                .slice(0, 4)
                .map(h => (
                  <div key={h.date + h.name} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                      <span className="text-red-600 text-xs font-bold">{new Date(h.date + 'T00:00:00').getDate()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{h.name}</p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(h.date + 'T00:00:00').toLocaleDateString('en-MY', { weekday: 'short', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Room legend */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Meeting Rooms</h3>
            <div className="space-y-2">
              {ROOMS.map(room => (
                <div key={room.id} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: room.color }} />
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{room.name}</p>
                    <p className="text-[10px] text-slate-400">Capacity: {room.capacity} pax</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Event Form Modal */}
      {activeForm === 'event' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">{editingEvent ? 'Edit Event' : 'Add Event'}</h2>
              <button onClick={closeForm} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmitEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} required
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} required
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Time <span className="text-slate-400 font-normal">(opt)</span></label>
                  <input type="time" value={formTime} onChange={e => setFormTime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Time <span className="text-slate-400 font-normal">(opt)</span></label>
                  <input type="time" value={formEndTime} onChange={e => setFormEndTime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description <span className="text-slate-400 font-normal">(opt)</span></label>
                <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
              {isHrOrMgmt ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Visible To</label>
                  <div className="flex gap-2">
                    {(['all', 'department', 'individual'] as const).map(v => (
                      <button key={v} type="button" onClick={() => { setFormVisibility(v); setFormDept(''); setFormUserIds([]) }}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition ${formVisibility === v ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-gray-200 hover:border-indigo-300'}`}>
                        {v === 'all' ? 'All Staff' : v === 'department' ? 'Department' : 'Individual'}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="px-3 py-2 bg-slate-50 rounded-xl text-xs text-slate-500">
                  Visible to: <span className="font-semibold text-slate-700">All Staff</span>
                </div>
              )}
              {formVisibility === 'department' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                  <select value={formDept} onChange={e => setFormDept(e.target.value)} required
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Choose...</option>
                    {['Management', 'HR', 'Sales', 'Operations', 'Marketing'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              )}
              {formVisibility === 'individual' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Select Staff</label>
                  <div className="border border-gray-200 rounded-xl max-h-40 overflow-y-auto divide-y divide-gray-50">
                    {allProfiles.map(p => (
                      <label key={p.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                        <input type="checkbox" checked={formUserIds.includes(p.id)} onChange={() => setFormUserIds(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])} className="rounded accent-indigo-600" />
                        <div>
                          <p className="text-sm font-medium text-slate-800">{p.name}</p>
                          <p className="text-xs text-slate-400">{p.department}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
                <div className="flex gap-2">
                  {EVENT_COLORS.map(c => (
                    <button key={c.value} type="button" onClick={() => setFormColor(c.value)}
                      className={`w-8 h-8 rounded-full transition ${formColor === c.value ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`}
                      style={{ backgroundColor: c.value }} />
                  ))}
                </div>
              </div>
              {formError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{formError}</p>}
              <button type="submit" disabled={saving || (formVisibility === 'individual' && formUserIds.length === 0)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition disabled:opacity-50">
                {saving ? 'Saving...' : editingEvent ? 'Update Event' : 'Add Event'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Booking Form Modal */}
      {activeForm === 'booking' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">Book a Room</h2>
              <button onClick={closeForm} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmitBooking} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input type="date" value={bkDate} onChange={e => setBkDate(e.target.value)} required
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Room</label>
                <select value={bkRoom} onChange={e => setBkRoom(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {ROOMS.map(r => (
                    <option key={r.id} value={r.id}>{r.name} — capacity {r.capacity} pax</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
                  <select value={bkStart} onChange={e => setBkStart(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                  <select value={bkEnd} onChange={e => setBkEnd(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              {bkConflicts.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-amber-700 mb-1">Conflict with existing booking:</p>
                  {bkConflicts.map(c => (
                    <p key={c.id} className="text-xs text-amber-600">{c.start_time.slice(0,5)}–{c.end_time.slice(0,5)} by {c.user_name} — {c.purpose}</p>
                  ))}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Purpose</label>
                <input type="text" value={bkPurpose} onChange={e => setBkPurpose(e.target.value)} required
                  placeholder="e.g. Team meeting, Client call"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              {bkError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{bkError}</p>}
              <button type="submit" disabled={bkSaving}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition disabled:opacity-50">
                {bkSaving ? 'Booking...' : 'Confirm Booking'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
