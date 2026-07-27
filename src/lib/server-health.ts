import { SERVER_URI } from "@/constants/env";

type HealthResult = { online: boolean; message: string };

// A page can fire a dozen+ API calls in one burst (every widget on a detail
// page mounts its own query), and every one of them used to run its own
// fresh /health fetch via the axios interceptor before the real request
// went out — doubling the request count and starving the browser's
// per-origin connection pool. Cache the result for a short window and share
// one in-flight check across concurrent callers so a burst only pays for it
// once.
const CACHE_TTL_MS = 10_000;

let cached: { result: HealthResult; expiresAt: number } | null = null;
let inFlight: Promise<HealthResult> | null = null;

const checkServerOnline = async (): Promise<HealthResult> => {
  try {
    const res = await fetch(`${SERVER_URI}/api/v1/health`);
    return { online: res.ok, message: "Server is alive" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { online: false, message };
  }
};

export const isServerOnline = async (): Promise<HealthResult> => {
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight = checkServerOnline().then((result) => {
    cached = { result, expiresAt: Date.now() + CACHE_TTL_MS };
    inFlight = null;
    return result;
  });

  return inFlight;
};
