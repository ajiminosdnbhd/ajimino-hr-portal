'use client'

import { useEffect } from 'react'

// Build ID stamped into this bundle at deploy time.
const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev'

/**
 * AppGuard — mounts once in the root layout, renders nothing.
 *
 * Permanently prevents three classes of "old version / can't click" bugs:
 *
 * 1. bfcache restore — browser restores a frozen snapshot of the page
 *    (e.g. switching tabs, closing + reopening browser).  The snapshot
 *    includes stale auth state (loading=true) which makes the UI unclickable.
 *    Fix: reload immediately when pageshow fires with persisted=true.
 *
 * 2. New deployment while tab is open — JS chunks referenced by the old
 *    HTML no longer exist on the CDN → 404 → hydration fails.
 *    Fix: on mount AND every tab focus, call /api/version; if the live
 *    buildId differs from the one stamped into this bundle, hard-reload.
 *
 * 3. ChunkLoadError / script 404 — same deployment mismatch caught via
 *    error events and unhandled promise rejections.
 *    Fix: reload immediately.
 *
 * 4. Mobile browser disk cache — mobile browsers (iOS Safari, Android
 *    Chrome) may serve a cached page from disk when reopening the browser.
 *    The no-store headers prevent this in theory, but some browsers ignore
 *    them. Running checkVersion() on mount catches this: the cached bundle
 *    has the old BUILD_ID, the server returns the new one → reload.
 */
export default function AppGuard() {
  useEffect(() => {
    let checking = false

    async function checkVersion() {
      if (checking || BUILD_ID === 'dev') return
      checking = true
      try {
        const res = await fetch('/api/version', { cache: 'no-store' })
        if (res.ok) {
          const { buildId } = await res.json()
          if (buildId && buildId !== BUILD_ID) {
            window.location.reload()
          }
        }
      } catch { /* network error — skip */ }
      finally { checking = false }
    }

    // ── 1. bfcache restore ────────────────────────────────────────────────
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload()
    }
    window.addEventListener('pageshow', handlePageShow)

    // ── 2. Check on mount (catches mobile disk-cached pages) ─────────────
    // Small delay so the page renders before a potential reload.
    const mountTimer = setTimeout(checkVersion, 1500)

    // ── 2b. Check on every tab focus ─────────────────────────────────────
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkVersion()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // ── 3. Stale chunk / script 404 ───────────────────────────────────────
    const handleScriptError = (e: ErrorEvent) => {
      const src = (e.target as HTMLScriptElement | null)?.src ?? ''
      if (src.includes('/_next/static/')) window.location.reload()
    }
    window.addEventListener('error', handleScriptError, true)

    const handleUnhandledRejection = (e: PromiseRejectionEvent) => {
      const msg: string = e.reason?.message ?? e.reason?.toString() ?? ''
      if (msg.includes('ChunkLoadError') || msg.includes('Loading chunk')) {
        window.location.reload()
      }
    }
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      clearTimeout(mountTimer)
      window.removeEventListener('pageshow', handlePageShow)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('error', handleScriptError, true)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  return null
}
