import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { appPath, stripAppBasePath } from "@/lib/app-paths";
import { isBlockedCrawlerUserAgent, robotsTagHeaderValue } from "@/lib/crawlers";

const protectedRoutes = ["/settings", "/results"];
const authRoutes = ["/login"];
const sessionCookieName = "g2b_session";

function withRobotsTag(response: NextResponse) {
  response.headers.set("X-Robots-Tag", robotsTagHeaderValue);
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const appPathname = stripAppBasePath(pathname);
  const canonicalAppPathname = stripAppBasePath(appPathname);
  const userAgent = request.headers.get("user-agent");

  if (canonicalAppPathname !== appPathname) {
    return withRobotsTag(
      NextResponse.redirect(
        new URL(appPath(canonicalAppPathname), request.url),
      ),
    );
  }

  if (appPathname === "/robots.txt") {
    if (pathname === appPath("/robots.txt")) {
      return withRobotsTag(NextResponse.next());
    }

    return withRobotsTag(
      NextResponse.rewrite(new URL(appPath("/robots.txt"), request.url)),
    );
  }

  if (isBlockedCrawlerUserAgent(userAgent)) {
    return withRobotsTag(
      new NextResponse("Forbidden", {
        status: 403,
      }),
    );
  }

  if (appPathname.startsWith("/api/")) {
    return withRobotsTag(NextResponse.next());
  }

  const session = request.cookies.get(sessionCookieName)?.value;

  const isProtected = protectedRoutes.some((route) =>
    appPathname.startsWith(route),
  );
  const isAuthRoute = authRoutes.some((route) => appPathname.startsWith(route));

  if (isProtected && !session) {
    return withRobotsTag(
      NextResponse.redirect(new URL(appPath("/login"), request.url)),
    );
  }

  if (isAuthRoute && session) {
    return withRobotsTag(
      NextResponse.redirect(new URL(appPath("/settings"), request.url)),
    );
  }

  return withRobotsTag(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml).*)"],
};
