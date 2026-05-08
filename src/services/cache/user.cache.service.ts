import { getConnectedRedis } from "../../config/redis";
import { User } from "../../models/v1/user.model";
import { getServiceLogger } from "../../utils/createLogger";
import { isRedisUsable } from "../../utils/helpers";

const logger = getServiceLogger("user-cache");

export const getCachedUser = async (userId: string) => {
  const redisClient = await getConnectedRedis();

  if (!isRedisUsable(redisClient)) {
    logger.warn("⚠️ Redis not usable, skipping cache lookup");
    return null;
  }

  if (!redisClient) {
    return null;
  }

  try {
    const cached = await redisClient.get(`PADIPLUS:doc:user:${userId}`);
    return cached ? JSON.parse(cached) : null;
  } catch (err) {
    logger.error("Failed to get cached user: " + err);
    return null;
  }
};

export const setCachedUser = async (userId: string, userData: User | null) => {
  const redisClient = await getConnectedRedis();

  if (!isRedisUsable(redisClient)) {
    logger.warn("⚠️ Redis not usable, skipping cache lookup");
    return null;
  }

  if (!redisClient) {
    return;
  }

  try {
    if (userData === null) {
      await redisClient.del(`PADIPLUS:doc:user:${userId}`);
    } else {
      await redisClient.set(
        `PADIPLUS:doc:user:${userId}`,
        JSON.stringify(userData),
        "EX",
        7 * 24 * 60 * 60, // cache expires in 7 days
      );
    }
  } catch (err) {
    logger.error("Failed to set cached user: " + err);
    return null;
  }
};

export const removeCachedUser = async (userId: string) => {
  const redisClient = await getConnectedRedis();

  if (!isRedisUsable(redisClient)) {
    logger.warn("⚠️ Redis not usable, skipping cache lookup");
    return null;
  }

  if (!redisClient) {
    return;
  }

  try {
    await redisClient.del(`PADIPLUS:doc:user:${userId}`);
  } catch (err) {
    logger.error("Failed to delete cached user: " + err);
    return null;
  }
};
