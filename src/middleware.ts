import { NextResponse, type NextRequest } from "next/server";
import { SESSION_HINT_COOKIE, parseSessionHint } from "@/lib/auth-session";
import { getRoleRoute } from "@/lib/role-routes";

/**
 * Keeps authenticated staff out of the login page.
 *
 * An authenticated visitor hitting `/login` (or `/`, which client-side bounces
 * to `/login`) is sent straight to their role's dashboard. The login page is
 * only reachable once the access token has expired or the user logged out —
 * both of which drop the session hint cookie.
 *
 * `/auth` is deliberately not matched: it must consume its `?token=` param to
 * bootstrap a session before any redirect can happen.
 */
export function middleware(request: NextRequest) {
  const hint = request.cookies.get(SESSION_HINT_COOKIE)?.value;
  const session = parseSessionHint(hint);

  // No session, or the access token has expired — let them log in.
  if (!session) {
    const response = NextResponse.next();
    if (hint) response.cookies.delete(SESSION_HINT_COOKIE);
    return response;
  }

  // Roles without a dashboard resolve to /login; redirecting would loop.
  const destination = getRoleRoute(session.role);
  if (destination === "/login") return NextResponse.next();

  return NextResponse.redirect(new URL(destination, request.url));
}

export const config = {
  matcher: ["/", "/login"],
};
