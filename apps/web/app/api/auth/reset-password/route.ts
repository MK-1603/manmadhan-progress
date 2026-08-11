import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { newPassword } = await request.json();
    
    if (!newPassword) {
      return NextResponse.json({ success: false, error: "New password required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const resetToken = cookieStore.get("reset_session_token")?.value;
    if (!resetToken) {
      return NextResponse.json({ success: false, error: "No active reset session. Please request a new link." }, { status: 401 });
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100/api/v1";
    
    // Submit to backend
    const response = await fetch(`${backendUrl}/auth/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        resetSessionToken: resetToken,
        newPassword
      }),
      cache: "no-store",
    });

    const data = await response.json();

    if (data.success) {
      // Clear the reset session cookie on success
      const cookieStore = await cookies();
      cookieStore.delete("reset_session_token");
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: data.error || "Failed to reset password" }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
