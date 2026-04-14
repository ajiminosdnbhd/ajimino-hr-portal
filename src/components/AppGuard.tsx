'use client'

import { useEffect } from 'react'

/**
 * AppGuard — mounts once in the root layout.
 *
 * Fixes the "old version / can't click anything" bug caused by the browser
 * restoring a frozen page snapshot from the back/forward cache (bfcache).
 *
 * When the browser puts a page into bfcache (e.g. tab switching, closing and
 * reopening the browser), all JavaScript state is frozen — including any
 * in-flight auth loading state.  On restore the page looks stuck and buttons
 * don't respond.  The only reliable fix is to detect the bfcache restore and
 * do a hard reload so the app starts fresh.
 *
 * Also handles ChunkLoadError: when a new deployment is pushed, old cached JS
 * chunk URLs return 404.  Detect this and reload to pick up the new chunks.
 */
export default function AppGuard() {
  useEffect(() => {
    // ── bfcache restore detection ─────────────────────────────────────────
    // `pageshow` fires both on normal load (persisted=false) and on bfcache
    // restore (persisted=true).  On restore, force a full reload.
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        window.location.reload()
      }
    }
    window.addEventListener('pageshow', handlePageShow)

    // ── Stale chunk detection ────────────────────────────────────────────
    // If a script tag fails to load (404 after a new Vercel deploy), the
    // browser fires an error event on the script element.  Reload to pick up
    // the latest bundle.
    const handleError = (e: ErrorEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target as HTMLScriptElement).src?.includes('/_next/static/')) {
        window.location.reload()
      }
    }
    window.addEventListener('error', handleError, true) // capture phase

    // ── Unhandled promise rejections (ChunkLoadError) ────────────────────
    const handleUnhandledRejection = (e: PromiseRejectionEvent) => {
      const msg = e.reason?.message || e.reason?.toString() || ''
      if (msg.includes('ChunkLoadError') || msg.includes('Loading chunk')) {
        window.location.reload()
      }
    }
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('pageshow', handlePageShow)
      window.removeEventListener('error', handleError, true)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  return null
}
