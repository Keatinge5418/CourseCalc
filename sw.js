const CACHE = "coursecalc-v147";
const ASSETS = ["./", "./index.html", "./apple-touch-icon.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(
    ks.filter(k => k !== CACHE).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});
// Lets the page ask which worker is actually running (an old worker will not answer).
self.addEventListener("message", e => {
  if (e.data === "version" && e.source) e.source.postMessage({ sw: CACHE });
});
self.addEventListener("fetch", e => {
  // Only ever handle our own GET requests. Cross-origin calls (the weather API) must go
  // straight to the network: intercepting them breaks CORS on some iOS builds.
  let url;
  try { url = new URL(e.request.url); } catch (err) { return; }
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
