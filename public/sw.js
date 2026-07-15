const CACHE_NAME = 'ololu-pwa-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
  '/favicon.svg'
];

// Perform installation and cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[OLOLU Service Worker] Pre-caching core assets...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[OLOLU Service Worker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - cache-first with network fallback for assets, network-first for others
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Skip non-GET requests, API routes, or Supabase websockets
  if (
    event.request.method !== 'GET' ||
    requestUrl.pathname.startsWith('/api') ||
    requestUrl.hostname.includes('supabase') ||
    requestUrl.hostname.includes('googleapis')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Serve from cache, but update cache in the background for non-static assets
          if (!ASSETS_TO_CACHE.includes(requestUrl.pathname)) {
            fetch(event.request)
              .then((networkResponse) => {
                if (networkResponse.status === 200) {
                  caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
                }
              })
              .catch(() => { /* Ignore offline update errors */ });
          }
          return cachedResponse;
        }

        // Network fallback
        return fetch(event.request).then((networkResponse) => {
          // Don't cache range responses or partial content
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
            return networkResponse;
          }

          // Cache newly fetched assets dynamically
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        }).catch(() => {
          // If offline and request is for index.html or document, return index from cache
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});
