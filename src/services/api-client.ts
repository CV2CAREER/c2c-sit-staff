import axios from "axios";
import { SERVER_URI } from "@/constants/env";
import { API_AUTH_PATHS } from "@/constants/apiPaths/api-authPaths";
import { isServerOnline } from "@/lib/server-health";

declare module "axios" {
  interface AxiosRequestConfig {
    _retry?: boolean;
  }
}

const axiosInstance = axios.create({
  withCredentials: true,
});

export const authAxios = axios.create({
  baseURL: SERVER_URI,
  withCredentials: true,
});

// Define this outside to track refresh state
// const isRefreshing = false;
// const refreshPromise: Promise<any> | null = null;

// ✅ Define routes that don't need auth using your constants
const PUBLIC_ROUTES = [
  `${SERVER_URI}${API_AUTH_PATHS.LOGIN}`,
  `${SERVER_URI}${API_AUTH_PATHS.SIGNUP}`,
];

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

    // 2️⃣ Check if backend is reachable
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
