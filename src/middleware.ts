import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const authPaths = ["/dashboard", "/platform"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("conversia_session")?.value;

  const needsAuth = authPaths.some((p) => pathname.startsWith(p));

  // La raíz es siempre la landing pública (marketing); el panel es /dashboard o /platform.

  if ((pathname === "/login" || pathname === "/register") && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (needsAuth && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/register", "/dashboard/:path*", "/platform/:path*"],
};
