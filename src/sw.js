import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { NetworkFirst } from 'workbox-strategies'
import { registerRoute } from 'workbox-routing'

// Always activate the new SW immediately
self.skipWaiting()
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

// Clean up any stale caches from previous builds
cleanupOutdatedCaches()

// Precache the build assets (hashed JS/CSS)
precacheAndRoute(self.__WB_MANIFEST)

// Network-first for navigation requests (HTML) — always try to get the latest
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({ cacheName: 'pages', networkTimeoutSeconds: 3 })
)

// API calls always go to network — never cache
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request))
  }
})

self.addEventListener('push', event => {
  const data = event.data?.json() ?? {}
  event.waitUntil(self.registration.showNotification(data.title || 'Health', {
    body: data.body || '', icon: '/icon-192.png', badge: '/icon-192.png', data: { url: data.url || '/' }
  }))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/'))
})
