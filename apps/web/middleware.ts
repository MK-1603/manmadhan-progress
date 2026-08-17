import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Minimal JWT decoder for Edge runtime (does not verify signature, only for routing logic)
function parseJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

function getRolePath(role?: string): string {
  const r = (role || "").toUpperCase().trim();
  if (r === "CEO") return "ceo";
  if (r === "CO-CEO") return "co-ceo";
  return "member";
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();
  response.headers.set("x-app-version", "1.0.0");

  // Protected route prefixes
  const isOrganizationRoute =
    pathname.startsWith("/ceo") ||
    pathname.startsWith("/co-ceo") ||
    pathname.startsWith("/member");
  const isPersonalRoute = pathname.startsWith("/personal");

  // If not a protected route, let it pass
  if (!isOrganizationRoute && !isPersonalRoute && pathname !== "/dashboard") {
    return response;
  }

  // Get Auth Token from cookies
  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    // Redirect to login home page if trying to access protected route without token
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Decode Token
  const payload = parseJwt(token);

  if (!payload || !payload.role) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role = payload.role.toUpperCase();
  const rolePath = getRolePath(role);

  // Route Validation & Redirection Manager
  if (isOrganizationRoute) {
    if (pathname.startsWith("/ceo") && role !== "CEO") {
      return NextResponse.redirect(new URL(`/${rolePath}/dashboard`, request.url));
    }
    if (pathname.startsWith("/co-ceo") && role !== "CO-CEO") {
      return NextResponse.redirect(new URL(`/${rolePath}/dashboard`, request.url));
    }
    if (pathname.startsWith("/member") && role !== "MEMBER" && role !== "USER") {
      return NextResponse.redirect(new URL(`/${rolePath}/dashboard`, request.url));
    }
  }

  // Handle Workspace Memory (If they hit generic /dashboard, route them to target workspace)
  if (pathname === "/dashboard") {
    const lastWorkspace = request.cookies.get("last_workspace")?.value;
    if (lastWorkspace === "personal") {
      return NextResponse.redirect(new URL("/personal/dashboard", request.url));
    }
    return NextResponse.redirect(new URL(`/${rolePath}/dashboard`, request.url));
  }

  return response;
}

export const proxy = middleware;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
