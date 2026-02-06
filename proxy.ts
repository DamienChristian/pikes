import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Define public routes that don't require authentication
const publicRoutes = [
  "/auth/login",
  "/auth/signup",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
];

// Define auth routes (redirect to home if already authenticated)
const authRoutes = ["/auth/login", "/auth/signup"];

// Get JWT secret
const getSecret = () => {
  const secret =
    process.env.JWT_SECRET ||
    "your-secret-key-min-32-chars-long-for-development";
  return new TextEncoder().encode(secret);
};

// Verify if session token is valid
async function isValidSession(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow access to API routes and static files
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Get session token from cookies and validate it
  const sessionToken = request.cookies.get("session")?.value;
  const hasValidSession = sessionToken
    ? await isValidSession(sessionToken)
    : false;

  // If user is on an auth route and has a valid session, redirect to home
  if (hasValidSession && authRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If user is on a protected route and has no valid session, redirect to login
  if (!hasValidSession && !publicRoutes.includes(pathname)) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
