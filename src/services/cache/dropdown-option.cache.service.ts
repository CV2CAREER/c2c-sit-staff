import { getConnectedRedis } from "../../config/redis";
import { getServiceLogger } from "../../utils/createLogger";
import { isRedisUsable } from "../../utils/helpers";
import { DropdownOptionListKey } from "../../models/v1/dropdown-option.model";

const logger = getServiceLogger("dropdown-option-cache");

// Must match c2c-customer-backend's cache key builder exactly — both
// backends are configured against the same Redis instance, so deleting a
// key here clears the customer-facing read cache immediately.
export const dropdownOptionsCacheKey = (listKey: DropdownOptionListKey) =>
  `PADIPLUS:doc:dropdown-options:${listKey}:active`;

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timed out")), ms)),
  ]);

export const invalidateDropdownOptionsCache = async (listKey: DropdownOptionListKey): Promise<void> => {
  try {
    const redisClient = await withTimeout(getConnectedRedis(), 3000);

    if (!isRedisUsable(redisClient) || !redisClient) {
      return;
    }

    await withTimeout(redisClient.del(dropdownOptionsCacheKey(listKey)), 3000);
    logger.info(`Invalidated customer-facing dropdown options cache for listKey=${listKey}`);
  } catch (err) {
    // Never let a slow/unreachable cache affect the caller — this is a
    // best-effort side-effect, not part of the write's correctness.
    logger.error(`Failed to invalidate dropdown options cache for listKey=${listKey}: ` + err);
  }
};
