'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useProfile } from '@/lib/useProfile'
import { CalendarEvent, Leave, Booking, Profile, ROOMS } from '@/lib/types'
import { SELANGOR_HOLIDAYS, isHoliday } from '@/lib/holidays'
import { adminRead } from '@/lib/adminRead'
import LoadError from '@/components/LoadError'

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

// 7:00 AM – 10:00 PM in 30-min steps
const TIME_SLOTS = Array.from({ length: 31 }, (_, i) => {
  const mins = 420 + i * 30
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${mins % 60 === 0 ? '00' : '30'}`
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
  const [activeForm, setActiveForm] = useState<'event' | null>(null)
  const [exporting, setExporting] = useState(false)

  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [allProfiles, setAllProfiles] = useState<{ id: string; name: string; department: string; role: string }[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  // Event form
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formTime, setFormTime] = useState('09:00')
  const [formEndTime, setFormEndTime] = useState('10:00')
  const [formDesc, setFormDesc] = useState('')
  const [formColor, setFormColor] = useState('#4f46e5')
  const [formVisibility, setFormVisibility] = useState<'all' | 'department' | 'individual'>('all')
  const [formDept, setFormDept] = useState('')
  const [formUserIds, setFormUserIds] = useState<string[]>([])
  const [formTimeMode, setFormTimeMode] = useState<'allday' | 'custom'>('allday')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [formRoomId, setFormRoomId] = useState('')
  const [formParticipantIds, setFormParticipantIds] = useState<string[]>([])

  const isMgmt = profile?.role === 'management'
  const isHrOrMgmt = profile && (profile.role === 'hr' || profile.role === 'management')

  useEffect(() => {
    if (profile) loadMonthData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, month, year])

  async function loadMonthData() {
    if (!profile) return
    setLoadError(null)
    const pad     = String(month + 1).padStart(2, '0')
    const from    = `${year}-${pad}-01`
    const lastDay = new Date(year, month + 1, 0).getDate()
    const to      = `${year}-${pad}-${String(lastDay).padStart(2, '0')}`

    // Staff see: all company-wide events + all department events (to know when others are busy)
    //            + individual events targeted specifically at them (private 1-on-1s stay hidden)
    // HR/Mgmt see everything
    const evtFilters = isHrOrMgmt ? [] : [
      { type: 'or' as const, val: `visibility.eq.all,visibility.eq.department,and(visibility.eq.individual,target_user_ids.cs.{${profile.id}})` }
    ]

    const [evtRes, bookRes, leaveRes, profileRes] = await Promise.all([
      adminRead<CalendarEvent>('events', {
        filters: [{ type: 'gte', col: 'date', val: from }, { type: 'lte', col: 'date', val: to }, ...evtFilters],
        order: { col: 'date' },
      }),
      adminRead<Booking>('bookings', {
        filters: [{ type: 'gte', col: 'date', val: from }, { type: 'lte', col: 'date', val: to }],
        order: { col: 'start_time' },
      }),
      adminRead<Leave>('leaves', {
        filters: [
          { type: 'lte', col: 'start_date', val: to },
          { type: 'gte', col: 'end_date', val: from },
          ...(isHrOrMgmt ? [] : [{ type: 'eq' as const, col: 'user_id', val: profile.id }]),
        ],
      }),
      adminRead<{ id: string; name: string; department: string; role: string }>('profiles', {
        select: 'id, name, department, role',
        order: { col: 'name' },
      }),
    ])

    if (evtRes.error) { setLoadError(evtRes.error); return }
    if (bookRes.error) { setLoadError(bookRes.error); return }

    setEvents(evtRes.data)
    setBookings(bookRes.data)
    setLeaves(leaveRes.data)
    if (profileRes.data.length > 0) setAllProfiles(profileRes.data)
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

  // ── Permission helpers ───────────────────────────────────────────────────
  // Management: can modify ANY event
  // HR: can modify own + staff events (NOT management events)
  // Staff: can only modify own events (NOT hr/management events)
  function canModifyEvent(ev: CalendarEvent) {
    if (!profile) return false
    if (profile.role === 'management') return true
    if (profile.role === 'hr') return ev.created_by_role !== 'management'
    if (ev.created_by_role === 'hr' || ev.created_by_role === 'management') return false
    return ev.created_by_id === profile.id
  }

  // ── Event form helpers ───────────────────────────────────────────────────
  function openAddEvent(date?: string) {
    setEditingEvent(null)
    setFormDate(date || new Date().toISOString().split('T')[0])
    setFormTitle(''); setFormTime('09:00'); setFormEndTime('10:00'); setFormDesc('')
    setFormColor('#4f46e5'); setFormVisibility('all'); setFormDept(''); setFormUserIds([])
    setFormTimeMode('allday'); setFormError(''); setFormRoomId(''); setFormParticipantIds([]); setActiveForm('event')
  }

  function openEditEvent(ev: CalendarEvent) {
    setEditingEvent(ev)
    setFormTitle(ev.title); setFormDate(ev.date)
    setFormTime(ev.event_time?.slice(0, 5) || '09:00')
    setFormEndTime(ev.event_end_time?.slice(0, 5) || '10:00')
    setFormDesc(ev.description || ''); setFormColor(ev.color)
    setFormVisibility(ev.visibility || 'all')
    setFormDept(ev.target_department || ''); setFormUserIds(ev.target_user_ids || [])
    setFormTimeMode(ev.event_time ? 'custom' : 'allday')
    setFormRoomId(ev.room_id || ''); setFormParticipantIds(ev.participant_ids || [])
    setFormError(''); setActiveForm('event')
  }

  function closeForm() {
    setActiveForm(null); setEditingEvent(null)
    setFormTitle(''); setFormDate(''); setFormTime('09:00'); setFormEndTime('10:00'); setFormDesc('')
    setFormColor('#4f46e5'); setFormVisibility('all'); setFormDept(''); setFormUserIds([])
    setFormTimeMode('allday'); setFormError('')
    setFormRoomId(''); setFormParticipantIds([])
  }

  async function handleSubmitEvent(e: React.FormEvent) {
    e.preventDefault(); setFormError(''); setSaving(true)
    if (!profile) { setSaving(false); return }

    // Room or participants require a specific time
    if ((formRoomId || formParticipantIds.length > 0) && formTimeMode === 'allday') {
      setFormError('Please set a specific start and end time when booking a room or adding participants.')
      setSaving(false); return
    }

    // End time must be after start time
    if (formTimeMode === 'custom' && formEndTime <= formTime) {
      setFormError('End time must be after start time.')
      setSaving(false); return
    }

    try {
      // ── Room conflict check ──────────────────────────────────────────────
      if (formRoomId && formTimeMode === 'custom') {
        // Check against events with room_id
        const { data: evtRoom } = await adminRead<CalendarEvent>('events', {
          filters: [{ type: 'eq', col: 'date', val: formDate }, { type: 'eq', col: 'room_id', val: formRoomId }],
        })
        const roomEvtClash = evtRoom
          .filter(ev => editingEvent ? ev.id !== editingEvent.id : true)
          .find(ev => ev.event_time && ev.event_end_time && ev.event_time < formEndTime && ev.event_end_time > formTime)
        if (roomEvtClash) {
          const rName = ROOMS.find(r => r.id === formRoomId)?.name || 'Room'
          setFormError(`${rName} is already booked ${roomEvtClash.event_time?.slice(0,5)}–${roomEvtClash.event_end_time?.slice(0,5)} by ${roomEvtClash.created_by}.`)
          setSaving(false); return
        }
        // Also check legacy bookings table
        const { data: bkRoom } = await adminRead<Booking>('bookings', {
          filters: [{ type: 'eq', col: 'date', val: formDate }, { type: 'eq', col: 'room_id', val: formRoomId }],
        })
        const bkClash = bkRoom.find(b => b.start_time < formEndTime && b.end_time > formTime)
        if (bkClash) {
          const rName = ROOMS.find(r => r.id === formRoomId)?.name || 'Room'
          setFormError(`${rName} is already booked ${bkClash.start_time.slice(0,5)}–${bkClash.end_time.slice(0,5)} by ${bkClash.user_name}.`)
          setSaving(false); return
        }
      }

      // ── Participant availability check ───────────────────────────────────
      if (formParticipantIds.length > 0 && formTimeMode === 'custom') {
        const { data: sameDay } = await adminRead<CalendarEvent>('events', {
          filters: [{ type: 'eq', col: 'date', val: formDate }],
        })
        const clashing = sameDay
          .filter(ev => editingEvent ? ev.id !== editingEvent.id : true)
          .filter(ev => ev.event_time && ev.event_end_time && ev.event_time < formEndTime && ev.event_end_time > formTime)
        const busyNames: string[] = []
        for (const pid of formParticipantIds) {
          const conflict = clashing.find(ev =>
            ev.created_by_id === pid || ev.participant_ids?.includes(pid)
          )
          if (conflict) {
            const person = allProfiles.find(p => p.id === pid)
            if (person) busyNames.push(person.name.split(' ')[0])
          }
        }
        if (busyNames.length > 0) {
          setFormError(`${busyNames.join(', ')} ${busyNames.length === 1 ? 'is' : 'are'} already scheduled at this time.`)
          setSaving(false); return
        }
      }

      const participantNames = formParticipantIds.map(pid => allProfiles.find(p => p.id === pid)?.name || pid)

      const payload = {
        title: formTitle, date: formDate,
        event_time: formTimeMode === 'custom' ? formTime : null,
        event_end_time: formTimeMode === 'custom' ? formEndTime : null,
        description: formDesc || null, color: formColor,
        created_by: profile.name, created_by_id: profile.id, created_by_role: profile.role,
        visibility: formVisibility,
        target_department: formVisibility === 'department' ? formDept : null,
        target_user_ids: formVisibility === 'individual' ? formUserIds : null,
        room_id: formRoomId || null,
        participant_ids: formParticipantIds.length > 0 ? formParticipantIds : null,
        participant_names: formParticipantIds.length > 0 ? participantNames : null,
      }
      const res = editingEvent
        ? await supabase.from('events').update(payload).eq('id', editingEvent.id)
        : await supabase.from('events').insert(payload)
      if (res.error) { setFormError(res.error.message); setSaving(false); return }
      closeForm(); loadMonthData()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteEvent(id: string) {
    const { error } = await supabase.from('events').delete().eq('id', id)
    if (error) { alert('Failed to delete event: ' + error.message); return }
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
      const { data: tpData } = await adminRead<Profile>('profiles', {
        filters: [{ type: 'eq', col: 'id', val: leave.user_id }],
      })
      const tp = tpData[0]
      if (tp) await supabase.from('profiles').update({ [field]: (leave.type === 'Annual Leave' ? tp.al_used : tp.ml_used) + leave.days }).eq('id', leave.user_id)
    }
    loadMonthData()
  }

  // ── Leave cancellation approval ──────────────────────────────────────────
  async function handleCancellationApproval(leave: Leave, action: 'approve' | 'reject') {
    if (!profile) return
    if (action === 'approve') {
      await supabase.from('leaves').update({ status: 'cancelled' }).eq('id', leave.id)
      // Decrement balance only if leave was previously approved
      if (leave.approved_by) {
        const field = leave.type === 'Annual Leave' ? 'al_used' : 'ml_used'
        const { data: tpData } = await adminRead<Profile>('profiles', {
          filters: [{ type: 'eq', col: 'id', val: leave.user_id }],
        })
        const tp = tpData[0]
        if (tp) {
          const current = leave.type === 'Annual Leave' ? tp.al_used : tp.ml_used
          await supabase.from('profiles').update({ [field]: Math.max(0, current - leave.days) }).eq('id', leave.user_id)
        }
      }
    } else {
      const restored = leave.approved_by ? 'approved' : 'pending'
      await supabase.from('leaves').update({ status: restored, cancellation_reason: null }).eq('id', leave.id)
    }
    loadMonthData()
  }

  // ── PDF Export (HR & Management only) ───────────────────────────────────
  async function exportPDF() {
    setExporting(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      // A3 landscape for the calendar grid
      const doc = new jsPDF({ orientation: 'landscape', format: 'a3' })
      type DocWithAutoTable = typeof doc & { lastAutoTable: { finalY: number } }
      const W = doc.internal.pageSize.getWidth()   // 420mm
      const H = doc.internal.pageSize.getHeight()  // 297mm
      const M = 10 // margin

      const pad2 = (n: number) => String(n).padStart(2, '0')
      const shortDate = (d: string) =>
        new Date(d + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
      const clip = (text: string, maxW: number) => {
        const lines = doc.splitTextToSize(text, maxW)
        return lines[0] + (lines.length > 1 ? '...' : '')
      }

      // ── PAGE 1: Calendar grid ──────────────────────────────────────────────

      // Header banner
      doc.setFillColor(10, 17, 40)
      doc.rect(0, 0, W, 20, 'F')
      doc.setFontSize(15); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold')
      doc.text('AJIMINO SDN. BHD.  —  Monthly Planner', M, 13)
      doc.setFontSize(11); doc.setFont('helvetica', 'normal')
      doc.text(`${MONTHS[month]} ${year}`, W - M, 8, { align: 'right' })
      doc.setFontSize(7.5); doc.setTextColor(180, 190, 210)
      doc.text(`Generated: ${new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })}`, W - M, 16, { align: 'right' })

      // Calendar grid setup
      const gridTop = 24
      const dayHdrH = 8
      const numCols = 7
      const dm = new Date(year, month + 1, 0).getDate()
      const fd = new Date(year, month, 1).getDay()
      const numRows = Math.ceil((fd + dm) / 7)
      const cellW = (W - M * 2) / numCols
      const cellH = (H - gridTop - dayHdrH - 12) / numRows  // leave 12mm for legend

      // Day header row
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      dayNames.forEach((name, i) => {
        const x = M + i * cellW
        doc.setFillColor(i === 0 || i === 6 ? 235 : 225, i === 0 || i === 6 ? 230 : 228, i === 0 || i === 6 ? 250 : 248)
        doc.rect(x, gridTop, cellW, dayHdrH, 'F')
        doc.setDrawColor(190, 190, 205); doc.setLineWidth(0.2)
        doc.rect(x, gridTop, cellW, dayHdrH, 'S')
        doc.setFontSize(8); doc.setTextColor(10, 17, 40); doc.setFont('helvetica', 'bold')
        doc.text(name, x + cellW / 2, gridTop + 5.3, { align: 'center' })
      })

      // Calendar cells
      for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
          const idx = row * 7 + col
          const dayNum = idx - fd + 1
          const cx = M + col * cellW
          const cy = gridTop + dayHdrH + row * cellH
          const isThisMonth = dayNum >= 1 && dayNum <= dm
          const isWeekend = col === 0 || col === 6
          const dateStr = `${year}-${pad2(month + 1)}-${pad2(dayNum)}`

          // Background
          doc.setFillColor(
            isThisMonth ? (isWeekend ? 250 : 255) : 242,
            isThisMonth ? (isWeekend ? 248 : 255) : 242,
            isThisMonth ? (isWeekend ? 255 : 255) : 248
          )
          doc.rect(cx, cy, cellW, cellH, 'F')
          doc.setDrawColor(200, 200, 215); doc.setLineWidth(0.15)
          doc.rect(cx, cy, cellW, cellH, 'S')

          if (!isThisMonth) continue

          // Day number
          const isToday = dateStr === todayStr
          if (isToday) {
            doc.setFillColor(79, 70, 229)
            doc.rect(cx + cellW - 9, cy + 0.5, 8, 6, 'F')
            doc.setFontSize(7); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold')
            doc.text(String(dayNum), cx + cellW - 5, cy + 5, { align: 'center' })
          } else {
            doc.setFontSize(8); doc.setTextColor(isWeekend ? 120 : 30, isWeekend ? 60 : 30, isWeekend ? 180 : 60)
            doc.setFont('helvetica', 'bold')
            doc.text(String(dayNum), cx + cellW - 2.5, cy + 5.5, { align: 'right' })
          }

          let lineY = cy + 8.5
          const lh = 4.0  // line height per item
          const maxItems = Math.floor((cellH - 9) / lh)
          let drawn = 0
          let total = 0

          // Holiday
          const hol = isHoliday(dateStr)
          if (hol) {
            total++
            if (drawn < maxItems) {
              doc.setFillColor(254, 226, 226)
              doc.rect(cx + 0.8, lineY - 2.8, cellW - 1.6, lh, 'F')
              doc.setFontSize(5.8); doc.setTextColor(185, 28, 28); doc.setFont('helvetica', 'bold')
              doc.text(clip(`[PH] ${hol.name}`, cellW - 3), cx + 1.5, lineY, {})
              lineY += lh; drawn++
            }
          }

          // Events
          const dayEvts = events.filter(ev => ev.date === dateStr)
          total += dayEvts.length
          for (const ev of dayEvts) {
            if (drawn >= maxItems) break
            const r2 = parseInt(ev.color.slice(1, 3), 16)
            const g2 = parseInt(ev.color.slice(3, 5), 16)
            const b2 = parseInt(ev.color.slice(5, 7), 16)
            doc.setFillColor(r2, g2, b2)
            doc.rect(cx + 0.8, lineY - 2.8, cellW - 1.6, lh, 'F')
            doc.setFontSize(5.8); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold')
            const tStr = ev.event_time ? ` ${formatTime(ev.event_time)}` : ''
            doc.text(clip(ev.title + tStr, cellW - 3), cx + 1.5, lineY)
            lineY += lh; drawn++
          }

          // Leaves
          const dayLeaves = leaves.filter(l => l.start_date <= dateStr && l.end_date >= dateStr && l.status !== 'rejected')
          total += dayLeaves.length
          for (const lv of dayLeaves) {
            if (drawn >= maxItems) break
            doc.setFillColor(209, 250, 229)
            doc.rect(cx + 0.8, lineY - 2.8, cellW - 1.6, lh, 'F')
            doc.setFontSize(5.8); doc.setTextColor(5, 122, 85); doc.setFont('helvetica', 'normal')
            const lvType = lv.type === 'Annual Leave' ? 'AL' : 'ML'
            doc.text(clip(`${lv.user_name} (${lvType})`, cellW - 3), cx + 1.5, lineY)
            lineY += lh; drawn++
          }

          // Bookings
          const dayBkgs = bookings.filter(b => b.date === dateStr)
          total += dayBkgs.length
          for (const bk of dayBkgs) {
            if (drawn >= maxItems) break
            doc.setFillColor(219, 234, 254)
            doc.rect(cx + 0.8, lineY - 2.8, cellW - 1.6, lh, 'F')
            doc.setFontSize(5.8); doc.setTextColor(30, 64, 175); doc.setFont('helvetica', 'normal')
            const roomShort = bk.room_id === 'big-meeting-room' ? 'Big Rm' : bk.room_id === 'small-meeting-room' ? 'Sm Rm' : 'Disc Rm'
            doc.text(clip(`${roomShort} ${bk.start_time.slice(0,5)}-${bk.end_time.slice(0,5)} ${bk.user_name}`, cellW - 3), cx + 1.5, lineY)
            lineY += lh; drawn++
          }

          // Overflow indicator
          if (total > maxItems) {
            doc.setFontSize(5); doc.setTextColor(100, 100, 130); doc.setFont('helvetica', 'italic')
            doc.text(`+${total - maxItems} more`, cx + 1.5, cy + cellH - 1.5)
          }
        }
      }

      // Legend
      const legY = H - 5
      const legItems: [number, number, number, string][] = [
        [79, 70, 229, 'Event'],
        [209, 250, 229, 'Leave'],   // fill
        [219, 234, 254, 'Booking'], // fill
        [254, 226, 226, 'Public Holiday'],
      ]
      const legTextColors: [number, number, number][] = [
        [255, 255, 255], [5, 122, 85], [30, 64, 175], [185, 28, 28]
      ]
      let legX = M
      legItems.forEach(([r2, g2, b2, label], i) => {
        doc.setFillColor(r2, g2, b2)
        doc.rect(legX, legY - 3.5, 10, 4, 'F')
        doc.setFontSize(6); doc.setTextColor(...legTextColors[i]); doc.setFont('helvetica', 'bold')
        doc.text(label.substring(0, 2), legX + 5, legY - 0.5, { align: 'center' })
        doc.setTextColor(40, 40, 60); doc.setFont('helvetica', 'normal')
        doc.text(label, legX + 12, legY - 0.5)
        legX += label.length * 2.2 + 18
      })

      // ── PAGE 2: Detail tables ──────────────────────────────────────────────
      doc.addPage('a3', 'landscape')

      doc.setFillColor(10, 17, 40)
      doc.rect(0, 0, W, 20, 'F')
      doc.setFontSize(15); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold')
      doc.text('AJIMINO SDN. BHD.  —  Planner Details', M, 13)
      doc.setFontSize(11); doc.setFont('helvetica', 'normal')
      doc.text(`${MONTHS[month]} ${year}`, W - M, 13, { align: 'right' })

      let curY = 28

      // Events table
      doc.setFontSize(10); doc.setTextColor(10, 17, 40); doc.setFont('helvetica', 'bold')
      doc.text('Events', M, curY); curY += 2
      autoTable(doc, {
        startY: curY,
        head: [['Date', 'Title', 'Time', 'Visibility / Target', 'Created By', 'Description']],
        body: events.length > 0 ? events.map(ev => [
          shortDate(ev.date),
          ev.title,
          ev.event_time ? (formatTimeRange(ev.event_time, ev.event_end_time) || '') : 'Whole Day',
          ev.visibility === 'all' ? 'All Staff'
            : ev.visibility === 'department' ? `Department: ${ev.target_department}`
            : `Individual: ${ev.target_user_ids?.map(uid => allProfiles.find(p => p.id === uid)?.name || uid).join(', ')}`,
          `${ev.created_by} (${ev.created_by_role || '—'})`,
          ev.description || '—',
        ]) : [['', 'No events this month', '', '', '', '']],
        styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
        headStyles: { fillColor: [10, 17, 40], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 249, 251] },
        columnStyles: { 3: { cellWidth: 55 }, 5: { cellWidth: 75 } },
      })

      curY = (doc as DocWithAutoTable).lastAutoTable.finalY + 10

      // Leaves table
      doc.setFontSize(10); doc.setTextColor(10, 17, 40); doc.setFont('helvetica', 'bold')
      doc.text('Leave Applications', M, curY); curY += 2
      const approvedLeaves = leaves.filter(l => l.status !== 'rejected')
      autoTable(doc, {
        startY: curY,
        head: [['Staff', 'Department', 'Type', 'Start Date', 'End Date', 'Days', 'Status', 'Reason', 'Approved By']],
        body: approvedLeaves.length > 0 ? approvedLeaves.map(l => [
          l.user_name, l.department,
          l.type,
          shortDate(l.start_date),
          shortDate(l.end_date),
          `${l.days} day${l.days !== 1 ? 's' : ''}`,
          l.status.charAt(0).toUpperCase() + l.status.slice(1),
          l.reason || '—',
          l.approved_by || '—',
        ]) : [['', 'No leave applications this month', '', '', '', '', '', '', '']],
        styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
        headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 249, 251] },
        columnStyles: { 7: { cellWidth: 70 } },
      })

      curY = (doc as DocWithAutoTable).lastAutoTable.finalY + 10

      // Room Bookings table
      doc.setFontSize(10); doc.setTextColor(10, 17, 40); doc.setFont('helvetica', 'bold')
      doc.text('Room Bookings', M, curY); curY += 2
      autoTable(doc, {
        startY: curY,
        head: [['Date', 'Room', 'Time', 'Booked By', 'Department', 'Purpose', 'Attendees']],
        body: bookings.length > 0 ? bookings.map(b => [
          shortDate(b.date),
          ROOMS.find(r => r.id === b.room_id)?.name || b.room_id,
          `${b.start_time.slice(0, 5)} – ${b.end_time.slice(0, 5)}`,
          b.user_name, b.department,
          b.purpose,
          b.attendee_names?.join(', ') || '—',
        ]) : [['', 'No bookings this month', '', '', '', '', '']],
        styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 249, 251] },
        columnStyles: { 5: { cellWidth: 65 }, 6: { cellWidth: 65 } },
      })

      // Page numbers
      const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFontSize(7); doc.setTextColor(150, 150, 160); doc.setFont('helvetica', 'normal')
        doc.text(`Page ${i} of ${totalPages}  —  AJIMINO SDN. BHD. Confidential`, W / 2, H - 3, { align: 'center' })
      }

      doc.save(`Planner_${year}_${pad2(month + 1)}_${MONTHS[month]}.pdf`)
    } finally {
      setExporting(false)
    }
  }

  // ── Derived state ────────────────────────────────────────────────────────
  const todayStr = new Date().toISOString().split('T')[0]
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()

  const selEvents = selectedDate ? getForDate(events, selectedDate, 'date') : []
  // Show all active leaves in detail panel (exclude cancelled/rejected)
  const selLeaves = selectedDate
    ? getForDate(leaves, selectedDate, 'range').filter(l => l.status !== 'cancelled' && l.status !== 'rejected')
    : []
  const selBookings = selectedDate ? getForDate(bookings, selectedDate, 'date') : []
  const selHoliday = selectedDate ? isHoliday(selectedDate) : undefined

  return (
    <>
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Planner</h1>
          {loadError && <LoadError message={loadError} />}
          <p className="text-slate-500 text-sm mt-1">
            {isHrOrMgmt
              ? `${events.length} event(s) · ${leaves.filter(l => l.status === 'approved').length} approved leave(s) · ${events.filter(ev => ev.room_id).length} room booking(s) this month`
              : 'Your schedule — events, leaves, and bookings'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Export: HR and Management only */}
          {isHrOrMgmt && (
            <button onClick={exportPDF} disabled={exporting}
              className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-xl transition text-sm disabled:opacity-50">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              {exporting ? 'Exporting...' : 'Export PDF'}
            </button>
          )}
          {/* Manage Leaves: HR and Management */}
          {isHrOrMgmt && (
            <Link href="/leave"
              className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-xl transition text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              Manage Leaves
            </Link>
          )}
          {/* Apply Leave: HR and Staff (not Management) */}
          {!isMgmt && (
            <Link href="/leave"
              className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-xl transition text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Apply Leave
            </Link>
          )}
          <button onClick={() => openAddEvent()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl transition text-sm">
            + Add Event
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* ── Main calendar ───────────────────────────────────────────── */}
        <div className="flex-1 bg-white border border-gray-100 rounded-2xl p-5 min-w-0">
          {/* Month navigator */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">{MONTHS[month]} {year}</h2>
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} className="p-2.5 hover:bg-slate-100 rounded-lg transition min-w-[40px] min-h-[40px] flex items-center justify-center">
                <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button onClick={() => { const t = new Date(); setMonth(t.getMonth()); setYear(t.getFullYear()); setSelectedDate(t.toISOString().split('T')[0]) }}
                className="px-3 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition min-h-[40px]">Today</button>
              <button onClick={nextMonth} className="p-2.5 hover:bg-slate-100 rounded-lg transition min-w-[40px] min-h-[40px] flex items-center justify-center">
                <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-4">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 border border-red-200 inline-block" />Holiday</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />Event</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-100 inline-block" />Approved Leave</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 inline-block" />Pending Leave</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-100 inline-block" />Cancel Requested</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-100 inline-block" />Room Booking</span>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[11px] font-semibold text-slate-400 py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-xl overflow-hidden border border-slate-100">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`e-${i}`} className="bg-slate-50 min-h-[90px] md:min-h-[110px]" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const holiday = isHoliday(dateStr)
              const isToday = dateStr === todayStr
              const isSelected = dateStr === selectedDate
              const isWeekend = new Date(year, month, day).getDay() === 0 || new Date(year, month, day).getDay() === 6
              const dayEvents = getForDate(events, dateStr, 'date')
              const allDayLeaves = getForDate(leaves, dateStr, 'range')
              // Only show active leaves on calendar (not cancelled/rejected)
              const dayLeaves = allDayLeaves.filter(l => l.status !== 'cancelled' && l.status !== 'rejected')
              const dayBookings = getForDate(bookings, dateStr, 'date')
              const hasApproved = dayLeaves.some(l => l.status === 'approved')
              const hasPending = dayLeaves.some(l => l.status === 'pending' || l.status === 'cancellation_requested')
              const hasBooking = dayBookings.length > 0

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDate(selectedDate === dateStr ? null : dateStr)}
                  className={`bg-white min-h-[90px] md:min-h-[110px] p-1 cursor-pointer transition-all
                    ${holiday ? '!bg-red-50' : ''}
                    ${!holiday && hasApproved ? '!bg-emerald-50' : ''}
                    ${!holiday && !hasApproved && hasPending ? '!bg-amber-50' : ''}
                    ${!holiday && !hasApproved && !hasPending && hasBooking ? '!bg-blue-50' : ''}
                    ${isSelected ? 'ring-2 ring-inset ring-indigo-500' : 'hover:brightness-95'}
                  `}
                >
                  {/* Date number — min 28×28 for touch accessibility */}
                  <div className={`text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full mb-0.5
                    ${isToday ? 'bg-indigo-600 text-white' : holiday ? 'text-red-600' : isWeekend ? 'text-slate-400' : 'text-slate-700'}
                  `}>
                    {day}
                  </div>

                  {/* Holiday name */}
                  {holiday && (
                    <div className="text-[9px] text-red-500 font-semibold truncate leading-tight px-0.5 mb-0.5">
                      {holiday.name.split('·')[0].trim().split(' ').slice(0, 3).join(' ')}
                    </div>
                  )}

                  {/* Events */}
                  {dayEvents.slice(0, 2).map(ev => (
                    <div key={ev.id} className="mb-0.5 rounded overflow-hidden"
                      style={{ borderLeft: `3px solid ${ev.color}`, backgroundColor: ev.color + '18' }}>
                      <div className="px-1 py-0.5">
                        <div className="text-[9px] font-bold leading-tight truncate" style={{ color: ev.color }}>
                          {ev.event_time ? ev.event_time.slice(0, 5) + ' · ' : ''}{ev.title}
                        </div>
                        <div className="text-[8px] text-slate-400 leading-tight truncate">
                          {ev.room_id ? ROOMS.find(r => r.id === ev.room_id)?.name.replace(' Meeting Room','').replace(' Room','') : `by ${ev.created_by.split(' ')[0]}`}
                        </div>
                      </div>
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-[8px] text-slate-400 px-1 mb-0.5">+{dayEvents.length - 2} more event{dayEvents.length - 2 > 1 ? 's' : ''}</div>
                  )}

                  {/* Leaves */}
                  {dayLeaves.slice(0, 2).map(l => (
                    <div key={l.id} className={`mb-0.5 rounded overflow-hidden border-l-[3px] ${
                      l.status === 'approved' ? 'border-emerald-500 bg-emerald-50' :
                      l.status === 'cancellation_requested' ? 'border-orange-400 bg-orange-50' :
                      'border-amber-400 bg-amber-50'
                    }`}>
                      <div className="px-1 py-0.5">
                        <div className={`text-[9px] font-bold leading-tight truncate ${
                          l.status === 'approved' ? 'text-emerald-700' :
                          l.status === 'cancellation_requested' ? 'text-orange-600' :
                          'text-amber-700'
                        }`}>
                          {isHrOrMgmt ? l.user_name.split(' ')[0] : (l.type === 'Annual Leave' ? 'Annual Leave' : 'Medical Leave')}
                        </div>
                        <div className="text-[8px] text-slate-400 leading-tight truncate">
                          {l.type === 'Annual Leave' ? 'AL' : 'ML'} · {l.status === 'cancellation_requested' ? 'cancel req.' : l.status}
                        </div>
                      </div>
                    </div>
                  ))}
                  {dayLeaves.length > 2 && (
                    <div className="text-[8px] text-slate-400 px-1 mb-0.5">+{dayLeaves.length - 2} more leave{dayLeaves.length - 2 > 1 ? 's' : ''}</div>
                  )}

                  {/* Bookings */}
                  {dayBookings.slice(0, 2).map(b => {
                    const room = ROOMS.find(r => r.id === b.room_id)
                    const roomShort = room?.name.replace(' Meeting Room', '').replace(' Room', '') || '?'
                    return (
                      <div key={b.id} className="mb-0.5 rounded overflow-hidden border-l-[3px] bg-blue-50"
                        style={{ borderLeftColor: room?.color || '#3b82f6' }}>
                        <div className="px-1 py-0.5">
                          <div className="text-[9px] font-bold leading-tight truncate text-blue-700">
                            {roomShort} · {b.start_time.slice(0, 5)}
                          </div>
                          <div className="text-[8px] text-slate-400 leading-tight truncate">by {b.user_name.split(' ')[0]}</div>
                        </div>
                      </div>
                    )
                  })}
                  {dayBookings.length > 2 && (
                    <div className="text-[8px] text-slate-400 px-1 mb-0.5">+{dayBookings.length - 2} more booking{dayBookings.length - 2 > 1 ? 's' : ''}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Right panel ─────────────────────────────────────────────── */}
        <div className="xl:w-80 flex-shrink-0 space-y-4">

          {/* Day detail panel */}
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

              {/* Holiday */}
              {selHoliday && (
                <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-100 rounded-xl mb-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-xs font-semibold text-red-700">{selHoliday.name}</p>
                    <p className="text-[10px] text-red-400 mt-0.5">Public Holiday</p>
                  </div>
                </div>
              )}

              {/* Events */}
              {selEvents.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Events</p>
                  <div className="space-y-2">
                    {selEvents.map(ev => (
                      <div key={ev.id} className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: ev.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-900">{ev.title}</p>
                          {ev.event_time && (
                            <p className="text-[10px] text-indigo-600 font-medium mt-0.5">
                              {formatTimeRange(ev.event_time, ev.event_end_time)}
                            </p>
                          )}
                          {ev.description && (
                            <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{ev.description}</p>
                          )}
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {ev.visibility === 'all' ? 'All staff' : ev.visibility === 'department' ? `${ev.target_department} dept` : 'Specific staff'} · by {ev.created_by}
                          </p>
                          {ev.room_id && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ROOMS.find(r => r.id === ev.room_id)?.color || '#3b82f6' }} />
                              <p className="text-[10px] font-semibold text-blue-600">{ROOMS.find(r => r.id === ev.room_id)?.name || ev.room_id}</p>
                            </div>
                          )}
                          {ev.participant_names && ev.participant_names.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {ev.participant_names.map((name, i) => (
                                <span key={i} className="text-[9px] font-medium bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full">{name.split(' ')[0]}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        {canModifyEvent(ev) && (
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => openEditEvent(ev)}
                              className="p-1.5 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition"
                              title="Edit">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={() => handleDeleteEvent(ev.id)}
                              className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition"
                              title="Delete">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Leaves */}
              {selLeaves.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Leaves</p>
                  <div className="space-y-2">
                    {selLeaves.map(l => (
                      <div key={l.id} className={`p-3 rounded-xl border ${
                        l.status === 'approved' ? 'bg-emerald-50 border-emerald-100' :
                        l.status === 'cancellation_requested' ? 'bg-orange-50 border-orange-100' :
                        'bg-amber-50 border-amber-100'
                      }`}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold text-slate-900">
                            {isHrOrMgmt ? l.user_name : l.type === 'Annual Leave' ? 'Annual Leave' : 'Medical Leave'}
                          </p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            l.status === 'approved' ? 'bg-emerald-200 text-emerald-800' :
                            l.status === 'cancellation_requested' ? 'bg-orange-200 text-orange-800' :
                            'bg-amber-200 text-amber-800'
                          }`}>
                            {l.status === 'cancellation_requested' ? 'Cancel Requested' : l.status}
                          </span>
                        </div>
                        {isHrOrMgmt && <p className="text-[10px] text-slate-500">{l.type} · {l.department}</p>}
                        <p className="text-[10px] text-slate-500">
                          {new Date(l.start_date + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })} –{' '}
                          {new Date(l.end_date + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })} · {l.days} day(s)
                        </p>
                        {l.reason && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{l.reason}</p>}
                        {l.cancellation_reason && (
                          <p className="text-[10px] text-orange-500 mt-0.5 truncate">Cancel reason: {l.cancellation_reason}</p>
                        )}
                        {/* Approve/reject leave application */}
                        {isHrOrMgmt && l.status === 'pending' && (
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => handleLeaveApproval(l, 'approved')}
                              className="flex-1 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg hover:bg-emerald-200 transition">
                              Approve
                            </button>
                            <button onClick={() => handleLeaveApproval(l, 'rejected')}
                              className="flex-1 py-1 bg-red-100 text-red-600 text-[10px] font-bold rounded-lg hover:bg-red-200 transition">
                              Reject
                            </button>
                          </div>
                        )}
                        {/* Approve/reject cancellation request */}
                        {isHrOrMgmt && l.status === 'cancellation_requested' && (
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => handleCancellationApproval(l, 'approve')}
                              className="flex-1 py-1 bg-orange-100 text-orange-700 text-[10px] font-bold rounded-lg hover:bg-orange-200 transition">
                              Approve Cancel
                            </button>
                            <button onClick={() => handleCancellationApproval(l, 'reject')}
                              className="flex-1 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg hover:bg-slate-200 transition">
                              Keep Leave
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Room Bookings */}
              {selBookings.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Room Bookings</p>
                  <div className="space-y-2">
                    {selBookings.map(b => {
                      const room = ROOMS.find(r => r.id === b.room_id)
                      return (
                        <div key={b.id} className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: room?.color || '#3b82f6' }} />
                              <p className="text-xs font-semibold text-slate-900">{room?.name || b.room_id}</p>
                            </div>
                            {(profile?.role === 'management' || b.user_id === profile?.id) && (
                              <button onClick={async () => { const { error } = await supabase.from('bookings').delete().eq('id', b.id); if (error) { alert('Failed to cancel booking'); return } loadMonthData() }}
                                className="text-[10px] text-red-500 hover:text-red-700 font-semibold transition">
                                Cancel
                              </button>
                            )}
                          </div>
                          <p className="text-[10px] text-blue-600 font-bold">
                            {formatTimeRange(b.start_time.slice(0, 5), b.end_time.slice(0, 5))}
                          </p>
                          <p className="text-[10px] text-slate-600 mt-0.5">{b.user_name} · {b.department}</p>
                          {b.purpose && <p className="text-[10px] text-slate-500 mt-0.5">{b.purpose}</p>}
                          {b.attendee_names && b.attendee_names.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {b.attendee_names.map((name, i) => (
                                <span key={i} className="text-[9px] font-medium bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-full">
                                  {name.split(' ')[0]}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {!selHoliday && selEvents.length === 0 && selLeaves.length === 0 && selBookings.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-6">Nothing scheduled</p>
              )}

              {/* Quick add buttons */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                <button onClick={() => openAddEvent(selectedDate)}
                  className="flex-1 px-3 py-2 bg-indigo-50 text-indigo-600 text-xs font-semibold rounded-xl hover:bg-indigo-100 transition">
                  + Event
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <p className="text-sm font-semibold text-slate-700 mb-1">Select a day</p>
              <p className="text-xs text-slate-400">Click any date to view and manage events, leaves, and bookings.</p>
            </div>
          )}

          {/* Upcoming holidays */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Upcoming Holidays</h3>
            <div className="space-y-2">
              {SELANGOR_HOLIDAYS
                .filter(h => h.date >= new Date().toISOString().split('T')[0])
                .slice(0, 5)
                .map(h => (
                  <div key={h.date + h.name} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                      <span className="text-red-600 text-xs font-bold">{new Date(h.date + 'T00:00:00').getDate()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{h.name}</p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(h.date + 'T00:00:00').toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Meeting rooms info */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Meeting Rooms</h3>
            <div className="space-y-2.5">
              {ROOMS.map(room => (
                <div key={room.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50">
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

      {/* Unified Event Form Modal */}
      {activeForm === 'event' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-xl pb-6">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-base font-bold text-slate-900">
                {editingEvent ? 'Edit Event' : '+ New Event'}
              </h2>
              <button onClick={closeForm} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmitEvent} className="p-5 space-y-4">

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Event Title *</label>
                <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} required
                  placeholder="e.g. Team Meeting, Client Call..."
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Date *</label>
                <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} required
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              {/* Time */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Time</label>
                <div className="flex gap-3 mb-2">
                  {(['allday', 'custom'] as const).map(mode => (
                    <label key={mode} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={formTimeMode === mode} onChange={() => setFormTimeMode(mode)}
                        className="text-indigo-600 focus:ring-indigo-500" />
                      <span className="text-sm text-slate-600">{mode === 'allday' ? 'All Day' : 'Specific Time'}</span>
                    </label>
                  ))}
                </div>
                {formTimeMode === 'custom' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Start</label>
                      <select value={formTime} onChange={e => setFormTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        {TIME_SLOTS.map(t => <option key={t} value={t}>{formatTime(t)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">End</label>
                      <select value={formEndTime} onChange={e => setFormEndTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        {TIME_SLOTS.filter(t => t > formTime).map(t => <option key={t} value={t}>{formatTime(t)}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Room Booking (optional) */}
              <div className="border border-gray-100 rounded-xl p-3 bg-slate-50">
                <label className="block text-xs font-semibold text-slate-600 mb-2">Room Booking <span className="font-normal text-slate-400">(optional)</span></label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button type="button" onClick={() => setFormRoomId('')}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border transition ${!formRoomId ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-gray-200 hover:border-indigo-300'}`}>
                    No Room Needed
                  </button>
                  {ROOMS.map(room => (
                    <button key={room.id} type="button" onClick={() => { setFormRoomId(room.id); if (formTimeMode === 'allday') setFormTimeMode('custom') }}
                      className={`py-2 px-3 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 ${formRoomId === room.id ? 'text-white border-transparent' : 'bg-white text-slate-600 border-gray-200 hover:border-indigo-300'}`}
                      style={formRoomId === room.id ? { backgroundColor: room.color, borderColor: room.color } : {}}>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: formRoomId === room.id ? 'white' : room.color }} />
                      {room.name.replace(' Meeting Room', '').replace(' Room', '')}
                      <span className="text-[10px] opacity-70 ml-auto">{room.capacity}pax</span>
                    </button>
                  ))}
                </div>
                {formRoomId && (
                  <p className="text-[11px] text-indigo-600 mt-2">
                    {ROOMS.find(r => r.id === formRoomId)?.name} · {formTimeMode === 'custom' ? `${formatTime(formTime)} – ${formatTime(formEndTime)}` : 'Set a specific time above'}
                  </p>
                )}
              </div>

              {/* Participants */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">
                  Participants <span className="font-normal text-slate-400">(blocks their schedule)</span>
                </label>
                <div className="max-h-36 overflow-y-auto space-y-1 border border-gray-200 rounded-xl p-2">
                  {allProfiles.filter(p => p.id !== profile?.id).map(p => {
                    const checked = formParticipantIds.includes(p.id)
                    return (
                      <label key={p.id} className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer transition ${checked ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                        <input type="checkbox" checked={checked}
                          onChange={e => {
                            if (e.target.checked) { setFormParticipantIds(ids => [...ids, p.id]); if (formTimeMode === 'allday') setFormTimeMode('custom') }
                            else setFormParticipantIds(ids => ids.filter(id => id !== p.id))
                          }}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                        <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-indigo-600">{p.name.charAt(0)}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-800 truncate">{p.name}</p>
                          <p className="text-[10px] text-slate-400">{p.department}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
                {formParticipantIds.length > 0 && (
                  <p className="text-[11px] text-indigo-600 mt-1">{formParticipantIds.length} participant{formParticipantIds.length > 1 ? 's' : ''} selected — their schedule will be blocked</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description <span className="font-normal text-slate-400">(optional)</span></label>
                <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={2} placeholder="Agenda, notes..."
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>

              {/* Visibility */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Visibility</label>
                <div className="flex gap-2">
                  {(['all', 'department', 'individual'] as const).map(v => (
                    <button key={v} type="button" onClick={() => setFormVisibility(v)}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium border transition capitalize ${formVisibility === v ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-gray-200 hover:border-indigo-300'}`}>
                      {v === 'all' ? 'All Staff' : v}
                    </button>
                  ))}
                </div>
                {formVisibility === 'department' && (
                  <select value={formDept} onChange={e => setFormDept(e.target.value)} required
                    className="mt-2 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Select department</option>
                    {['Management', 'HR', 'Sales', 'Operations', 'Marketing'].map(d => <option key={d}>{d}</option>)}
                  </select>
                )}
                {formVisibility === 'individual' && (
                  <div className="mt-2 max-h-28 overflow-y-auto space-y-1 border border-gray-200 rounded-xl p-2">
                    {allProfiles.map(p => (
                      <label key={p.id} className={`flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer ${formUserIds.includes(p.id) ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                        <input type="checkbox" checked={formUserIds.includes(p.id)}
                          onChange={e => {
                            if (e.target.checked) setFormUserIds(ids => [...ids, p.id])
                            else setFormUserIds(ids => ids.filter(id => id !== p.id))
                          }}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                        <span className="text-xs text-slate-700">{p.name} <span className="text-slate-400">({p.department})</span></span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Color */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Event Color</label>
                <div className="flex gap-2">
                  {EVENT_COLORS.map(c => (
                    <button key={c.value} type="button" onClick={() => setFormColor(c.value)}
                      className={`w-7 h-7 rounded-full border-2 transition ${formColor === c.value ? 'border-slate-700 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c.value }} title={c.label} />
                  ))}
                </div>
              </div>

              {formError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{formError}</p>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeForm} className="flex-1 py-2.5 border border-gray-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition disabled:opacity-50">
                  {saving ? 'Saving...' : editingEvent ? 'Save Changes' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
