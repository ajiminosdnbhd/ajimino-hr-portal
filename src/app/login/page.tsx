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
      {/* Left Panel — Dark Navy Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0f172a] relative overflow-hidden flex-col justify-center px-16">
        {/* Decorative rings */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full border border-slate-700/30" />
        <div className="absolute -top-16 -left-16 w-80 h-80 rounded-full border border-slate-700/20" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full border border-slate-700/30" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full border border-indigo-500/10" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-2xl">AJIMINO</h1>
              <p className="text-slate-400 text-sm">SDN. BHD.</p>
            </div>
          </div>

          <h2 className="text-white text-3xl font-bold mb-4">
            HR Management Portal
          </h2>
          <p className="text-slate-400 text-base mb-10 max-w-md">
            Streamline your human resource operations with our integrated management platform.
          </p>

          <div className="space-y-4">
            {[
              { title: 'Room Booking', desc: 'Book meeting rooms with conflict detection' },
              { title: 'Leave Management', desc: 'Apply and track leave with approval workflows' },
              { title: 'Payslip Access', desc: 'View and download your monthly payslips' },
              { title: 'Company Policies', desc: 'Stay updated with the latest policies' },
            ].map((feature) => (
              <div key={feature.title} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-600/20 flex items-center justify-center mt-0.5 flex-shrink-0">
                  <svg className="w-3 h-3 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{feature.title}</p>
                  <p className="text-slate-500 text-xs">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile branding */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <div>
              <h1 className="font-bold text-lg">AJIMINO</h1>
              <p className="text-slate-400 text-xs">SDN. BHD.</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h2>
          <p className="text-slate-500 text-sm mb-8">Sign in to your HR portal account</p>

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

          <p className="text-center text-slate-400 text-xs mt-8">
            AJIMINO SDN. BHD. &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  )
}
