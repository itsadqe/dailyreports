const CACHE_NAME = 'sadqe-report-offline-v1';
const APP_SHELL = ['./index.html', './manifest.json'];
const CHART_URL = 'https://cdn.jsdelivr.net/npm/chart.js';

self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(APP_SHELL);
        try {
            const chartResponse = await fetch(CHART_URL, { mode: 'cors' });
            if (chartResponse.ok) await cache.put(CHART_URL, chartResponse);
        } catch (error) {
            console.warn('Chart.js could not be precached:', error);
        }
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames
            .filter(name => name.startsWith('sadqe-report-offline-') && name !== CACHE_NAME)
            .map(name => caches.delete(name)));
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    event.respondWith((async () => {
        const cachedResponse = await caches.match(event.request);
        try {
            const networkResponse = await fetch(event.request);
            if (networkResponse.ok || networkResponse.type === 'opaque') {
                const cache = await caches.open(CACHE_NAME);
                try {
                    await cache.put(event.request, networkResponse.clone());
                } catch (error) {
                    console.warn('Offline cache write failed:', error);
                }
            }
            return networkResponse;
        } catch (error) {
            if (cachedResponse) return cachedResponse;
            if (event.request.mode === 'navigate') {
                const appShell = await caches.match('./index.html');
                if (appShell) return appShell;
            }
            throw error;
        }
    })());
});
