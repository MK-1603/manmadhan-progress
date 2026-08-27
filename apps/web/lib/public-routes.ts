"use client";

/**
 * Checks whether a given route pathname is a public route that does not
 * require mandatory user authentication or force redirects to /login on 401.
 */
export function isPublicPath(pathname: string): boolean {
  if (!pathname) return false;

  const normalized = pathname.toLowerCase();

  // Root landing page & login
  if (normalized === "/" || normalized === "/login") return true;

  // Public onboarding, setup & invitation paths
  if (normalized.startsWith("/invite") || normalized.startsWith("/invite/")) return true;
  if (normalized.startsWith("/setup") || normalized.startsWith("/setup/")) return true;
  if (normalized.startsWith("/verify-otp")) return true;
  if (normalized.startsWith("/reset-password")) return true;
  if (normalized.startsWith("/activate")) return true;
  if (normalized.startsWith("/welcome")) return true;
  if (normalized.startsWith("/account-not-found")) return true;
  if (normalized.startsWith("/session-expired")) return true;
  if (normalized.startsWith("/offline")) return true;

  return false;
}
