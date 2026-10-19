const CACHE_NAME = 'xmum-schedule-v26';
const ASSETS_TO_CACHE = [
  '/',
  './',
  'index.html',
  'app.css',
  'app.js',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png',
  'icon.svg',
  'favicon.ico',
  'data/academic_calendar.js',
  'data/sample_schedule.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((url) =>
          cache.add(url).catch((err) => console.warn('[SW] Cache add skipped for:', url, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Dynamic API routes: Network-first with friendly offline fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ success: false, error: "网络无法连通：请检查手机网络状态", offline: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Bypass external analytics to avoid caching noise
  if (url.hostname.includes('vercel') || url.hostname.includes('google-analytics')) {
    return;
  }

  // 1. Navigation Request (User visits root domain, reloads page, or opens PWA app icon)
  // Network-First with Cache Fallback: ensures latest UI on reload while supporting full offline use
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put('index.html', responseToCache);
            cache.put('/', responseToCache.clone());
          });
        }
        return networkResponse;
      }).catch(() => {
        return caches.match('index.html');
      })
    );
    return;
  }

  // 2. Static Resources (CSS, JS, Fonts, Images)
  // Exact match with version query; if query changes (?v=26), fetches fresh asset from network!
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        return cachedResponse;
      });

      // If cached with exact version, return cached; otherwise use fresh network fetch
      return cachedResponse || fetchPromise;
    })
  );
});
