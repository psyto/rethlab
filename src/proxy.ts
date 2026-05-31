import { NextResponse, type NextRequest } from 'next/server';

/**
 * Surface the request pathname to server components via a header.
 *
 * The root layout needs to know the current path to set `<html lang>`
 * correctly for JA-suffixed course/lesson routes. Next.js doesn't expose
 * route params to the root layout, so we read this header via `headers()`.
 */
export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set('x-pathname', request.nextUrl.pathname);
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon|robots.txt|sitemap.xml|.*\\..*).*)'],
};
