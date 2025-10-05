import { NextRequest, NextResponse } from "next/server";
import { SESS_COOKIE } from "@/lib/auth";

// Paths that don't require auth inside /admin
const adminPublic = [
  "/private/admin/login",
  "/private/admin/reset/request",
];

// Dynamic reset token route: /admin/reset/<token>
function isAdminPublicPath(path: string) {
  if (adminPublic.includes(path)) return true;
  if (path.startsWith("/private/admin/reset/") && path.split("/").length === 5) return true; // /private/admin/reset/<token>
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/private/admin") && !pathname.startsWith("/private/handover")) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/private/admin") && isAdminPublicPath(pathname)) {
    return NextResponse.next();
  }
  // Use the same cookie name the login route sets (SESS_COOKIE / "cloack_session")
  const cookie = req.cookies.get(SESS_COOKIE)?.value;
  if (!cookie) {
    return NextResponse.redirect(new URL("/private/admin/login", req.url));
  }
  // Staff restriction: if role cookie says staff and path is not within /handover, block.
  const role = req.cookies.get("cloack_role")?.value;
  if (role === "staff" && !pathname.startsWith("/private/handover")) {
    if (pathname !== "/not-allowed") {
      return NextResponse.rewrite(new URL("/not-allowed", req.url));
    }
  }
  // NOTE: Middleware runs on the Edge runtime (no Node 'crypto' / native modules).
  // Avoid hitting MongoDB here (driver requires Node APIs and was causing runtime errors).
  // We perform only a lightweight presence check for the session cookie.
  // Deeper validation (token expiry / user existence) should happen in server components or API routes.
  // If stronger protection is needed, implement a signed/JWT cookie or move validation to a shared layout.
  return NextResponse.next();
}

export const config = {
  matcher: ["/private/admin/:path*", "/private/handover/:path*", "/not-allowed"],
};
