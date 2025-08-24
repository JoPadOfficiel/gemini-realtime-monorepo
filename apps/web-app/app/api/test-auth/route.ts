import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { encode } from "next-auth/jwt";

export async function GET(request: NextRequest) {
  try {
    // Create a JWT token for the test user
    const token = await encode({
      token: {
        sub: "cmeamuyl90000it3aeule9tr5", // Test user ID
        email: "test@example.com",
        name: "Test User",
        role: "USER",
      },
      secret: process.env.NEXTAUTH_SECRET || "your-secret-key-here",
      salt: "authjs.session-token",
    });

    // Set the session cookie
    const cookieStore = await cookies();
    cookieStore.set("next-auth.session-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    // Redirect to dashboard
    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (error) {
    console.error("Test auth error:", error);
    return NextResponse.json({ error: "Failed to authenticate" }, { status: 500 });
  }
}
