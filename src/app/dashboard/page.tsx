'use client'

import { useEffect, useState } from 'react'
import { useProfile } from '@/lib/useProfile'
import { SELANGOR_HOLIDAYS, isHoliday } from '@/lib/holidays'
import Sidebar from '@/components/Sidebar'
import StatsCard from '@/components/StatsCard'

interface CalendarEvent {
  id: string
  title: string
  date: string
  event_time: string | null
  description: string | null
  color: string
  created_by: string
  created_at: string
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const EVENT_COLORS = [
  { value: '#4f46e5', label: 'Indigo' },
  { value: '#059669', label: 'Green' },
  { value: '#d97706', label: 'Amber' },
  { value: '#dc2626', label: 'Red' },
  { value: '#7c3aed', label: 'Purple' },
  { value: '#0891b2', label: 'Cyan' },
]

export default function DashboardPage() {
  const { profile, supabase } = useProfile()
  const [stats, setStats] = useState({ staff: 0, pendingLeave: 0, todayBookings: 0, policies: 0 })
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear())
  const [hoveredDay, setHoveredDay] = useState<string | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showEventForm, setShowEventForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)

  // Form
  const [formTitle, setFormTitle] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formTime, setFormTime] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formColor, setFormColor] = useState('#4f46e5')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadStats()
  }, [])

  useEffect(() => {
    loadEvents()
  }, [calendarYear])

  async function loadStats() {
    const [staffRes, leaveRes, bookingRes, policyRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('leaves').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('date', new Date().toISOString().split('T')[0]),
      supabase.from('policies').select('id', { count: 'exact', head: true }),
    ])

    setStats({
      staff: staffRes.count || 0,
      pendingLeave: leaveRes.count || 0,
      todayBookings: bookingRes.count || 0,
      policies: policyRes.count || 0,
    })
  }

  async function loadEvents() {
    const { data } = await supabase
      .from('events')
      .select('*')
      .gte('date', `${calendarYear}-01-01`)
      .lte('date', `${calendarYear}-12-31`)
      .order('date')
    if (data) setEvents(data)
  }

  function getEventsForDate(dateStr: string) {
    return events.filter(e => e.date === dateStr)
  }

  function formatTime(time: string | null) {
    if (!time) return ''
    const [h, m] = time.split(':')
    const hour = parseInt(h)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const h12 = hour % 12 || 12
    return `${h12}:${m} ${ampm}`
  }

  async function handleSubmitEvent(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!profile) return
    setSaving(true)

    const payload = {
      title: formTitle,
      date: formDate,
      event_time: formTime || null,
      description: formDesc || null,
      color: formColor,
      created_by: profile.name,
    }

    if (editingEvent) {
      const { error } = await supabase.from('events').update(payload).eq('id', editingEvent.id)
      if (error) {
        setFormError(error.message)
        setSaving(false)
        return
      }
    } else {
      const { error } = await supabase.from('events').insert(payload)
      if (error) {
        setFormError(error.message)
        setSaving(false)
        return
      }
    }

    closeForm()
    loadEvents()
    setSaving(false)
  }

  async function handleDeleteEvent(id: string) {
    await supabase.from('events').delete().eq('id', id)
    loadEvents()
  }

  function openAddEvent(date?: string) {
    setEditingEvent(null)
    setFormDate(date || new Date().toISOString().split('T')[0])
    setFormTime('')
    setFormTitle('')
    setFormDesc('')
    setFormColor('#4f46e5')
    setFormError('')
    setShowEventForm(true)
  }

  function openEditEvent(ev: CalendarEvent) {
    setEditingEvent(ev)
    setFormTitle(ev.title)
    setFormDate(ev.date)
    setFormTime(ev.event_time ? ev.event_time.slice(0, 5) : '')
    setFormDesc(ev.description || '')
    setFormColor(ev.color)
    setFormError('')
    setShowEventForm(true)
  }

  function closeForm() {
    setShowEventForm(false)
    setEditingEvent(null)
    setFormTitle('')
    setFormDate('')
    setFormTime('')
    setFormDesc('')
    setFormColor('#4f46e5')
    setFormError('')
  }

  const isHrOrMgmt = profile && (profile.role === 'hr' || profile.role === 'management')
  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : []
  const selectedHoliday = selectedDate ? isHoliday(selectedDate) : undefined

  function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate()
  }

  function getFirstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay()
  }

  function renderMiniCalendar(monthIndex: number) {
    const daysInMonth = getDaysInMonth(calendarYear, monthIndex)
    const firstDay = getFirstDayOfMonth(calendarYear, monthIndex)
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const cells = []

    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} />)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${calendarYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const holiday = isHoliday(dateStr)
      const isToday = dateStr === todayStr
      const dayOfWeek = new Date(calendarYear, monthIndex, day).getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      const dayEvents = getEventsForDate(dateStr)
      const isSelected = dateStr === selectedDate

      cells.push(
        <div
          key={day}
          onClick={() => setSelectedDate(dateStr)}
          className={`relative text-center text-xs py-0.5 rounded cursor-pointer transition-colors ${
            isSelected ? 'ring-2 ring-indigo-500' : ''
          } ${
            isToday
              ? 'bg-indigo-600 text-white font-bold'
              : holiday
              ? 'bg-red-50 text-red-600 font-semibold'
              : isWeekend
              ? 'text-slate-400 hover:bg-slate-100'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          onMouseEnter={() => (holiday || dayEvents.length > 0) && setHoveredDay(dateStr)}
          onMouseLeave={() => setHoveredDay(null)}
        >
          {day}
          {dayEvents.length > 0 && (
            <div className="flex justify-center gap-px mt-px">
              {dayEvents.slice(0, 3).map(ev => (
                <div key={ev.id} className="w-1 h-1 rounded-full" style={{ backgroundColor: ev.color }} />
              ))}
            </div>
          )}
          {hoveredDay === dateStr && (holiday || dayEvents.length > 0) && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-900 text-white text-[10px] rounded whitespace-nowrap z-50">
              {holiday && <div>{holiday.name}</div>}
              {dayEvents.map(ev => (
                <div key={ev.id}>
                  {ev.event_time ? `${formatTime(ev.event_time)} — ` : ''}{ev.title}
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    return cells
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar profile={profile} />
      <main className="md:ml-[200px] flex-1 p-4 md:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">
              Welcome back{profile ? `, ${profile.name}` : ''}
            </p>
          </div>
          {isHrOrMgmt && (
            <button
              onClick={() => openAddEvent()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl transition"
            >
              + Add Event
            </button>
          )}
        </div>

        {/* Row 1 — HR + Management only: company-wide stats */}
        {isHrOrMgmt && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <StatsCard
              title="Total Staff"
              value={stats.staff}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
            />
            <StatsCard
              title="Pending Leave"
              value={stats.pendingLeave}
              subtitle="Awaiting approval"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <StatsCard
              title="Today's Bookings"
              value={stats.todayBookings}
              subtitle={new Date().toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'short' })}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
            />
            <StatsCard
              title="Active Policies"
              value={stats.policies}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
            />
          </div>
        )}

        {/* Row 2 — HR + Staff only: personal leave balance (management has no AL/ML) */}
        {profile?.role !== 'management' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <StatsCard
              title="AL Remaining"
              value={profile ? profile.al_entitled - profile.al_used : 0}
              subtitle={`${profile?.al_used ?? 0} of ${profile?.al_entitled ?? 0} days used`}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
            />
            <StatsCard
              title="ML Remaining"
              value={profile ? profile.ml_entitled - profile.ml_used : 0}
              subtitle={`${profile?.ml_used ?? 0} of ${profile?.ml_entitled ?? 0} days used`}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
            />
          </div>
        )}

        {/* Event Form Modal */}
        {showEventForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-slate-900">
                  {editingEvent ? 'Edit Event' : 'Add Event'}
                </h2>
                <button onClick={closeForm} className="text-slate-400 hover:text-slate-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form onSubmit={handleSubmitEvent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    placeholder="e.g. Team Building, Salary Day"
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={e => setFormDate(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Time (optional)</label>
                    <input
                      type="time"
                      value={formTime}
                      onChange={e => setFormTime(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
                  <textarea
                    value={formDesc}
                    onChange={e => setFormDesc(e.target.value)}
                    placeholder="Additional details..."
                    rows={2}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
                  <div className="flex gap-2">
                    {EVENT_COLORS.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setFormColor(c.value)}
                        className={`w-8 h-8 rounded-full transition ${formColor === c.value ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`}
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
                {formError && (
                  <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{formError}</p>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingEvent ? 'Update Event' : 'Add Event'}
                </button>
              </form>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Year Calendar */}
          <div className="flex-1 bg-white border border-gray-100 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900">{calendarYear} Calendar</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCalendarYear(y => y - 1)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition"
                >
                  <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button
                  onClick={() => setCalendarYear(new Date().getFullYear())}
                  className="px-3 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                >
                  Today
                </button>
                <button
                  onClick={() => setCalendarYear(y => y + 1)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition"
                >
                  <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-4 text-xs flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-indigo-600" />
                <span className="text-slate-500">Today</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-red-50 border border-red-200" />
                <span className="text-slate-500">Public Holiday</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                <span className="text-slate-500">Event</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {MONTHS.map((month, idx) => (
                <div key={month}>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">{month}</h3>
                  <div className="grid grid-cols-7 gap-0.5">
                    {DAYS.map(d => (
                      <div key={d} className="text-center text-[10px] text-slate-400 font-medium pb-1">{d[0]}</div>
                    ))}
                    {renderMiniCalendar(idx)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel — Selected Day */}
          {selectedDate && (
            <div className="w-full lg:w-72 flex-shrink-0">
              <div className="bg-white border border-gray-100 rounded-2xl p-5 sticky top-8">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900">
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                  </h3>
                  <button onClick={() => setSelectedDate(null)} className="text-slate-400 hover:text-slate-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                {selectedHoliday && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-xl mb-3">
                    <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                    <span className="text-xs font-medium text-red-700">{selectedHoliday.name}</span>
                  </div>
                )}

                {selectedEvents.length > 0 ? (
                  <div className="space-y-2">
                    {selectedEvents.map(ev => (
                      <div key={ev.id} className="p-3 bg-slate-50 rounded-xl">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: ev.color }} />
                            <span className="text-xs font-semibold text-slate-900">{ev.title}</span>
                          </div>
                          {isHrOrMgmt && (
                            <div className="flex gap-1 flex-shrink-0">
                              <button
                                onClick={() => openEditEvent(ev)}
                                className="p-1 hover:bg-indigo-50 rounded transition text-slate-400 hover:text-indigo-600"
                                title="Edit"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button
                                onClick={() => handleDeleteEvent(ev.id)}
                                className="p-1 hover:bg-red-50 rounded transition text-slate-400 hover:text-red-500"
                                title="Delete"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          )}
                        </div>
                        {ev.event_time && (
                          <p className="text-xs text-indigo-600 ml-4 font-medium">{formatTime(ev.event_time)}</p>
                        )}
                        {ev.description && (
                          <p className="text-xs text-slate-500 ml-4 mt-0.5">{ev.description}</p>
                        )}
                        <p className="text-[10px] text-slate-400 ml-4 mt-1">by {ev.created_by}</p>
                      </div>
                    ))}
                  </div>
                ) : !selectedHoliday ? (
                  <p className="text-sm text-slate-400 py-4 text-center">No events</p>
                ) : null}

                {isHrOrMgmt && (
                  <button
                    onClick={() => openAddEvent(selectedDate)}
                    className="w-full mt-3 px-3 py-2 bg-indigo-50 text-indigo-600 text-xs font-semibold rounded-xl hover:bg-indigo-100 transition"
                  >
                    + Add event on this day
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Upcoming Holidays */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 mt-4">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Upcoming Public Holidays</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {SELANGOR_HOLIDAYS
              .filter(h => h.date >= new Date().toISOString().split('T')[0])
              .slice(0, 6)
              .map(h => (
                <div key={h.date + h.name} className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-red-600 text-xs font-bold">
                      {new Date(h.date + 'T00:00:00').getDate()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{h.name}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(h.date + 'T00:00:00').toLocaleDateString('en-MY', { weekday: 'long', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </main>
    </div>
  )
}
