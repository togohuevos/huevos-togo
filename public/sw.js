// Service Worker v2 - Network-first strategy for app shell
// This ensures users always get the latest version on each visit

const CACHE_NAME = 'huevos-togo-v2';
const STATIC_ASSETS = [
    '/logo.jpg',
    '/logo-pwa.png',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    // Force immediate activation without waiting for old SW to finish
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
});

self.addEventListener('activate', (event) => {
    // Delete old caches that don't match current version
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // ALWAYS fetch HTML from network (never cache index.html)
    if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // For JS/CSS assets: network-first, fallback to cache
    if (url.pathname.startsWith('/assets/')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Static assets: cache-first
    event.respondWith(
        caches.match(event.request).then(response => response || fetch(event.request))
    );
});
