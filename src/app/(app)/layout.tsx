import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { ProfileProvider } from '@/lib/ProfileContext'
import Sidebar from '@/components/Sidebar'
import { Profile } from '@/lib/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Load the profile SERVER-SIDE from request cookies.
  // This is guaranteed to work on every page load — no client-side cookie
  // reading, no INITIAL_SESSION race conditions, no bfcache issues.
  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {
          // Cookies cannot be set in layout — middleware handles session refresh.
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  let profile: Profile | null = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    profile = (data as Profile) ?? null
  }

  return (
    <ProfileProvider initialProfile={profile}>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar profile={profile} />
        {/* pt-14 on mobile = clears the fixed top bar height (56px). md:pt-0 since sidebar is on the side */}
        <main className="md:ml-[200px] flex-1 p-4 pb-24 md:p-8 md:pb-8 min-w-0">
          {children}
        </main>
      </div>
    </ProfileProvider>
  )
}
