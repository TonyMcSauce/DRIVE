const CACHE_VERSION = "drive-v0.7";

const APP_SHELL = [
    "./", "./index.html", "./styles.css", "./app.js", "./db.js", "./gps.js",
    "./maintenance.js", "./data-tools.js", "./v0.6.js", "./insights.js", "./v0.7.js",
    "./manifest.json", "./icons/icon.svg"
];

self.addEventListener("install", event => {
    event.waitUntil(caches.open(CACHE_VERSION).then(cache => cache.addAll(APP_SHELL)));
    self.skipWaiting();
});

self.addEventListener("activate", event => {
    event.waitUntil(caches.keys().then(keys => Promise.all(
        keys.filter(key => key.startsWith("drive-") && key !== CACHE_VERSION).map(key => caches.delete(key))
    )));
    self.clients.claim();
});

self.addEventListener("fetch", event => {
    const request = event.request;
    if (request.method !== "GET") return;

    const sensitive = request.mode === "navigate" || request.destination === "script" || request.destination === "style";
    event.respondWith(
        sensitive
            ? fetch(request, { cache: "no-store" }).then(response => {
                if (response?.status === 200) caches.open(CACHE_VERSION).then(c => c.put(request, response.clone()));
                return response;
            }).catch(() => caches.match(request).then(c => c || caches.match("./index.html")))
            : caches.match(request).then(c => c || fetch(request).then(response => {
                if (response?.status === 200) caches.open(CACHE_VERSION).then(cache => cache.put(request, response.clone()));
                return response;
            }))
    );
});

self.addEventListener("message", event => {
    if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
