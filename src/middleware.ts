import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("conversia_session")?.value;

  if (pathname === "/platform" || pathname.startsWith("/platform/")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const needsAuth = pathname.startsWith("/dashboard");

  if ((pathname === "/login" || pathname === "/register") && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (needsAuth && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/register", "/dashboard/:path*", "/platform", "/platform/:path*"],
};
