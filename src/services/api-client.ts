import axios from "axios";
import { SERVER_URI } from "@/constants/env";
import { API_AUTH_PATHS } from "@/constants/apiPaths/api-authPaths";
import { isServerOnline } from "@/lib/server-health";

declare module "axios" {
  interface AxiosRequestConfig {
    _retry?: boolean;
  }
}

export const BASE_URL = SERVER_URI?.endsWith("/")
  ? SERVER_URI
  : `${SERVER_URI}/`;

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

export const authAxios = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// ✅ Define routes that don't need auth using your constants
const PUBLIC_ROUTES = [
  `${BASE_URL}${API_AUTH_PATHS.LOGIN}`,
  `${BASE_URL}${API_AUTH_PATHS.VALIDATESESSION}`,
];

// The zustand `persist` key from store/user.store.tsx — read directly since
// the store is created per-Provider (via useRef), not a module-level
// singleton, so it isn't importable from here the way a plain store would be.
const AUTH_STORAGE_KEY = "c2c-staff-auth-storage";

/**
 * The real session credential is the httpOnly `c2c-access` cookie, set by
 * this backend's own /login response — that's all a same-portal login ever
 * needs. But when a staff user logs in on the CUSTOMER portal and gets
 * redirected here with `?token=`, no such cookie exists yet: it was the
 * customer backend's login that ran, and its Set-Cookie is scoped to that
 * backend's own domain, not this one. The token is only ever stored
 * client-side (via setAccessToken) in that flow.
 *
 * The backend's own auth middleware already checks the Authorization header
 * before falling back to the cookie (see checkBlacklistedToken.ts) — it was
 * built to support exactly this handoff. Attaching it here as a fallback
 * whenever a stored token exists is what actually uses that path; without
 * it, the cross-portal redirect had no way to authenticate at all.
 */
const getStoredAccessToken = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw)?.state?.staffAccessToken ?? null;
  } catch {
    return null;
  }
};


// SITE UNDER MAINTENANCE
const redirectToSiteUnderMaintenacePage = () => {
  // console.log("Redirecting to site under maintenance page...");
};

// 🚦 Axios Request Interceptor
axiosInstance.interceptors.request.use(
  async (config) => {
    // 1️⃣ Reset the 10-min Inactivity Timer via Custom Event
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("app-activity"));
    }

    const requestUrl = config.url ?? "";

    // 1️⃣ Skip validation for public routes

    const isPublic = PUBLIC_ROUTES.some((path) => requestUrl.startsWith(path));

    if (isPublic) {
      return config;
    }

    // 2️⃣ Attach the stored access token as a Bearer fallback — the backend
    // checks this before the cookie, so it authenticates requests made
    // before any staff-domain cookie exists (e.g. the customer-portal
    // cross-login redirect) without disturbing normal cookie-based auth.
    if (!config.headers?.Authorization) {
      const token = getStoredAccessToken();
      if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // 3️⃣ Check if backend is reachable
    const serverRes = await isServerOnline();

    if (!serverRes.online) {
      // console.log("AXIOS REQUEST INTERCEPTOR: Server offline");
      redirectToSiteUnderMaintenacePage();

      return Promise.reject(
        new axios.Cancel("Site is under maintenance. Please try again later."),
      );
    }

    // ✅ All good — allow request
    return config;
  },
  (error) => Promise.reject(error),
);

// 🚦 Axios Response Interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    try {
      const errorStatus = error.response?.data?.statusCode;

      // const errorMessage: string = error.response?.data?.message;

      // const message = errorMessage.includes("revoked")
      //   ? "Permission Denied"
      //   : errorMessage;

      // const errorCode = errorMessage.includes("revoked") ? 403 : 401;

      // Check server availability
      const serverRes = await isServerOnline();
      if (!serverRes.online) {
        // console.log("AXIOS RESPONSE INTERCEPTOR: SERVER IS OFFLINE");
        redirectToSiteUnderMaintenacePage();

        return Promise.reject(
          new axios.Cancel(
            "Site is under maintenance. Please try again later.",
          ),
        );
      }

      // Handle unauthorized
      if (errorStatus === 403) {
        // console.log("Session expired. Redirecting to login...");

        //  redirect to access denied page or show message

        return Promise.reject(error);
      }

      return Promise.reject(error);
    } catch (err) {
      return Promise.reject(err);
    }
  },
);

export default axiosInstance;
