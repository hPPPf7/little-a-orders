// Increase for every web release. Active clients continue using one coherent version.
const CACHE = "little-a-1.0.5";
const FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./model.js",
  "./storage.js",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-180.png",
  "./manifest.webmanifest",
];
self.addEventListener("install", (e) =>
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))),
);
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("little-a-") && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      ),
  ),
);
self.addEventListener("fetch", (e) => {
  if (
    e.request.method !== "GET" ||
    new URL(e.request.url).origin !== self.location.origin
  )
    return;
  e.respondWith(
    caches
      .open(CACHE)
      .then(async (c) => (await c.match(e.request)) || fetch(e.request)),
  );
});
