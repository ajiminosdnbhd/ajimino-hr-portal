// AJIMINO HR — Service Worker
// Strategy:
//   • Static assets (_next/static, icons, fonts) → Cache-First
//   • Navigation requests (HTML pages)           → Network-First with offline fallback
//   • API routes                                 → Network-Only (never cache)

const CACHE_VERSION = 'v1';
const STATIC_CACHE  = `ajimino-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `ajimino-dynamic-${CACHE_VERSION}`;

const OFFLINE_URL   = '/offline.html';

// Core assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-192x192.png',
];

// ─── Install ────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(PRECACHE_ASSETS))
  );
  // Activate new SW immediately without waiting for old tabs to close
  self.skipWaiting();
});

// ─── Activate ───────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Ignore non-GET and cross-origin requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // 2. Never cache API routes or Supabase calls
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) return;

  // 3. Cache-First for static assets (_next/static, fonts, icons)
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/_next/image') ||
    url.hostname === 'fonts.gstatic.com' ||
    url.hostname === 'fonts.googleapis.com'
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 4. Network-First for HTML navigation (app pages)
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  // 5. Network-First for everything else (JS chunks, CSS)
  event.respondWith(networkFirst(request));
});

// ─── Strategies ─────────────────────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Static asset unavailable offline — return empty 204 rather than erroring
    return new Response('', { status: 204 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('', { status: 204 });
  }
}

async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Try cached version of the same page
    const cached = await caches.match(request);
    if (cached) return cached;

    // Fall back to offline page
    const offlinePage = await caches.match(OFFLINE_URL);
    return offlinePage || new Response('<h1>Offline</h1>', {
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

// ─── Background Sync / Push (reserved for future use) ───────────────────────
// self.addEventListener('push', ...) — not implemented yet
// self.addEventListener('sync', ...) — not implemented yet
