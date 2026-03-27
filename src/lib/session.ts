import { FETCHUSER } from "@/constants/apiEndpoints/auth.endpoint";
import { SERVER_URI } from "@/constants/env";
import axios from "axios";

/**
 * Validates the current user session by attempting to fetch the user profile.
 *
 * Strategy: Uses GET /api/v1/user/profile as a session heartbeat proxy,
 * since a dedicated /validate-session endpoint is not yet available in the backend.
 *
 * - 200 OK      → cookie is present and valid  → return "valid"
 * - 401          → no cookie / expired token    → return "no-token"
 * - other errors → network/server issue         → return "invalid"
 */
export async function validateSession(): Promise<"no-token" | "valid" | "invalid"> {
  try {
    await axios.get(`${SERVER_URI}${FETCHUSER}`, {
      withCredentials: true,
    });

    // Any 2xx means the cookie is valid
    return "valid";
  } catch (err: any) {
    const status = err.response?.status;

    // 401 = no token or expired token (anonymous visitor)
    if (status === 401) {
      return "no-token";
    }

    // 403 = token valid but role not permitted (treat as invalid)
    if (status === 403) {
      return "invalid";
    }

    // Network error / 5xx = treat as invalid (guard will redirect)
    return "invalid";
  }
}

