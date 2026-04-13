'use client'

import { useState } from 'react'
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

function BookingIcon({ className }: { className?: string }) {
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

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { href: '/bookings', label: 'Room Booking', icon: BookingIcon },
  { href: '/leave', label: 'Leave', icon: LeaveIcon },
  { href: '/policies', label: 'Policies', icon: PolicyIcon },
  { href: '/payslips', label: 'Payslips', icon: PayslipIcon },
  { href: '/users', label: 'Users', icon: UsersIcon },
]

export default function Sidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

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

  const sidebarContent = (
    <aside
      className="fixed left-0 top-0 h-screen w-[200px] flex flex-col z-50 transition-transform duration-300 ease-in-out"
      style={{ background: '#0A1128' }}
    >

      {/* Logo — same style as CRM */}
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
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
              style={isActive
                ? { background: '#4338CA', color: '#FFFFFF' }
                : { color: 'rgba(255,255,255,0.5)' }
              }
              onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.85)' } }}
              onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)' } }}
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
              <p className="text-[10px] font-medium capitalize" style={{ color: 'rgba(255,255,255,0.4)' }}>{profile.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 mt-1"
          style={{ color: 'rgba(255,255,255,0.5)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(200,32,47,0.15)'; (e.currentTarget as HTMLElement).style.color = '#F87171' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)' }}
        >
          <LogoutIcon className="w-[18px] h-[18px]" />
          Logout
        </button>
      </div>
    </aside>
  )

  return (
    <>
      {/* Hamburger button — mobile only */}
      <button
        className="md:hidden fixed top-4 left-4 z-[60] p-2 text-white rounded-lg shadow-lg"
        style={{ background: '#0A1128' }}
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Desktop sidebar — always visible on md+ */}
      <div className="hidden md:block">
        {sidebarContent}
      </div>

      {/* Mobile sidebar — always in DOM, slides in/out with CSS */}
      <div className="md:hidden">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          style={{ opacity: mobileOpen ? 1 : 0, pointerEvents: mobileOpen ? 'auto' : 'none' }}
          onClick={() => setMobileOpen(false)}
        />
        {/* Sidebar panel — slides from left */}
        <aside
          className="fixed left-0 top-0 h-screen w-[200px] flex flex-col z-50 transition-transform duration-300 ease-in-out"
          style={{
            background: '#0A1128',
            transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          }}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 px-5 py-5 shrink-0">
            <div className="w-9 h-9 rounded-xl shrink-0 overflow-hidden flex items-center justify-center" style={{ background: '#FFFFFF', padding: 3 }}>
              <img src="/Ajimino-logo-colour-FA-01.jpg" alt="AJIMINO Logo" width={36} height={36} className="object-contain w-full h-full" />
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
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
                  style={isActive ? { background: '#4338CA', color: '#FFFFFF' } : { color: 'rgba(255,255,255,0.5)' }}
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
                  <p className="text-[10px] font-medium capitalize" style={{ color: 'rgba(255,255,255,0.4)' }}>{profile.role}</p>
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 mt-1"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              <LogoutIcon className="w-[18px] h-[18px]" />
              Logout
            </button>
          </div>
        </aside>
      </div>
    </>
  )
}
