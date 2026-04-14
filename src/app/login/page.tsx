'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import Image from 'next/image'

export default function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const canSubmit = !loading && !!email && !!password

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(), password,
      })
      if (authError) {
        const msg = authError.message === 'Invalid login credentials'
          ? 'Invalid email or password. Please try again.'
          : authError.message
        setError(msg)
        return
      }
      // Full navigation so the new page reads session cookies from scratch.
      // Client-side router.push() relies on onAuthStateChange firing in time,
      // which is flaky. A hard redirect is simpler and always works.
      window.location.href = '/dashboard'
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const features = [
    'Room Booking',
    'Leave Management',
    'Payslip Access',
    'Company Policies',
  ]

  return (
    <div className="flex w-full min-h-[100svh]">

      {/* ══ LEFT PANEL ══ */}
      <div
        className="hidden lg:flex flex-col justify-between flex-1 p-12 relative overflow-hidden"
        style={{ background: '#0F1B3C' }}
      >
        {/* Subtle circle ornaments */}
        {[600, 440, 290].map((size, i) => (
          <div
            key={i}
            className="absolute pointer-events-none rounded-full"
            style={{
              width: size, height: size,
              border: '1px solid rgba(255,255,255,0.03)',
              bottom: '-120px', right: '-120px',
            }}
          />
        ))}

        {/* Top glow */}
        <div className="absolute top-0 right-0 w-96 h-96 pointer-events-none"
          style={{ background: 'radial-gradient(circle at top right, rgba(99,102,241,0.08) 0%, transparent 65%)' }} />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 overflow-hidden bg-white">
              <Image src="/Ajimino-logo-colour-FA-01.jpg" alt="AJIMINO logo" width={40} height={40} className="object-contain" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-black text-xl tracking-wide text-white select-none">AJIMINO SDN. BHD.</span>
              <span className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>More Than Just Fertilizer</span>
            </div>
          </div>
        </div>

        {/* Centre content */}
        <div className="relative z-10">
          <h2 className="text-3xl font-bold text-white mb-2 leading-snug">
            Your complete<br />HR platform.
          </h2>
          <p className="text-sm mb-10" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Built for AJIMINO&apos;s team — manage leave, payslips, bookings and policies in one place.
          </p>

          <div className="space-y-4">
            {features.map(text => (
              <div key={text} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: '#6366F1' }} />
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom copyright */}
        <p className="relative z-10 text-xs" style={{ color: 'rgba(255,255,255,0.20)' }}>
          AJIMINO SDN. BHD. &copy; {new Date().getFullYear()}
        </p>
      </div>

      {/* ══ RIGHT PANEL ══ */}
      <div className="flex flex-col items-center justify-center flex-1 lg:max-w-[480px] px-4 md:px-8 py-10 overflow-y-auto" style={{ background: '#F8F9FB', minHeight: '100svh' }}>

        {/* Mobile-only logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-10">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl overflow-hidden bg-white border" style={{ borderColor: '#E5E7EB' }}>
            <Image src="/Ajimino-logo-colour-FA-01.jpg" alt="AJIMINO logo" width={36} height={36} className="object-contain" />
          </div>
          <span className="font-black text-lg tracking-wide" style={{ color: '#0F1B3C' }}>AJIMINO SDN. BHD.</span>
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold" style={{ color: '#0F1B3C' }}>Welcome back</h2>
            <p className="text-sm mt-1" style={{ color: '#6366F1' }}>Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {error && (
              <div
                className="flex items-start gap-3 p-3.5 rounded-2xl text-sm"
                style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B42318' }}
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold" style={{ color: '#0F1B3C' }}>
                Email
              </label>
              <input
                id="email" type="email" autoComplete="email" required
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@ajimino.com" disabled={loading}
                className="w-full px-4 py-3 rounded-2xl text-sm disabled:opacity-60 transition-all"
                style={{ border: '1.5px solid #E5E7EB', background: '#FFFFFF', color: '#0F1B3C', outline: 'none' }}
                onFocus={e => { e.target.style.borderColor = '#6366F1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.10)' }}
                onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold" style={{ color: '#0F1B3C' }}>
                Password
              </label>
              <div className="relative">
                <input
                  id="password" type={showPass ? 'text' : 'password'}
                  autoComplete="current-password" required
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password" disabled={loading}
                  className="w-full px-4 py-3 pr-11 rounded-2xl text-sm disabled:opacity-60 transition-all"
                  style={{ border: '1.5px solid #E5E7EB', background: '#FFFFFF', color: '#0F1B3C', outline: 'none' }}
                  onFocus={e => { e.target.style.borderColor = '#6366F1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.10)' }}
                  onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }}
                />
                <button
                  type="button" onClick={() => setShowPass(p => !p)} disabled={loading}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center transition-colors"
                  style={{ color: '#A0AABB' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#5C6478' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#A0AABB' }}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full flex items-center justify-center gap-2 font-semibold text-sm py-3.5 rounded-2xl text-white focus:outline-none select-none transition-all mt-2"
              style={
                !canSubmit
                  ? { background: '#C7C9D1', cursor: 'not-allowed' }
                  : { background: '#6366F1', cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.30)' }
              }
              onMouseEnter={e => { if (canSubmit) (e.currentTarget as HTMLButtonElement).style.background = '#4F46E5' }}
              onMouseLeave={e => { if (canSubmit) (e.currentTarget as HTMLButtonElement).style.background = '#6366F1' }}
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Signing in...</span></>
                : <span>Sign In</span>
              }
            </button>
          </form>

          <p className="mt-10 text-xs text-center" style={{ color: '#B0B5C3' }}>
            AJIMINO SDN. BHD. &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>

    </div>
  )
}
