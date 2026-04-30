import { precacheAndRoute } from 'workbox-precaching'
precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (url.pathname.startsWith('/api/') || url.pathname==='/sw.js') return
})

self.addEventListener('push', event => {
  const data = event.data?.json()??{}
  event.waitUntil(self.registration.showNotification(data.title||'Health OS', {
    body:data.body||'', icon:'/icon-192.png', badge:'/icon-192.png', data:{url:data.url||'/'}
  }))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data?.url||'/'))
})
