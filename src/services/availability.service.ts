import db from "@/database/postgres";
import ErrorHandler from "@/utils/errorHandler";
import { getServiceLogger } from "@/utils/createLogger";
import { sendMail } from "@/config/sendGrid";
import moment from "moment-timezone";
import { SlackService } from "@/services/slack.service";

const logger = getServiceLogger("AvailabilityService");

/**
 * Get availabilities based on user role
 */
export async function getAvailabilities(
  userId: string,
  userRole: string,
): Promise<any[]> {
  try {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    if (userRole === "coach" || userRole === "admin") {
      // Handle for coach and admin that switch persona to coach
      const availabilities = await db.availability.findAll({
        where: {
          status: "pending",
          [db.sequelize.Op.or]: [
            { day: { [db.sequelize.Op.gt]: startOfToday } },
            {
              day: startOfToday,
              from: { [db.sequelize.Op.gt]: now },
            },
          ],
        },
        include: [
          {
            association: "user",
            required: true,
            attributes: ["id", "firstName", "lastName"],
          },
        ],
      });

      logger.info(`Availabilities retrieved for coach/admin: ${userId}`);
      return availabilities;
    }

    // Get user's own availabilities
    const userAvailabilities = await db.availability.findAll({
      where: {
        userId: userId,
        [db.sequelize.Op.or]: [
          { day: { [db.sequelize.Op.gt]: startOfToday } },
          {
            day: startOfToday,
            from: { [db.sequelize.Op.gt]: now },
          },
        ],
      },
    });

    logger.info(`User availabilities retrieved for user: ${userId}`);
    return userAvailabilities;
  } catch (error: any) {
    logger.error("Failed to retrieve availabilities:", error);
    throw new ErrorHandler("Failed to retrieve availabilities", 500);
  }
}

/**
 * Create a new availability
 */
export async function createAvailability(
  userId: string,
  payload: {
    day: Date;
    timezone: string;
    from: string;
    to: string;
    sessionType: string;
  },
): Promise<any> {
  try {
    // Check if user already has a booking
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    const alreadyBooked = await db.session.findOne({
      where: {
        client: userId,
        [db.sequelize.Op.or]: [
          { date: { [db.sequelize.Op.gt]: startOfDay } },
          {
            date: startOfDay,
            time: {
              [db.sequelize.Op.like]: `%${today.toLocaleTimeString()}%`,
            },
          },
        ],
      },
    });

    if (alreadyBooked) {
      throw new ErrorHandler("Already booked", 400);
    }

    const { day, timezone, from, to, sessionType } = payload;

    // Validate required fields
    if (!day || !timezone || !from || !to || !sessionType) {
      throw new ErrorHandler("Missing required fields", 400);
    }

    const availabilityPayload = {
      day,
      timezone,
      from,
      to,
      sessionType,
      userId,
      status: "pending",
    };

    // Create the availability instance
    const availableInstance = await db.availability.create(availabilityPayload);

    if (!availableInstance) {
      throw new ErrorHandler("Unable to create availability instance", 400);
    }

    // Notify coaches and send Slack notification
    await notifyCoaches(userId, day, from);
    await sendSlackNotification(userId, day, from, to, timezone);

    logger.info(`Availability created for user: ${userId}`);
    return availableInstance;
  } catch (error: any) {
    logger.error("Error creating availability:", error);
    if (error instanceof ErrorHandler) throw error;
    throw new ErrorHandler("Failed to create availability", 500);
  }
}

/**
 * Delete/decline an availability
 */
export async function deleteAvailability(
  availabilityId: string,
  userId: string,
  removeAvailability?: boolean,
): Promise<void> {
  try {
    if (!availabilityId) {
      throw new ErrorHandler("Missing required fields", 400);
    }

    const availability = await db.availability.findByPk(availabilityId, {
      include: [
        {
          association: "user",
          required: true,
          attributes: ["id", "firstName"],
        },
      ],
    });

    if (!availability) {
      throw new ErrorHandler("Availability not found", 404);
    }

    // Send decline notification if not just removing
    if (!removeAvailability) {
      await sendDeclineNotification(availability, userId);
    }

    await availability.destroy();

    logger.info(`Availability deleted: ${availabilityId}`);
  } catch (error: any) {
    logger.error("Error deleting availability:", error);
    if (error instanceof ErrorHandler) throw error;
    throw new ErrorHandler("Failed to delete availability", 500);
  }
}

/**
 * Helper method to notify coaches about new availability
 */
async function notifyCoaches(
  userId: string,
  day: Date,
  from: string,
): Promise<void> {
  try {
    const coaches = await db.user.findAll({
      where: { role: "coach" },
    });

    const user = await db.user.findByPk(userId);

    if (!user) {
      logger.warn(`User not found for availability notification: ${userId}`);
      return;
    }

    await Promise.all(
      coaches.map(async (coach: any) => {
        try {
          await sendMail({
            email: coach.email,
            subject: "New Client Availability Proposal",
            templateName: "coach-availability-proposal.ejs",
            templateData: {
              coachName: coach.firstName,
              clientName: `${user.firstName} ${user.lastName}`,
              proposedDate: moment(day).format("YYYY-MM-DD"),
              proposedTime: from,
            },
          });
        } catch (err) {
          logger.error(
            `Failed to send availability notification to coach ${coach.id}:`,
            err,
          );
        }
      }),
    );

    logger.info(`Coaches notified about new availability from user: ${userId}`);
  } catch (error: any) {
    logger.error("Error notifying coaches:", error);
  }
}

/**
 * Helper method to send Slack notification
 */
async function sendSlackNotification(
  userId: string,
  day: Date,
  from: string,
  to: string,
  timezone: string,
): Promise<void> {
  try {
    const user = await db.user.findByPk(userId);

    if (!user) {
      logger.warn(`User not found for Slack notification: ${userId}`);
      return;
    }

    const message = `${user.firstName} (${user.email}) has proposed new session availability.\n\nDate: ${moment.utc(day).format("dddd, Do MMMM YYYY")}\nTime: ${from} - ${to}\nTimezone: ${timezone}\n\nSuccess: Availability record created and coaches notified via email.\nImmediate Impact: Coaches can now view and approve this availability for session booking.`;

    logger.info(`Slack notification would be sent: ${message}`);
  } catch (error: any) {
    logger.error("Error sending Slack notification:", error);
  }
}

/**
 * Helper method to send decline notification
 */
async function sendDeclineNotification(
  availability: any,
  declinedBy: string,
): Promise<void> {
  try {
    const user =
      availability.user || (await db.user.findByPk(availability.userId));

    if (!user) {
      logger.warn(
        `User not found for decline notification: ${availability.userId}`,
      );
      return;
    }

    await sendMail({
      email: user.email,
      subject: "Availability Declined",
      templateName: "availability-declined.ejs",
      templateData: {
        name: user.firstName,
        day: moment.utc(availability.day).format("dddd, Do MMMM YYYY"),
        from: availability.from,
        to: availability.to,
      },
    });

    const message = `${user.firstName} (${user.email}) availability for ${moment.utc(availability.day).format("dddd, Do MMMM YYYY")} has been declined.\n\nSuccess: Availability record removed and user notified via email.\nImmediate Impact: This slot is no longer available for booking.`;

    logger.info(`Decline notification would be sent: ${message}`);

    logger.info(
      `Decline notification sent for availability: ${availability.id}`,
    );
  } catch (error: any) {
    logger.error("Error sending decline notification:", error);
  }
}
