// Service Worker v13.7 - Regreso al Estilo Llamativo (v1.3.7)
// Guarantees users always see the latest version of the app

const CACHE_NAME = 'huevos-togo-v13.7';
const STATIC_IMAGES = ['/logo.jpg', '/logo-pwa.png'];

self.addEventListener('install', (event) => {
    // Activate immediately, don't wait
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_IMAGES))
    );
});

self.addEventListener('activate', (event) => {
    // Delete ALL old caches on activation
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests and cross-origin requests
    if (event.request.method !== 'GET' || !url.origin.startsWith(self.location.origin)) {
        return;
    }

    // NETWORK-FIRST for everything: HTML, JS, CSS, fonts, etc.
    // This ensures updates from Vercel are always picked up immediately
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Cache a copy of static images only
                if (STATIC_IMAGES.includes(url.pathname)) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(() => {
                // Fallback to cache only if offline
                return caches.match(event.request);
            })
    );
});
