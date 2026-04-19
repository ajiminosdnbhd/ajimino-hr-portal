// AJIMINO HR — Service Worker
// Strategy:
//   Static assets (_next/static, icons)  → Cache-First (long-lived, hashed)
//   Google Fonts stylesheet / woff2      → Cache-First (1-year TTL)
//   Navigation (HTML pages)             → Network-First + offline fallback
//   API routes / Supabase               → Network-Only (never cache auth data)

const CACHE_VERSION = 'v3'
const STATIC_CACHE  = `ajimino-static-${CACHE_VERSION}`
const DYNAMIC_CACHE = `ajimino-dynamic-${CACHE_VERSION}`
const FONT_CACHE    = `ajimino-fonts-${CACHE_VERSION}`
const OFFLINE_URL   = '/offline.html'

const PRECACHE_ASSETS = [
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-192x192.png',
]

// ─── Install ────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  )
})

// ─── Activate ───────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  const KEEP = [STATIC_CACHE, DYNAMIC_CACHE, FONT_CACHE]
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !KEEP.includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// ─── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle GET
  if (request.method !== 'GET') return

  // Never intercept API routes or Supabase (auth-sensitive, always fresh)
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('supabase.io')
  ) return

  // Google Fonts → Cache-First (they are immutable once fetched)
  if (url.hostname === 'fonts.gstatic.com' || url.hostname === 'fonts.googleapis.com') {
    event.respondWith(cacheFirst(request, FONT_CACHE))
    return
  }

  // Next.js hashed static chunks + public icons → Cache-First
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // HTML page navigations → Network-First with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithFallback(request))
    return
  }

  // Everything else (unhashed JS chunks, CSS) → Network-First
  event.respondWith(networkFirst(request))
})

// ─── Strategies ─────────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName = STATIC_CACHE) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('', { status: 204, statusText: 'Offline' })
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    return cached || new Response('', { status: 204, statusText: 'Offline' })
  }
}

async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    // Try the cached version of this exact page
    const cached = await caches.match(request)
    if (cached) return cached
    // Last resort: branded offline page
    const offline = await caches.match(OFFLINE_URL)
    return offline || new Response(
      '<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:40px"><h2>You are offline</h2><p>Please check your connection.</p></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    )
  }
}

// ─── Periodic cache cleanup — keep DYNAMIC_CACHE from growing unbounded ─────
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})
