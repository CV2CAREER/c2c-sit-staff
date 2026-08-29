import { getConnectedRedis } from "../../config/redis";
import { getServiceLogger } from "../../utils/createLogger";
import { isRedisUsable } from "../../utils/helpers";

const logger = getServiceLogger("preference-question-cache");

// Must match c2c-customer-backend's PREFERENCE_QUESTIONS_CACHE_KEY exactly —
// both backends are configured against the same Redis instance, so deleting
// this key here clears the customer-facing read cache immediately.
const PREFERENCE_QUESTIONS_CACHE_KEY = "PADIPLUS:doc:preference-questions:active";

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timed out")), ms)),
  ]);

export const invalidatePreferenceQuestionsCache = async (): Promise<void> => {
  try {
    const redisClient = await withTimeout(getConnectedRedis(), 3000);

    if (!isRedisUsable(redisClient) || !redisClient) {
      return;
    }

    await withTimeout(redisClient.del(PREFERENCE_QUESTIONS_CACHE_KEY), 3000);
    logger.info("Invalidated customer-facing preference questions cache");
  } catch (err) {
    // Never let a slow/unreachable cache affect the caller — this is a
    // best-effort side-effect, not part of the write's correctness.
    logger.error("Failed to invalidate preference questions cache: " + err);
  }
};
