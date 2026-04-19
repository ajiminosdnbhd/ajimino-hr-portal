'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useProfile } from '@/lib/useProfile'
import { SELANGOR_HOLIDAYS } from '@/lib/holidays'
import { CalendarEvent, Announcement } from '@/lib/types'
import StatsCard from '@/components/StatsCard'
import { adminRead } from '@/lib/adminRead'
import LoadError from '@/components/LoadError'

export default function DashboardPage() {
  const { profile } = useProfile()
  const [stats, setStats] = useState({ staff: 0, pendingLeave: 0, todayBookings: 0, policies: 0 })
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([])
  const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [eventsLoading, setEventsLoading] = useState(true)
  const [announcementsLoading, setAnnouncementsLoading] = useState(true)

  const isHrOrMgmt = profile && (profile.role === 'hr' || profile.role === 'management')

  useEffect(() => {
    if (profile) {
      loadStats()
      loadUpcomingEvents()
      loadRecentAnnouncements()
    }
  }, [profile])

  async function loadStats() {
    if (!profile) return
    setLoadError(null)
    setStatsLoading(true)
    const today = new Date().toISOString().split('T')[0]

    try {
      if (isHrOrMgmt) {
        const [staffRes, leaveRes, bookingRes, policyRes] = await Promise.all([
          adminRead('profiles', { select: 'id', countOnly: true }),
          adminRead('leaves', { select: 'id', filters: [{ type: 'eq', col: 'status', val: 'pending' }], countOnly: true }),
          adminRead('bookings', { select: 'id', filters: [{ type: 'eq', col: 'date', val: today }], countOnly: true }),
          adminRead('policies', { select: 'id', countOnly: true }),
        ])
        setStats({
          staff: staffRes.count,
          pendingLeave: leaveRes.count,
          todayBookings: bookingRes.count,
          policies: policyRes.count,
        })
      } else {
        const [bookingRes, policyRes] = await Promise.all([
          adminRead('bookings', { select: 'id', filters: [{ type: 'eq', col: 'date', val: today }, { type: 'eq', col: 'user_id', val: profile.id }], countOnly: true }),
          adminRead('policies', { select: 'id', countOnly: true }),
        ])
        setStats({ staff: 0, pendingLeave: 0, todayBookings: bookingRes.count, policies: policyRes.count })
      }
    } catch {
      setLoadError('Failed to load stats')
    } finally {
      setStatsLoading(false)
    }
  }

  async function loadUpcomingEvents() {
    if (!profile) return
    setEventsLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const filters = isHrOrMgmt ? [] : [
      { type: 'or' as const, val: `visibility.eq.all,and(visibility.eq.department,target_department.eq.${profile.department}),and(visibility.eq.individual,target_user_ids.cs.{${profile.id}})` }
    ]
    const { data } = await adminRead<CalendarEvent>('events', {
      filters: [{ type: 'gte', col: 'date', val: today }, ...filters],
      order: { col: 'date' },
      limit: 5,
    })
    setUpcomingEvents(data)
    setEventsLoading(false)
  }

  async function loadRecentAnnouncements() {
    if (!profile) return
    setAnnouncementsLoading(true)
    // Fetch enough so client-side filtering still yields results for staff
    const { data } = await adminRead<Announcement>('announcements', {
      order: { col: 'created_at', asc: false },
      limit: 50,
    })
    if (isHrOrMgmt) {
      setRecentAnnouncements(data.slice(0, 4))
    } else {
      const filtered = data.filter(a => {
        if (a.visibility === 'all') return true
        if (a.visibility === 'department' && a.target_departments.includes(profile.department)) return true
        if (a.visibility === 'individual' && a.target_user_ids.includes(profile.id)) return true
        return false
      })
      setRecentAnnouncements(filtered.slice(0, 4))
    }
    setAnnouncementsLoading(false)
  }

  function formatTime(time: string | null) {
    if (!time) return ''
    const [h, m] = time.split(':')
    const hour = parseInt(h)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const h12 = hour % 12 || 12
    return `${h12}:${m} ${ampm}`
  }

  function formatTimeRange(start: string | null, end: string | null) {
    if (!start) return null
    const s = formatTime(start)
    if (!end) return s
    return `${s} – ${formatTime(end)}`
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          {loadError && <LoadError message={loadError} />}
          <p className="text-slate-500 text-sm mt-1">
            Welcome back{profile ? `, ${profile.name}` : ''}
          </p>
        </div>
        <Link
          href="/calendar"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl transition text-sm"
        >
          View Calendar
        </Link>
      </div>

      {/* HR + Management: company-wide stats row */}
      {isHrOrMgmt && statsLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 animate-pulse">
              <div className="h-3 bg-slate-100 rounded w-1/2 mb-3" />
              <div className="h-8 bg-slate-100 rounded w-1/3 mb-2" />
              <div className="h-2.5 bg-slate-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}
      {isHrOrMgmt && !statsLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatsCard title="Total Staff" value={stats.staff}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
          />
          <StatsCard title="Pending Leave" value={stats.pendingLeave} subtitle="Awaiting approval"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatsCard title="Today's Bookings" value={stats.todayBookings} subtitle={new Date().toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'short' })}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
          />
          <StatsCard title="Active Policies" value={stats.policies}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          />
        </div>
      )}

      {/* Personal stats — all users */}
      {profile && (
        <div className={`grid gap-4 mb-8 ${isHrOrMgmt ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
          <StatsCard title="AL Remaining" value={profile.al_entitled - profile.al_used}
            subtitle={`${profile.al_used} of ${profile.al_entitled} days used`}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
          />
          <StatsCard title="ML Remaining" value={profile.ml_entitled - profile.ml_used}
            subtitle={`${profile.ml_used} of ${profile.ml_entitled} days used`}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          />
          {/* Staff only: today's bookings + active policies */}
          {!isHrOrMgmt && (
            <>
              <StatsCard title="My Bookings Today" value={stats.todayBookings}
                subtitle={new Date().toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'short' })}
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
              />
              <StatsCard title="Active Policies" value={stats.policies}
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
              />
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Upcoming Events</h2>
            <Link href="/calendar" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">View all →</Link>
          </div>
          {eventsLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl animate-pulse">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-200 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-3.5 bg-slate-200 rounded w-3/4 mb-2" />
                    <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : upcomingEvents.length > 0 ? (
            <div className="space-y-3">
              {upcomingEvents.map(ev => (
                <div key={ev.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: ev.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{ev.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(ev.date + 'T00:00:00').toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      {ev.event_time && ` · ${formatTimeRange(ev.event_time, ev.event_end_time)}`}
                    </p>
                    {ev.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{ev.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-slate-400">No upcoming events</p>
              <Link href="/calendar" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium mt-1 inline-block">
                Add one in Calendar
              </Link>
            </div>
          )}
        </div>

        {/* Upcoming Public Holidays */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Upcoming Public Holidays</h2>
          <div className="space-y-3">
            {SELANGOR_HOLIDAYS
              .filter(h => h.date >= new Date().toISOString().split('T')[0])
              .slice(0, 6)
              .map(h => (
                <div key={h.date + h.name} className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-red-600 text-xs font-bold">{new Date(h.date + 'T00:00:00').getDate()}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{h.name}</p>
                    <p className="text-xs text-slate-500">{new Date(h.date + 'T00:00:00').toLocaleDateString('en-MY', { weekday: 'long', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Recent Announcements */}
      <div className="mt-6 bg-white border border-gray-100 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Recent Announcements</h2>
          <Link href="/announcements" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">View all →</Link>
        </div>
        {announcementsLoading ? (
          <div className="space-y-3">
            {[1,2].map(i => (
              <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-slate-200 flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-3.5 bg-slate-200 rounded w-2/3 mb-2" />
                  <div className="h-2.5 bg-slate-100 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : recentAnnouncements.length > 0 ? (
          <div className="space-y-3">
            {recentAnnouncements.map(ann => (
              <div key={ann.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{ann.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(ann.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  {ann.content && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{ann.content}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-slate-400">No announcements yet</p>
            <Link href="/announcements" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium mt-1 inline-block">
              Go to Announcements
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
