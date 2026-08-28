const CACHE_NAME = "manmadhan-pwa-v1.4.2";
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 Hours TTL

const PRECACHE_ASSETS = [
  "/",
  "/manifest.json",
  "/install",
  "/updates",
  "/about",
  "https://res.cloudinary.com/fmiadecb/image/upload/v1786817328/ic_launcher-web_bq8zjj.png"
];

// Sensitive endpoints MUST NOT be stored in offline cache
const SENSITIVE_ENDPOINTS = [
  "/api/v1/auth/",
  "/api/v1/users/",
  "/api/v1/organization/",
  "/api/v1/projects/",
  "/api/v1/tasks/",
  "/api/v1/chat/",
  "/api/v1/audit/"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  // Do NOT automatically skipWaiting in install if update readiness is controlled by UI
  // self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Listen for SKIP_WAITING postMessage from PWA update UI
self.addEventListener("message", (event) => {
  if (event.data && (event.data.type === "SKIP_WAITING" || event.data === "skipWaiting")) {
    self.skipWaiting();
  }
});

// Periodic or fetch-based TTL Cache Cleanup
async function cleanExpiredCache() {
  const cache = await caches.open(CACHE_NAME);
  const requests = await cache.keys();
  const now = Date.now();

  for (const req of requests) {
    const res = await cache.match(req);
    if (res) {
      const cachedAtHeader = res.headers.get("x-manmadhan-cached-at");
      if (cachedAtHeader) {
        const cachedAt = parseInt(cachedAtHeader, 10);
        if (now - cachedAt > CACHE_TTL_MS) {
          await cache.delete(req);
        }
      }
    }
  }
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip caching for non-GET, sensitive API requests, or auth/oauth redirect query flows
  if (
    event.request.method !== "GET" ||
    SENSITIVE_ENDPOINTS.some((ep) => url.pathname.startsWith(ep)) ||
    url.searchParams.has("redirect") ||
    url.searchParams.has("auth_step") ||
    url.searchParams.has("token") ||
    url.searchParams.has("code") ||
    url.pathname.includes("/auth") ||
    url.pathname.includes("/github")
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(async (cachedResponse) => {
      if (cachedResponse) {
        const cachedAt = cachedResponse.headers.get("x-manmadhan-cached-at");
        if (cachedAt && Date.now() - parseInt(cachedAt, 10) < CACHE_TTL_MS) {
          return cachedResponse;
        }
      }

      try {
        const networkResponse = await fetch(event.request);
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          const headers = new Headers(responseToCache.headers);
          headers.append("x-manmadhan-cached-at", Date.now().toString());

          const responseWithTimestamp = new Response(await responseToCache.blob(), {
            status: responseToCache.status,
            statusText: responseToCache.statusText,
            headers: headers,
          });

          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, responseWithTimestamp);
        }
        return networkResponse;
      } catch (err) {
        if (cachedResponse) return cachedResponse;
        if (event.request.mode === "navigate") {
          const offlineMatch = (await caches.match("/offline")) || (await caches.match("/install")) || (await caches.match("/"));
          if (offlineMatch) return offlineMatch;
        }
        try {
          return await fetch(event.request.url, { redirect: "follow" });
        } catch {
          return new Response("Service Temporarily Unavailable", {
            status: 503,
            statusText: "Service Unavailable",
          });
        }
      }
    })
  );

  event.waitUntil(cleanExpiredCache());
});
