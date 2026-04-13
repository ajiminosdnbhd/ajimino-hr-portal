'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/lib/useProfile'
import Sidebar from '@/components/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useProfile()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !profile) {
      router.replace('/login')
    }
  }, [loading, profile, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#F5F6FA' }}>
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar profile={profile} />
      <main className="md:ml-[200px] flex-1 p-4 md:p-8 min-w-0">
        {children}
      </main>
    </div>
  )
}
