const CACHE_NAME = 'ghana-market-v5'; // Increment version to force update
const URLS_TO_CACHE = [
  '/',
  'index.html',
  'app.js',
  'style.css',
  'how-to-sell.html',
  'safety-tips.html',
  'contact.html',
  'terms.html',
  'privacy.html',
  'logo.png',
  'icon-192.png',
  'icon-512.png',
  'manifest.json',
  'https://unpkg.com/lucide@latest'
];

// Listen for messages from the client to skip waiting
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(URLS_TO_CACHE);
      })
      .then(() => self.skipWaiting()) // Force the waiting service worker to become the active service worker.
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all open pages.
  );
});

self.addEventListener('fetch', event => {
  // Let the browser handle non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // For HTML pages, use a network-first strategy.
  if (event.request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // If the fetch is successful, clone it and store in cache.
          if (response.ok) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try to serve from cache.
          return caches.match(event.request);
        })
    );
    return;
  }

  // For other assets (CSS, JS, images), use a cache-first strategy.
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Return from cache if available.
      if (cachedResponse) {
        return cachedResponse;
      }
      // Otherwise, fetch from network, cache it, and return the response.
      return fetch(event.request).then(networkResponse => {
        if (networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseToCache);
            });
        }
        return networkResponse;
      });
    })
  );
});