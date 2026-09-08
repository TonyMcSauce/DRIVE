const CACHE_NAME="drive-shell-v5-0-0";
const APP_SHELL=["./","./index.html","./styles.css","./manifest.json","./sw.js","./db.js","./app.js"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(APP_SHELL)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;const u=new URL(e.request.url);if(u.origin!==self.location.origin)return;e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE_NAME).then(cache=>cache.put(e.request,c));return r}).catch(()=>caches.match(e.request).then(c=>c||caches.match("./index.html"))));});
self.addEventListener("message",e=>{if(e.data==="CHECK_FOR_UPDATE")self.registration.update()});
