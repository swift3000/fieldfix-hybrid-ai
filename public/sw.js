const CACHE_NAME = "fieldfix-shell-v0.3.0";
const APP_SCOPE = new URL("./", self.registration.scope).href;
const SHELL = [APP_SCOPE, new URL("manifest.webmanifest", APP_SCOPE).href];

function isInAppScope(url) {
  return url.origin === self.location.origin && url.href.startsWith(APP_SCOPE);
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("fieldfix-shell-") && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || !isInAppScope(url)) return;

  // Only the two public shell URLs may be cached. Other requests bypass this worker.
  if (!SHELL.includes(url.href)) return;
  event.respondWith(fetch(request).then(async (response) => {
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  }).catch(async () => (await caches.match(request)) || Response.error()));
});
