const CACHE_NAME = "gymverse-shop-v3";
const OFFLINE_HTML = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GymVerse sin conexión</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#101115;color:#f6f1dc;font-family:Arial,sans-serif}main{max-width:28rem;padding:2rem;text-align:center}img{width:72px;border-radius:18px}h1{color:#ffd700}</style></head><body><main><img src="/logo-yellow-bg.png" alt=""><h1>Sin conexión</h1><p>Revisa tu conexión e intenta volver a GymVerse.</p></main></body></html>`;
const ASSETS = ["/manifest.webmanifest", "/logo-yellow-bg.png", "/logo-white-bg.png"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } })));
    return;
  }
  if (event.request.destination === "script" || event.request.destination === "style") {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }
  event.respondWith(caches.match(event.request).then((response) => response || fetch(event.request)));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("/?view=notifications"));
});
