'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
  prompt(): Promise<void>
}

const DISMISSED_KEY = 'pwa-install-dismissed'

function isIOS() {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream
}

function isInStandaloneMode() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [show, setShow] = useState(false)
  const [showIOS, setShowIOS] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    // Already installed or user dismissed this session
    if (isInStandaloneMode() || sessionStorage.getItem(DISMISSED_KEY)) return

    // ── iOS Safari: no beforeinstallprompt, show manual instructions ──
    if (isIOS()) {
      setTimeout(() => setShowIOS(true), 3500)
      return
    }

    // ── Android / Chrome / Edge: standard install prompt ──
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setTimeout(() => setShow(true), 3000)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    setInstalling(true)
    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setShow(false)
    } finally {
      setInstalling(false)
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setShow(false)
    setShowIOS(false)
    sessionStorage.setItem(DISMISSED_KEY, '1')
  }

  // ── iOS install instructions banner ─────────────────────────────────────
  if (showIOS) {
    return (
      <div
        role="dialog"
        aria-label="Install AJIMINO HR on iOS"
        className="fixed bottom-20 left-3 right-3 z-50 sm:left-auto sm:right-4 sm:w-80"
      >
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-11 h-11 rounded-xl overflow-hidden bg-[#0A1128] flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/icon-96x96.png" alt="" width={44} height={44} className="w-full h-full object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 leading-tight">Add to Home Screen</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Tap{' '}
                <span className="inline-flex items-center gap-0.5 align-middle">
                  <svg className="w-3.5 h-3.5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2a1 1 0 01.707.293l4 4a1 1 0 01-1.414 1.414L13 5.414V16a1 1 0 11-2 0V5.414L8.707 7.707A1 1 0 017.293 6.293l4-4A1 1 0 0112 2zM3 17a1 1 0 011-1h16a1 1 0 110 2H4a1 1 0 01-1-1zm1 3a1 1 0 100 2h16a1 1 0 100-2H4z"/>
                  </svg>
                </span>{' '}
                then <strong className="text-slate-700">&ldquo;Add to Home Screen&rdquo;</strong> to install AJIMINO HR.
              </p>
            </div>
            <button onClick={handleDismiss} aria-label="Dismiss" className="shrink-0 text-slate-400 hover:text-slate-600 -mt-0.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* iOS caret arrow pointing down toward Safari toolbar */}
          <div className="flex justify-center mt-2">
            <svg className="w-4 h-4 text-gray-200" fill="currentColor" viewBox="0 0 16 8">
              <path d="M8 8L0 0h16z" />
            </svg>
          </div>
        </div>
      </div>
    )
  }

  // ── Android / Chrome install prompt banner ───────────────────────────────
  if (!show) return null

  return (
    <div
      role="dialog"
      aria-label="Install AJIMINO HR app"
      className="fixed bottom-20 left-3 right-3 z-50 sm:left-auto sm:right-4 sm:w-80"
    >
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 flex items-start gap-3">
        <div className="shrink-0 w-11 h-11 rounded-xl overflow-hidden bg-[#0A1128] flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-96x96.png" alt="" width={44} height={44} className="w-full h-full object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 leading-tight">Add to Home Screen</p>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            Install AJIMINO HR for faster access, even offline.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleInstall}
              disabled={installing}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-lg transition disabled:opacity-60"
            >
              {installing ? 'Installing…' : 'Install'}
            </button>
            <button
              onClick={handleDismiss}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold py-2 rounded-lg transition"
            >
              Not now
            </button>
          </div>
        </div>
        <button onClick={handleDismiss} aria-label="Dismiss" className="shrink-0 text-slate-400 hover:text-slate-600 -mt-0.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
