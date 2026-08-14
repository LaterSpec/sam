/**
 * Cheap presence check for Better Auth's session cookie.
 * Production HTTPS uses the `__Secure-` prefix; local HTTP does not.
 * Does not validate the session — only avoids a Neon round-trip when no cookie exists.
 */
const SESSION_COOKIE_RE = /(?:^|;\s*)(?:__Secure-)?better-auth\.session_token=/;

export function hasSessionCookie(cookieHeader: string | null | undefined): boolean {
  if (!cookieHeader) return false;
  return SESSION_COOKIE_RE.test(cookieHeader);
}
