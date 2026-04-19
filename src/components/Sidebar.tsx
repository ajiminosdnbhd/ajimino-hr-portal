'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Profile } from '@/lib/types'

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}


function LeaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )
}

function PolicyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function PayslipIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  )
}

function AnnouncementIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  )
}

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
    </svg>
  )
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { href: '/calendar', label: 'Planner', icon: CalendarIcon },
  { href: '/leave', label: 'Leave', icon: LeaveIcon },
  { href: '/policies', label: 'Policies', icon: PolicyIcon },
  { href: '/announcements', label: 'Announcements', icon: AnnouncementIcon },
  { href: '/payslips', label: 'Payslips', icon: PayslipIcon },
  { href: '/users', label: 'Users', icon: UsersIcon },
]

export default function Sidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  // Close the More popup whenever the route changes (handles back button too)
  useEffect(() => { setMoreOpen(false) }, [pathname])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
    } catch { }
    document.cookie.split(';').forEach(c => {
      document.cookie = c.trim().split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/'
    })
    window.location.replace('/login')
  }

  const visibleNav = NAV_ITEMS.filter(item => {
    if (item.href === '/users') {
      return profile && (profile.role === 'hr' || profile.role === 'management')
    }
    return true
  })

  // For mobile bottom nav: show first 4 items + "More" if there are extras
  const BOTTOM_LIMIT = 4
  const bottomItems = visibleNav.slice(0, BOTTOM_LIMIT)
  const moreItems = visibleNav.slice(BOTTOM_LIMIT)
  const hasMore = moreItems.length > 0

  // ── Desktop sidebar (md and above) ─────────────────────────────────────
  const desktopSidebar = (
    <aside
      className="hidden md:flex fixed left-0 top-0 h-screen w-[200px] flex-col z-50"
      style={{ background: '#0A1128' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 shrink-0">
        <div className="w-9 h-9 rounded-xl shrink-0 overflow-hidden flex items-center justify-center" style={{ background: '#FFFFFF', padding: 3 }}>
          <Image src="/Ajimino-logo-colour-FA-01.jpg" alt="AJIMINO Logo" width={36} height={36} className="object-contain w-full h-full" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="font-bold text-sm text-white tracking-wide">AJIMINO</span>
          <span className="text-[11px] font-medium mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>HR Portal</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 px-3 space-y-1 overflow-y-auto">
        {visibleNav.map(item => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'text-white'
                  : 'text-white/50 hover:text-white/85 hover:bg-white/[0.07]'
              }`}
              style={isActive ? { background: '#4338CA' } : undefined}
            >
              <Icon className="w-[18px] h-[18px] flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-3 pb-5 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {profile && (
          <div className="flex items-center gap-2.5 px-2 py-2.5 rounded-xl mt-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold shrink-0 text-white" style={{ background: '#4338CA' }}>
              {profile.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate leading-tight text-white">{profile.name}</p>
              <p className="text-[10px] font-medium capitalize" style={{ color: 'rgba(255,255,255,0.4)' }}>{profile.department}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 mt-1"
          style={{ color: 'rgba(255,255,255,0.5)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(200,32,47,0.15)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}
        >
          <LogoutIcon className="w-[18px] h-[18px]" />
          Logout
        </button>
      </div>
    </aside>
  )

  // ── Mobile bottom nav (below md) ────────────────────────────────────────
  const mobileBottomNav = (
    <div className="md:hidden">
      {/* "More" popover panel */}
      {hasMore && moreOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMoreOpen(false)}
          />
          <div
            className="fixed bottom-16 right-2 z-50 rounded-2xl shadow-xl py-2 min-w-[160px]"
            style={{ background: '#0A1128', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {moreItems.map(item => {
              const isActive = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium"
                  style={isActive ? { color: '#818CF8' } : { color: 'rgba(255,255,255,0.65)' }}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {item.label}
                </Link>
              )
            })}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} className="mt-1 pt-1">
              {profile && (
                <div className="flex items-center gap-2.5 px-4 py-2.5">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 text-white" style={{ background: '#4338CA' }}>
                    {profile.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate text-white">{profile.name}</p>
                    <p className="text-[10px] capitalize" style={{ color: 'rgba(255,255,255,0.4)' }}>{profile.department}</p>
                  </div>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium w-full"
                style={{ color: '#F87171' }}
              >
                <LogoutIcon className="w-5 h-5 flex-shrink-0" />
                Logout
              </button>
            </div>
          </div>
        </>
      )}

      {/* Bottom navigation bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center"
        style={{ background: '#0A1128', borderTop: '1px solid rgba(255,255,255,0.07)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {bottomItems.map(item => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMoreOpen(false)}
              className="flex-1 flex flex-col items-center justify-center py-2.5 gap-1"
              style={isActive ? { color: '#818CF8' } : { color: 'rgba(255,255,255,0.4)' }}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}

        {/* More button (only if extra nav items exist) */}
        {hasMore && (
          <button
            className="flex-1 flex flex-col items-center justify-center py-2.5 gap-1"
            style={moreItems.some(i => i.href === pathname) ? { color: '#818CF8' } : { color: 'rgba(255,255,255,0.4)' }}
            onClick={() => setMoreOpen(v => !v)}
          >
            <MoreIcon className="w-5 h-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        )}

        {/* Logout only shown inline if no "More" button */}
        {!hasMore && (
          <button
            className="flex-1 flex flex-col items-center justify-center py-2.5 gap-1"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onClick={handleLogout}
          >
            <LogoutIcon className="w-5 h-5" />
            <span className="text-[10px] font-medium">Logout</span>
          </button>
        )}
      </nav>
    </div>
  )

  return (
    <>
      {desktopSidebar}
      {mobileBottomNav}
    </>
  )
}
