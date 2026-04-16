import { getServiceLogger } from "../utils/createLogger";
import { Session } from "../models/v1/session.model";
import { SessionStatus } from "../utils/enum";
import { getConnectedRedis } from "../config/redis";
import { isRedisUsable } from "../utils/helpers";

const logger = getServiceLogger("coach-session-service");
const CACHE_TTL_SECONDS = 300; // 5 minutes cache
const CACHE_KEY_PREFIX = "COACH_SESSIONS:";

/**
 * Retrieve all session data for a coach with optimized single database query
 * Uses Redis caching layer with 5 min TTL to avoid unnecessary database calls
 * Falls back to database when Redis is unavailable
 */
export const getCoachSessionsData = async (coachId: string, bypassCache = false) => {
  const cacheKey = `${CACHE_KEY_PREFIX}${coachId}`;
  const redisClient = await getConnectedRedis();

  // Try cache first if available and not bypassed
  if (!bypassCache && isRedisUsable(redisClient)) {
    try {
      const cachedData = await redisClient!.get(cacheKey);
      if (cachedData) {
        logger.info(`✅ Cache HIT for coach sessions: ${coachId}`);
        return JSON.parse(cachedData);
      }
      logger.info(`⚠️ Cache MISS for coach sessions: ${coachId}`);
    } catch (cacheError) {
      logger.warn(`Redis cache read failed, falling back to DB: ${(cacheError as Error).message}`);
    }
  }

  logger.info(`Fetching all sessions from database for coach ID: ${coachId}`);

  // Single database query - fetch ALL sessions for this coach in ONE call
  const allCoachSessions = await Session.findAll({
    where: {
      coachId
    },
    order: [['createdAt', 'DESC']],
    raw: true // Faster response without Sequelize instance overhead
  });

  // Filter in memory (much faster than multiple DB round trips)
  const completedSessions: any[] = [];
  const pendingSessions: any[] = [];
  const activeBookings: any[] = [];

  for (const session of allCoachSessions) {
    if (session.sessionStatus === SessionStatus.COMPLETED) {
      completedSessions.push(session);
    } else if (session.sessionStatus === SessionStatus.PENDING) {
      pendingSessions.push(session);
    }

    // All non-completed sessions go to active bookings
    if (session.sessionStatus !== SessionStatus.COMPLETED) {
      activeBookings.push(session);
    }
  }

  const result = {
    statistics: {
      completedCount: completedSessions.length,
      pendingCount: pendingSessions.length,
      activeBookingsCount: activeBookings.length,
      totalSessions: allCoachSessions.length
    },
    completedSessions,
    pendingSessions,
    activeBookings
  };

  // Store result in cache if Redis is available
  if (isRedisUsable(redisClient)) {
    try {
      await redisClient!.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL_SECONDS);
      logger.info(`✅ Coach sessions cached successfully for: ${coachId} | TTL: ${CACHE_TTL_SECONDS}s`);
    } catch (cacheError) {
      logger.warn(`Failed to cache coach sessions: ${(cacheError as Error).message}`);
    }
  }

  logger.info(`Coach sessions processed successfully | Total: ${allCoachSessions.length} | Completed: ${completedSessions.length} | Pending: ${pendingSessions.length} | Active: ${activeBookings.length}`);

  return result;
};

/**
 * Invalidate cache for a coach when sessions are updated/created
 * Call this whenever a session changes for a coach
 */
export const invalidateCoachSessionCache = async (coachId: string) => {
  const cacheKey = `${CACHE_KEY_PREFIX}${coachId}`;
  const redisClient = await getConnectedRedis();

  if (isRedisUsable(redisClient)) {
    try {
      await redisClient!.del(cacheKey);
      logger.info(`✅ Cache invalidated for coach: ${coachId}`);
      return true;
    } catch (error) {
      logger.warn(`Failed to invalidate cache: ${(error as Error).message}`);
    }
  }

  return false;
};
