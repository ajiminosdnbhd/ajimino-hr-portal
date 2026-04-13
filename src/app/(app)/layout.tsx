'use client'

import { useProfile } from '@/lib/useProfile'
import Sidebar from '@/components/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // Middleware already redirects unauthenticated users to /login.
  // No need to block render — just render immediately with whatever profile is available.
  const { profile } = useProfile()

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar profile={profile} />
      {/* pt-14 on mobile = clears the fixed top bar height (56px). md:pt-0 since sidebar is on the side */}
      <main className="md:ml-[200px] flex-1 p-4 pb-24 md:p-8 md:pb-8 min-w-0">
        {children}
      </main>
    </div>
  )
}
