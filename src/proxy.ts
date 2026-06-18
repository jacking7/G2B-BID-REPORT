import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isBlockedCrawlerUserAgent, robotsTagHeaderValue } from "@/lib/crawlers";

const protectedRoutes = ["/settings", "/results"];
const authRoutes = ["/login"];
const sessionCookieName = "g2b_session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get("user-agent");

  if (isBlockedCrawlerUserAgent(userAgent)) {
    return new NextResponse("Forbidden", {
      status: 403,
      headers: {
        "X-Robots-Tag": robotsTagHeaderValue,
      },
    });
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const session = request.cookies.get(sessionCookieName)?.value;

  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  if (isProtected && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL("/settings", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
