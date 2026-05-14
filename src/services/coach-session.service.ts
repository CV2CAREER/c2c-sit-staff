import { getServiceLogger } from "../utils/createLogger";
import { Session } from "../models/v1/session.model";
import { Schedule } from "../models/v1/schedule.model";
import { SessionStatus, SlackChannel, SlackEventType, SlackNode, SlackProvider, SlackSeverity } from "../utils/enum";
import { getConnectedRedis } from "../config/redis";
import { isRedisUsable } from "../utils/helpers";
import { User } from "../models/v1/user.model";
import ErrorHandler from "../utils/errorHandler";
import { SlackService } from "./slack.service";
import { getEnvironmentFromHost } from "../utils/slack-helpers";

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

  // Single database query with schedule relation JOIN
  const allCoachSessions = await Session.findAll({
    where: {
      coachId
    },
    include: [
      {
        model: Schedule,
        attributes: ['date', 'day'],
        required: false
      },
      {
        model: User,
        as: 'client',
        attributes: ['id', 'firstName', 'lastName', 'email'],
        required: false
      }
    ],
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
    } else if (session.sessionStatus === SessionStatus.PENDING || session.sessionStatus === SessionStatus.SCHEDULED) {
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
    activeBookings,
    allSessions: allCoachSessions,
    populatedSessions: allCoachSessions // Alias for frontend compatibility
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

/**
 * Mark session as completed
 */
export const completeSession = async (coachId: string, sessionId: string) => {
  const session = await Session.findOne({
    where: {
      id: sessionId,
      coachId
    }
  });

  if (!session) {
    throw new ErrorHandler("Session not found", 404);
  }

  if (session.sessionStatus === SessionStatus.COMPLETED) {
    logger.info(`Session already marked as completed: ${sessionId} | Coach: ${coachId}`);
    return session; // Idempotent response
  }

  if (session.sessionStatus === SessionStatus.CANCELED) {
    throw new ErrorHandler("Cannot complete a canceled session - contact support", 400);
  }

  await session.update({
    sessionStatus: SessionStatus.COMPLETED
  });

  // Invalidate cache for this coach
  await invalidateCoachSessionCache(coachId);

  // Send Slack notification
  setImmediate(async () => {
    try {
      const coach = await User.findByPk(coachId);
      const client = await User.findByPk(session.clientId);
      
      await SlackService.notify({
        location: getEnvironmentFromHost("backend"),
        host: "c2c-staff-backend",
        node: SlackNode.USER_MANAGEMENT,
        provider: SlackProvider.SYSTEM,
        severity: SlackSeverity.INFO,
        trigger: `Session marked as completed: ${sessionId}`,
        type: SlackEventType.USER_TRIGGERED,
        channel: SlackChannel.TOWN_CRIER,
        teamMentions: "CSM",
        body: `Session completed successfully.
What happened: Coach ${coach?.firstName || 'Unknown'} ${coach?.lastName || ''} has marked session ${sessionId} as completed.
Client: ${client?.firstName || 'Unknown'} ${client?.lastName || ''} (${client?.email || 'Unknown'})
Session Type: ${session.sessionType || 'N/A'}
Session Status: Completed
Immediate impact: Session is now marked as completed and coach availability updated.`,
      });
      logger.info(`✅ Slack notified for completed session: ${sessionId}`);
    } catch (err) {
      logger.error(`❌ Slack notification failed for completed session: ${err}`);
    }
  });

  logger.info(`Session marked as completed: ${sessionId} | Coach: ${coachId}`);

  return session;
};

/**
 * Get single session by ID for coach
 */
export const getSessionById = async (coachId: string, sessionId: string) => {
  const session = await Session.findOne({
    where: {
      id: sessionId,
      coachId
    },
    include: [
      {
        model: Schedule,
        attributes: ['date', 'day'],
        required: false
      },
      {
        model: User,
        as: 'client',
        attributes: ['id', 'firstName', 'lastName', 'email'],
        required: false
      }
    ]
  });

  if (!session) {
    throw new ErrorHandler("Session not found", 404);
  }

  logger.info(`Session retrieved: ${sessionId} | Coach: ${coachId}`);

  return session;
};

/**
 * Cancel session
 */
export const cancelSession = async (coachId: string, sessionId: string) => {
  const session = await Session.findOne({
    where: {
      id: sessionId,
      coachId
    }
  });

  if (!session) {
    throw new ErrorHandler("Session not found", 404);
  }

  if (session.sessionStatus === SessionStatus.CANCELED) {
    logger.info(`Session already canceled: ${sessionId} | Coach: ${coachId}`);
    return session; // Idempotent response
  }

  if (session.sessionStatus === SessionStatus.COMPLETED) {
    throw new ErrorHandler("Cannot cancel a completed session - contact support", 400);
  }

  await session.update({
    sessionStatus: SessionStatus.CANCELED
  });

  // Invalidate cache for this coach
  await invalidateCoachSessionCache(coachId);

  // Send Slack notification
  setImmediate(async () => {
    try {
      const coach = await User.findByPk(coachId);
      const client = await User.findByPk(session.clientId);
      
      await SlackService.notify({
        location: getEnvironmentFromHost("backend"),
        host: "c2c-staff-backend",
        node: SlackNode.USER_MANAGEMENT,
        provider: SlackProvider.SYSTEM,
        severity: SlackSeverity.INFO,
        trigger: `Session canceled: ${sessionId}`,
        type: SlackEventType.USER_TRIGGERED,
        channel: SlackChannel.TOWN_CRIER,
        teamMentions: "CSM",
        body: `Session canceled by coach.
What happened: Coach ${coach?.firstName || 'Unknown'} ${coach?.lastName || ''} has canceled session ${sessionId}.
Client: ${client?.firstName || 'Unknown'} ${client?.lastName || ''} (${client?.email || 'Unknown'})
Session Type: ${session.sessionType || 'N/A'}
Session Status: Cancelled
Immediate impact: Client will be notified. Coach availability is freed up for this time slot.
Next steps: CSM should follow up with client to reschedule.`,
      });
      logger.info(`✅ Slack notified for canceled session: ${sessionId}`);
    } catch (err) {
      logger.error(`❌ Slack notification failed for canceled session: ${err}`);
    }
  });

  logger.info(`Session cancelled: ${sessionId} | Coach: ${coachId}`);

  return session;
};

/**
 * Grade a session
 */
export const gradeSession = async (
  coachId: string,
  sessionId: string,
  grading: {
    score?: number;
    maxScore?: number;
    feedback?: string;
    criteria?: Array<{
      name: string;
      score: number;
      maxScore: number;
      feedback?: string;
    }>;
  }
) => {
  const session = await Session.findOne({
    where: {
      id: sessionId,
      coachId
    }
  });

  if (!session) {
    throw new ErrorHandler("Session not found", 404);
  }

  if (session.sessionStatus !== SessionStatus.COMPLETED) {
    throw new ErrorHandler("Can only grade completed sessions", 400);
  }

  // Build grading object
  const gradingData = {
    score: grading.score,
    maxScore: grading.maxScore ?? 100,
    feedback: grading.feedback,
    gradedBy: coachId,
    gradedAt: new Date(),
    criteria: grading.criteria || []
  };

  await session.update({
    grading: gradingData,
    isGraded: true
  });

  // Invalidate cache for this coach
  await invalidateCoachSessionCache(coachId);

  logger.info(`Session graded: ${sessionId} | Coach: ${coachId} | Score: ${grading.score}`);

  return session;
};
