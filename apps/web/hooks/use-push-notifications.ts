import { useState, useEffect } from "react";
import apiClient from "@/lib/api-client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      registerServiceWorker();
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const sub = await registration.pushManager.getSubscription();
      setSubscription(sub);
    } catch (error) {
      console.error("Service Worker registration failed:", error);
    }
  };

  const subscribe = async () => {
    if (!isSupported) return;

    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== "granted") {
        throw new Error("Permission not granted for Notification");
      }

      // Fetch VAPID public key
      const { data } = await apiClient.get("/notifications/vapid-public-key");
      const publicVapidKey = data.publicKey;

      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
      });

      // Send to backend
      await apiClient.post("/notifications/subscribe", sub);
      
      setSubscription(sub);
      return sub;
    } catch (error) {
      console.error("Failed to subscribe to push notifications", error);
      throw error;
    }
  };

  const unsubscribe = async () => {
    if (!subscription) return;
    
    try {
      await apiClient.delete("/notifications/unsubscribe", {
        data: { endpoint: subscription.endpoint }
      });
      await subscription.unsubscribe();
      setSubscription(null);
    } catch (error) {
      console.error("Failed to unsubscribe", error);
    }
  };

  return {
    isSupported,
    permission,
    subscription,
    subscribe,
    unsubscribe,
  };
}
