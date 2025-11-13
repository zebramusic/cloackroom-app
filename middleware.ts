import { NextRequest, NextResponse } from "next/server";
import { SESS_COOKIE } from "@/lib/auth";

const defaultCorsOrigins = ["http://localhost:8081"];
const envCorsOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedCorsOrigins = envCorsOrigins?.length
  ? envCorsOrigins
  : defaultCorsOrigins;

const DEV_TUNNEL_SUFFIX = ".devtunnels.ms";

function resolveCorsOrigin(origin: string | null): string | null {
  if (!origin) return allowedCorsOrigins[0] ?? null;
  if (allowedCorsOrigins.includes(origin)) return origin;
  try {
    const parsed = new URL(origin);
    if (parsed.hostname.endsWith(DEV_TUNNEL_SUFFIX)) {
      return origin;
    }
  } catch (error) {
    // ignore invalid origins
  }
  return null;
}

function applyCorsHeaders(req: NextRequest, res: NextResponse) {
  const origin = resolveCorsOrigin(req.headers.get("origin"));
  if (origin) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Vary", "Origin");
  }
  res.headers.set("Access-Control-Allow-Credentials", "true");
  const requestedHeaders = req.headers.get("access-control-request-headers");
  if (requestedHeaders) {
    res.headers.set("Access-Control-Allow-Headers", requestedHeaders);
  } else {
    res.headers.set(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept"
    );
  }
  res.headers.set(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );
  return res;
}

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
  if (pathname.startsWith("/api/")) {
    if (req.method === "OPTIONS") {
      const preflight = new NextResponse(null, { status: 204 });
      return applyCorsHeaders(req, preflight);
    }
    const res = NextResponse.next();
    return applyCorsHeaders(req, res);
  }
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
  matcher: ["/api/:path*", "/private/:path*", "/not-allowed"],
};
