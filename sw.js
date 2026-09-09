const CACHE_VERSION = "drive-v0.6";

const APP_SHELL = [
    "./",
    "./index.html",
    "./styles.css",
    "./app.js",
    "./db.js",
    "./gps.js",
    "./manifest.json",
    "./icons/icon.svg"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_VERSION).then(cache => cache.addAll(APP_SHELL))
    );
    self.skipWaiting();
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(key => key.startsWith("drive-") && key !== CACHE_VERSION)
                .map(key => caches.delete(key))
        ))
    );
    self.clients.claim();
});

self.addEventListener("fetch", event => {
    const request = event.request;
    if (request.method !== "GET") return;

    // HTML and JavaScript must always check the network first so deployments
    // become visible without a hard refresh. Other assets remain cache-first.
    const isUpdateSensitive = request.mode === "navigate" ||
        request.destination === "script" ||
        request.destination === "style";

    event.respondWith(
        isUpdateSensitive
            ? fetch(request, { cache: "no-store" })
                .then(response => {
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_VERSION).then(cache => cache.put(request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(request).then(cached => cached || caches.match("./index.html")))
            : caches.match(request).then(cached => cached || fetch(request).then(response => {
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_VERSION).then(cache => cache.put(request, clone));
                }
                return response;
            }).catch(() => undefined))
    );
});

self.addEventListener("message", event => {
    if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
