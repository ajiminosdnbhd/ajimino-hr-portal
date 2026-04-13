'use client'

import { useEffect, useState } from 'react'
import { useProfile } from '@/lib/useProfile'
import { Booking, ROOMS } from '@/lib/types'
import { isHoliday } from '@/lib/holidays'
import Sidebar from '@/components/Sidebar'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const TIME_SLOTS = Array.from({ length: 20 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8
  const min = i % 2 === 0 ? '00' : '30'
  return `${String(hour).padStart(2, '0')}:${min}`
})

export default function BookingsPage() {
  const { profile, supabase } = useProfile()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [formRoom, setFormRoom] = useState<string>(ROOMS[0].id)
  const [formStart, setFormStart] = useState('09:00')
  const [formEnd, setFormEnd] = useState('10:00')
  const [formPurpose, setFormPurpose] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadBookings()
  }, [currentMonth, currentYear])

  async function loadBookings() {
    const startDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`
    const endDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${new Date(currentYear, currentMonth + 1, 0).getDate()}`
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('start_time')
    if (data) setBookings(data)
  }

  function getBookingsForDate(date: string) {
    return bookings.filter(b => b.date === date)
  }

  function getConflicts() {
    return bookings.filter(
      b => b.date === selectedDate && b.room_id === formRoom &&
        b.start_time < formEnd && b.end_time > formStart
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')

    if (formStart >= formEnd) {
      setFormError('End time must be after start time')
      return
    }

    const conflicts = getConflicts()
    if (conflicts.length > 0) {
      setFormError('Time slot conflicts with existing bookings')
      return
    }

    if (!profile) return
    setSaving(true)

    const { error } = await supabase.from('bookings').insert({
      user_id: profile.id,
      user_name: profile.name,
      department: profile.department,
      room_id: formRoom,
      date: selectedDate,
      start_time: formStart,
      end_time: formEnd,
      purpose: formPurpose,
    })

    if (error) {
      setFormError(error.message)
    } else {
      setFormPurpose('')
      setShowForm(false)
      loadBookings()
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await supabase.from('bookings').delete().eq('id', id)
    loadBookings()
  }

  function getDaysInMonth() {
    return new Date(currentYear, currentMonth + 1, 0).getDate()
  }

  function getFirstDay() {
    return new Date(currentYear, currentMonth, 1).getDay()
  }

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
  }

  const dayBookings = getBookingsForDate(selectedDate)
  const conflicts = showForm ? getConflicts() : []

  return (
    <div className="flex min-h-screen">
      <Sidebar profile={profile} />
      <main className="ml-[200px] flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Room Booking</h1>
            <p className="text-slate-500 text-sm mt-1">Book meeting rooms and view schedules</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl transition"
          >
            + New Booking
          </button>
        </div>

        {/* Room Legend */}
        <div className="flex items-center gap-4 mb-4">
          {ROOMS.map(room => (
            <div key={room.id} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: room.color }} />
              <span className="text-xs text-slate-600">{room.name} ({room.capacity})</span>
            </div>
          ))}
        </div>

        <div className="flex gap-6">
          {/* Calendar */}
          <div className="flex-1 bg-white border border-gray-100 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900">
                {MONTHS[currentMonth]} {currentYear}
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg transition">
                  <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button
                  onClick={() => { setCurrentMonth(new Date().getMonth()); setCurrentYear(new Date().getFullYear()) }}
                  className="px-3 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                >
                  Today
                </button>
                <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg transition">
                  <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {DAYS.map(d => (
                <div key={d} className="text-center text-xs font-medium text-slate-400 py-2">{d}</div>
              ))}
              {Array.from({ length: getFirstDay() }, (_, i) => (
                <div key={`e-${i}`} />
              ))}
              {Array.from({ length: getDaysInMonth() }, (_, i) => {
                const day = i + 1
                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const dayBk = getBookingsForDate(dateStr)
                const holiday = isHoliday(dateStr)
                const isSelected = dateStr === selectedDate
                const isToday = dateStr === new Date().toISOString().split('T')[0]

                return (
                  <div
                    key={day}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`relative min-h-[60px] p-1.5 rounded-xl cursor-pointer border transition ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-transparent hover:bg-slate-50'
                    }`}
                  >
                    <span className={`text-xs font-medium ${
                      isToday ? 'bg-indigo-600 text-white w-5 h-5 rounded-full flex items-center justify-center' :
                      holiday ? 'text-red-500' : 'text-slate-700'
                    }`}>
                      {day}
                    </span>
                    {holiday && (
                      <p className="text-[8px] text-red-400 leading-tight mt-0.5 truncate">{holiday.name}</p>
                    )}
                    <div className="flex gap-0.5 mt-1 flex-wrap">
                      {dayBk.map(b => {
                        const room = ROOMS.find(r => r.id === b.room_id)
                        return (
                          <div
                            key={b.id}
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: room?.color || '#94a3b8' }}
                            title={`${room?.name} ${b.start_time}-${b.end_time}`}
                          />
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right Panel — Day Bookings */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </h3>
              <p className="text-xs text-slate-400 mb-4">{dayBookings.length} booking(s)</p>

              {dayBookings.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">No bookings for this day</p>
              ) : (
                <div className="space-y-3">
                  {dayBookings.map(b => {
                    const room = ROOMS.find(r => r.id === b.room_id)
                    return (
                      <div key={b.id} className="p-3 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: room?.color }} />
                          <span className="text-xs font-semibold text-slate-900">{room?.name}</span>
                        </div>
                        <p className="text-xs text-slate-600">{b.start_time} - {b.end_time}</p>
                        <p className="text-xs text-slate-500 mt-1">{b.purpose}</p>
                        <p className="text-[10px] text-slate-400 mt-1">by {b.user_name} ({b.department})</p>
                        {profile && b.user_id === profile.id && (
                          <button
                            onClick={() => handleDelete(b.id)}
                            className="text-[10px] text-red-500 hover:text-red-700 mt-1 font-medium"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Booking Form */}
            {showForm && (
              <div className="bg-white border border-gray-100 rounded-2xl p-5 mt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900">New Booking</h3>
                  <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={e => setSelectedDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Room</label>
                    <select
                      value={formRoom}
                      onChange={e => setFormRoom(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {ROOMS.map(r => (
                        <option key={r.id} value={r.id}>{r.name} (Cap: {r.capacity})</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Start</label>
                      <select
                        value={formStart}
                        onChange={e => setFormStart(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">End</label>
                      <select
                        value={formEnd}
                        onChange={e => setFormEnd(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Conflict Detection */}
                  {conflicts.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <p className="text-xs font-semibold text-amber-700 mb-1">Existing bookings in this slot:</p>
                      {conflicts.map(c => (
                        <p key={c.id} className="text-xs text-amber-600">
                          {c.start_time}-{c.end_time} by {c.user_name} — {c.purpose}
                        </p>
                      ))}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Purpose</label>
                    <input
                      type="text"
                      value={formPurpose}
                      onChange={e => setFormPurpose(e.target.value)}
                      placeholder="Meeting purpose"
                      required
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {formError && (
                    <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-xl">{formError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm transition disabled:opacity-50"
                  >
                    {saving ? 'Booking...' : 'Book Room'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
