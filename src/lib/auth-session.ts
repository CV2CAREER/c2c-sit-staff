/**
 * Session hint cookie — the only auth signal the middleware can see.
 *
 * The real credential is `c2c-access`: httpOnly, signed by the backend, and in
 * production scoped to the API host — so middleware can neither read its role
 * (the JWT `data` claim is encrypted) nor rely on it being present at all.
 *
 * So on login the app mirrors two non-sensitive facts into a readable cookie:
 * the role (to pick a dashboard) and the token's `exp` (to know when the
 * session dies). The cookie is set to expire at exactly that `exp`, so the
 * browser drops it the moment the access token expires, and logout clears it.
 *
 * This cookie grants nothing. It only decides whether /login redirects away.
 * Every protected route is still gated server-side by the `c2c-access` cookie
 * and client-side by DashboardProtectedGuard.
 */

export const SESSION_HINT_COOKIE = "c2c-staff-session";

export type SessionHint = {
  role: string;
  /** Access token expiry, epoch seconds. */
  exp: number;
};

/**
 * Used when the access token is absent or its `exp` is unreadable. A wrong
 * guess is self-correcting: too short only means an early trip through /login,
 * too long means DashboardProtectedGuard clears the hint on the next 401.
 */
const FALLBACK_TTL_SECONDS = 2 * 60 * 60;

/** Reads the standard `exp` claim from a JWT without verifying its signature. */
export function readJwtExp(token: string): number | null {
  if (typeof token !== "string") return null;

  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const exp = JSON.parse(atob(padded))?.exp;
    return typeof exp === "number" ? exp : null;
  } catch {
    return null;
  }
}

/**
 * Parses the cookie value, returning null when the session is absent or the
 * access token has expired — both cases mean "show the login page".
 */
export function parseSessionHint(raw: string | undefined): SessionHint | null {
  if (!raw) return null;

  const [role, rawExp] = decodeURIComponent(raw).split("|");
  const exp = Number(rawExp);
  if (!role || !Number.isFinite(exp)) return null;

  if (exp * 1000 <= Date.now()) return null;

  return { role, exp };
}

/**
 * Client-side only. Call on every successful authentication.
 *
 * Never throws: this runs inside the login success handler, and a failure here
 * must not stop the user from reaching their dashboard.
 */
export function setSessionHint(role: string, accessToken?: string): void {
  if (typeof document === "undefined" || !role) return;

  try {
    const exp =
      (accessToken ? readJwtExp(accessToken) : null) ??
      Math.floor(Date.now() / 1000) + FALLBACK_TTL_SECONDS;

    const value = encodeURIComponent(`${role}|${exp}`);
    const expires = new Date(exp * 1000).toUTCString();
    const secure = window.location.protocol === "https:" ? "; Secure" : "";

    document.cookie = `${SESSION_HINT_COOKIE}=${value}; expires=${expires}; path=/; SameSite=Lax${secure}`;
  } catch {
    // A missing session hint only costs a redirect, never access.
  }
}

/** Client-side only. Call on logout and whenever the backend rejects the session. */
export function clearSessionHint(): void {
  if (typeof document === "undefined") return;

  document.cookie = `${SESSION_HINT_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}
