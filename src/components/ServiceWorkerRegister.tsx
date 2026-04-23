'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    let cleanupFn: (() => void) | undefined

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        })

        // Check for updates every time the page gains focus
        const checkUpdate = () => registration.update().catch(() => {})
        window.addEventListener('focus', checkUpdate)
        // Store cleanup so useEffect can remove the listener on unmount
        cleanupFn = () => window.removeEventListener('focus', checkUpdate)

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return
          newWorker.addEventListener('statechange', () => {
            // AppGuard handles version-bump reloads — no auto-reload here
          })
        })
      } catch {
        // SW registration failure is non-fatal — app still works online
      }
    }

    if (document.readyState === 'complete') {
      register()
    } else {
      window.addEventListener('load', register, { once: true })
    }

    // Return cleanup: removes the focus listener added inside register()
    return () => cleanupFn?.()
  }, [])

  return null
}
