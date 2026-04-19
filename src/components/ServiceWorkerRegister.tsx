'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        })

        // Check for updates every time the page gains focus
        const checkUpdate = () => registration.update().catch(() => {})
        window.addEventListener('focus', checkUpdate)

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            // New SW is ready — reload if user is not mid-action
            if (
              newWorker.state === 'activated' &&
              navigator.serviceWorker.controller
            ) {
              // The new SW is in control after reload
              // We deliberately do NOT auto-reload — AppGuard handles version-bump reloads
            }
          })
        })

        return () => window.removeEventListener('focus', checkUpdate)
      } catch (err) {
        // SW registration failure is non-fatal — app still works online
        console.warn('[SW] Registration failed:', err)
      }
    }

    // Defer registration until after page load to avoid blocking critical resources
    if (document.readyState === 'complete') {
      register()
    } else {
      window.addEventListener('load', register, { once: true })
    }
  }, [])

  return null
}
