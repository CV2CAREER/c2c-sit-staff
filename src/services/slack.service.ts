import { StandardSlackNotification } from "../types/slack.types";
import { getServiceLogger } from "../utils/createLogger";
import { sendStandardSlackNotification } from "../utils/slack-helpers";

const logger = getServiceLogger("slack-service");

export class SlackService {
  static async notify(data: StandardSlackNotification) {
    try {
      const wasSent = await sendStandardSlackNotification({
        ...data,
      });

      if (wasSent) {
        logger.info(`Slack notified successfully for ${data.trigger}`);
      }

      return wasSent;
    } catch (err) {
      // Since this is backgrounded, we MUST catch errors here
      // to prevent unhandled promise rejections.
      logger.error(`Background Slack notification failed:`, err);
      return false;
    }
  }
}
