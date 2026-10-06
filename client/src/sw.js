/* Service worker: offline app shell + Android "Share to Nagham" target. */
import { precacheAndRoute, createHandlerBoundToURL, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { dbPromise } from './lib/db.js';

self.skipWaiting();
self.addEventListener('activate', () => self.clients.claim());

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Every page route serves the app shell (works with no network)
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html'), { denylist: [/^\/api\//, /^\/media\//, /^\/share-target/] }));

// Album covers rarely change – keep them for offline browsing
registerRoute(
  ({ url }) => url.pathname.startsWith('/media/covers/'),
  new CacheFirst({ cacheName: 'covers', plugins: [new ExpirationPlugin({ maxEntries: 800, maxAgeSeconds: 60 * 60 * 24 * 365 })] })
);

// Web Share Target: files shared from other apps arrive here as a POST
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === 'POST' && url.pathname === '/share-target') {
    event.respondWith(
      (async () => {
        try {
          const form = await event.request.formData();
          const files = form.getAll('audio').filter((f) => f && typeof f !== 'string');
          const db = await dbPromise;
          for (const file of files) await db.add('shares', { file, at: Date.now() });
        } catch (e) {
          console.warn('share-target failed', e);
        }
        return Response.redirect(`/import?shared=${Date.now()}`, 303);
      })()
    );
  }
});
