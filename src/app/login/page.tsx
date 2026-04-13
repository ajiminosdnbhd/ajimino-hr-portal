'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[65%] bg-[#0d1229] relative overflow-hidden flex-col justify-between p-12">
        {/* Decorative rings */}
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full border border-white/5" />
        <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full border border-white/5" />
        <div className="absolute -bottom-48 -right-48 w-[600px] h-[600px] rounded-full border border-white/5" />
        <div className="absolute -bottom-28 -right-28 w-[450px] h-[450px] rounded-full border border-indigo-500/10" />

        {/* Logo — top left */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-tight">AJIMINO SDN. BHD.</p>
            <p className="text-slate-400 text-xs">More Than Just Fertilizer</p>
          </div>
        </div>

        {/* Main Content — centered vertically */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-16">
          <h2 className="text-white text-5xl font-bold leading-tight mb-4">
            Your complete<br />HR platform.
          </h2>
          <p className="text-slate-400 text-base mb-12 max-w-lg">
            Built for AJIMINO&apos;s team — manage leave, payslips, bookings and policies in one place.
          </p>

          <div className="space-y-5">
            {[
              { title: 'Room Booking', desc: 'Book meeting rooms with conflict detection' },
              { title: 'Leave Management', desc: 'Apply and track leave with approval workflows' },
              { title: 'Payslip Access', desc: 'View and download your monthly payslips' },
              { title: 'Company Policies', desc: 'Stay updated with the latest policies' },
            ].map((feature) => (
              <div key={feature.title} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full border border-slate-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-slate-300 text-sm">{feature.title}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Copyright — bottom left */}
        <div className="relative z-10">
          <p className="text-slate-600 text-xs">AJIMINO SDN. BHD. © {new Date().getFullYear()}</p>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile branding */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <div>
              <h1 className="font-bold text-lg">AJIMINO SDN. BHD.</h1>
              <p className="text-slate-400 text-xs">More Than Just Fertilizer</p>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-slate-900 mb-1">Welcome back</h2>
          <p className="text-slate-400 text-sm mb-8">Sign in to your account</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@ajimino.com"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-slate-400 text-xs mt-10">
            AJIMINO SDN. BHD. &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  )
}
