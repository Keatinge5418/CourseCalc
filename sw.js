const CACHE = "coursecalc-v360";
const ASSETS = ["./", "./index.html", "./apple-touch-icon.png", "./dublin_bay.pmtiles"];
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
  // PMTiles asks for byte ranges of one big file. A cached whole-file response cannot answer a
  // Range request, so serve those from the cache by slicing the stored body ourselves; without
  // this the map works online and fails offline.
  if (url.pathname.endsWith(".pmtiles")) {
    e.respondWith((async () => {
      const range = e.request.headers.get("range");
      const cached = await caches.match(new Request(url.href), { ignoreSearch: true });
      const res = cached || await fetch(new Request(url.href));
      if (!range) return res.clone();
      const buf = await res.clone().arrayBuffer();
      const m = /bytes=(\d+)-(\d*)/.exec(range);
      if (!m) return res.clone();
      const start = +m[1], end = m[2] ? +m[2] : buf.byteLength - 1;
      const slice = buf.slice(start, end + 1);
      return new Response(slice, {
        status: 206,
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Range": `bytes ${start}-${end}/${buf.byteLength}`,
          "Content-Length": String(slice.byteLength)
        }
      });
    })());
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
