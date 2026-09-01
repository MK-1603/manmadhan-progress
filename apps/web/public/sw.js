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

  // 1. Network-First Strategy for HTML Navigation Requests (Guarantees instant deployment update detection)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(async (networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedMatch = await caches.match(event.request);
          if (cachedMatch) return cachedMatch;
          const offlineMatch = (await caches.match("/offline")) || (await caches.match("/install")) || (await caches.match("/"));
          if (offlineMatch) return offlineMatch;
          return new Response("Service Temporarily Unavailable", { status: 503 });
        })
    );
    return;
  }

  // 2. Cache-First Strategy for Hashed Static Assets (/_next/static/)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(event.request).then(async (cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          return new Response("Asset Unavailable", { status: 404 });
        }
      })
    );
    return;
  }

  // 3. Stale-While-Revalidate for Other General Assets
  event.respondWith(
    caches.match(event.request).then(async (cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then(async (networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );

  event.waitUntil(cleanExpiredCache());
});
