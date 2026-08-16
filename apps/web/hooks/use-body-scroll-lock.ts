"use client";

import { useEffect, useRef } from "react";

let activeLockCount = 0;
let savedScrollPosition = 0;
let originalBodyOverflow = "";
let originalBodyTouchAction = "";
let originalBodyPosition = "";
let originalBodyTop = "";
let originalBodyWidth = "";
let originalHtmlOverflow = "";

function preventGlobalTouch(e: TouchEvent) {
  const target = e.target as HTMLElement | null;

  // If touch is inside a registered scroll container
  if (target && target.closest("[data-scrollable='true']")) {
    const scrollContainer = target.closest("[data-scrollable='true']") as HTMLElement;
    if (scrollContainer) {
      const isScrollable = scrollContainer.scrollHeight > scrollContainer.clientHeight;
      if (isScrollable) {
        return; // Allow internal scrolling
      }
    }
  }

  // Otherwise block background scrolling & gesture chaining
  if (e.cancelable) {
    e.preventDefault();
  }
}

function lockGlobalScroll() {
  if (typeof window === "undefined") return;

  if (activeLockCount === 0) {
    savedScrollPosition = window.scrollY || window.pageYOffset || 0;
    originalBodyOverflow = document.body.style.overflow;
    originalBodyTouchAction = document.body.style.touchAction;
    originalBodyPosition = document.body.style.position;
    originalBodyTop = document.body.style.top;
    originalBodyWidth = document.body.style.width;
    originalHtmlOverflow = document.documentElement.style.overflow;

    // Apply WebKit physical scroll lock to freeze body DOM tree
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    document.body.style.position = "fixed";
    document.body.style.top = `-${savedScrollPosition}px`;
    document.body.style.width = "100%";
    document.documentElement.style.overflow = "hidden";

    document.addEventListener("touchmove", preventGlobalTouch, { passive: false });
  }

  activeLockCount++;
}

function unlockGlobalScroll() {
  if (typeof window === "undefined" || activeLockCount === 0) return;

  activeLockCount--;

  if (activeLockCount === 0) {
    document.body.style.overflow = originalBodyOverflow;
    document.body.style.touchAction = originalBodyTouchAction;
    document.body.style.position = originalBodyPosition;
    document.body.style.top = originalBodyTop;
    document.body.style.width = originalBodyWidth;
    document.documentElement.style.overflow = originalHtmlOverflow;

    document.removeEventListener("touchmove", preventGlobalTouch);

    window.scrollTo(0, savedScrollPosition);
  }
}

/**
 * Custom React hook to reliably lock body scrolling when a modal or sheet is active.
 * Uses reference counting & WebKit physical fixed positioning so stacked overlays restore body scrolling only when all overlays close.
 */
export function useBodyScrollLock(isLocked: boolean) {
  const wasLockedRef = useRef(false);

  useEffect(() => {
    if (isLocked && !wasLockedRef.current) {
      lockGlobalScroll();
      wasLockedRef.current = true;
    } else if (!isLocked && wasLockedRef.current) {
      unlockGlobalScroll();
      wasLockedRef.current = false;
    }

    return () => {
      if (wasLockedRef.current) {
        unlockGlobalScroll();
        wasLockedRef.current = false;
      }
    };
  }, [isLocked]);
}
