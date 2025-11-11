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
  if (!pathname.startsWith("/private")) {
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
  // Staff restriction: staff cannot access /private/admin/*
  const role = req.cookies.get("cloack_role")?.value;
  if (role === "staff" && pathname.startsWith("/private/admin")) {
    if (pathname !== "/not-allowed") {
      return NextResponse.rewrite(new URL("/not-allowed", req.url));
    }
  }

  // Event-level authorization for staff: only allow /private/handover and /private/handovers
  if (role === "staff") {
    const allowed =
      pathname === "/private" ||
      pathname.startsWith("/private/handover") ||
      pathname.startsWith("/private/handovers") ||
      pathname === "/not-allowed";
    if (!allowed) {
      return NextResponse.rewrite(new URL("/not-allowed", req.url));
    }
  }
  // NOTE: Middleware runs on the Edge runtime. We perform minimal checks and only light DB reads.
  return NextResponse.next();
}

export const config = {
  matcher: ["/private/:path*", "/not-allowed"],
};
