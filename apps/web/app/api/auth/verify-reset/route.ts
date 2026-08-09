import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/?auth_step=ERROR&error=invalid_reset_token", request.url));
  }

  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
    
    // Validate with backend
    const response = await fetch(`${backendUrl}/auth/reset/verify?token=${token}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const data = await response.json();

    if (data.success && data.resetSessionToken) {
      // Securely store the short-lived session in an HttpOnly cookie
      const cookieStore = await cookies();
      cookieStore.set({
        name: "reset_session_token",
        value: data.resetSessionToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 15 * 60, // 15 minutes
      });

      // Redirect to the clean reset route in the main app to trigger the modal
      return NextResponse.redirect(new URL("/?auth_step=RESET_PASSWORD", request.url));
    } else {
      const errorMsg = data.error?.toLowerCase().includes("expired") ? "expired" : "invalid";
      return NextResponse.redirect(new URL(`/?auth_step=ERROR&error=${errorMsg}`, request.url));
    }
  } catch (err) {
    return NextResponse.redirect(new URL("/?auth_step=ERROR&error=server", request.url));
  }
}
