export const API_AUTH_PATHS = {
  // ── Implemented ─────────────────────────────────────────────────────────────
  LOGIN: "/api/v1/user/login",
  FETCHUSER: "/api/v1/user/profile", // Used as session-validation proxy (GET → 200 = valid, 401 = expired)

  // ── Pending Backend Implementation ──────────────────────────────────────────
  // These endpoints are not yet available in the staff-backend.
  // The frontend will handle logout client-side until the backend team adds them.
  LOGOUT: "/api/v1/user/logout", // Pending: backend team to add clearCookie + blacklist
  VALIDATESESSION: "/api/v1/user/validate-session", // Pending: no-op proxy check
};

