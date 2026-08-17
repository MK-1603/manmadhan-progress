const CACHE_NAME = "manmadhan-offline-v2";
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 Hours TTL

const PRECACHE_ASSETS = [
  "/",
  "/manifest.json",
  "https://res.cloudinary.com/fmiadecb/image/upload/v1786817328/ic_launcher-web_bq8zjj.png"
];

// Sensitive endpoints MUST NOT be stored in offline cache
const SENSITIVE_ENDPOINTS = [
  "/api/auth/",
  "/api/users/",
  "/api/organization/",
  "/api/projects/",
  "/api/tasks/",
  "/api/chat/",
  "/api/audit/"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
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

// Periodic or fetch-based TTL Cache Cleanup (2 Hours)
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
    url.pathname.includes("/auth")
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
          const offlineMatch = (await caches.match("/offline")) || (await caches.match("/"));
          if (offlineMatch) return offlineMatch;
        }
        // Graceful fallback fetch with redirect follow to prevent FetchEvent rejection
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

// Push Notification Handling
self.addEventListener("push", function (event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || "https://res.cloudinary.com/fmiadecb/image/upload/v1786817328/ic_launcher-web_bq8zjj.png",
      badge: "/badge.png",
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: "2",
        url: data.url || "/"
      },
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const urlToOpen = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
