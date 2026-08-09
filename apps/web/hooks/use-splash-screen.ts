"use client";

import { useEffect, useState } from "react";

export function useSplashScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!visible) return;

    // Immediately hide for returning visitors
    if (sessionStorage.getItem("splashShown")) {
      setVisible(false);
      return;
    }
    
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem("splashShown", "true");
    }, reduced ? 900 : 2450);
    return () => window.clearTimeout(timer);
  }, [visible]);

  return visible;
}
