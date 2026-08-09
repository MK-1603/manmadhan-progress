importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SET_FIREBASE_CONFIG") {
    const config = event.data.config;
    if (config && !firebase.apps.length) {
      firebase.initializeApp(config);
      const messaging = firebase.messaging();
      messaging.onBackgroundMessage((payload) => {
        const title = payload.notification?.title || "Notification";
        const options = {
          body: payload.notification?.body || "",
          icon: "/favicon.ico",
        };
        self.registration.showNotification(title, options);
      });
    }
  }
});
