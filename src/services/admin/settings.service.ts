import bcrypt from "bcryptjs";

import { getServiceLogger } from "../../utils/createLogger";
import { Setting } from "../../models/v1/settings.model";
import { SlackService } from "../slack.service";
import { getEnvironmentFromHost } from "../../utils/slack-helpers";
import { SlackChannel, SlackEventType, SlackNode, SlackProvider, SlackSeverity } from "../../utils/enum";

const logger = getServiceLogger("setting-service");

/**
 * Setting Service
 * Optimized for speed and stability
 */
export class SettingService {

  /**
   * Send Slack notification
   */
  private static async notifySlack(host: string, action: string, message: string, user: any) {
    setImmediate(async () => {
      try {
        const location = getEnvironmentFromHost(host);

        await SlackService.notify({
          location,
          host,
          node: SlackNode.MESSAGING,
          provider: SlackProvider.SYSTEM,
          severity: SlackSeverity.CRITICAL,
          trigger: `Setting ${action}`,
          type: SlackEventType.ADMIN_ACTION,
          channel: SlackChannel.TOWN_CRIER,
          teamMentions: "CSM",
          body: message.trim(),
        });
      } catch (err) {
        logger.error(`❌ Slack notification failed: ${err}`);
      }
    });
  }

  /**
   * Get Master Password details (without actual password value)
   */
  static async getMasterPassword() {
    try {
      const masterpass = await Setting.findOne({
        where: { key: "masterpass" },
        attributes: { exclude: ['value'] },
        raw: true
      });

      if (!masterpass) {
        throw new Error("Master password record not found.");
      }

      logger.info(`✅ Master password details retrieved`);
      return masterpass;
    } catch (error: any) {
      logger.error(`❌ Failed to get master password details: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update Master Password
   */
  static async updateMasterPassword(req: any, oldPassword: string, newPassword: string, user: any) {
    try {
      const host = req.headers.host || req.headers.origin || "localhost";

      if (!newPassword || newPassword.length < 8) {
        logger.warn(`Attempt to set weak master password by ${user.email}`);
        throw new Error("New password must be at least 8 characters long");
      }

      const masterpass = await Setting.findOne({
        where: { key: "masterpass" }
      });

      // ✅ FIRST-TIME SETUP (DB is empty)
      if (!masterpass) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await Setting.create({
          key: "masterpass",
          value: hashedPassword,
          updatedBy: user.email,
          updatedAt: new Date()
        });

        logger.info(`✅ Master password initialized by ${user.email}`);

        // Notify Slack (non-blocking)
        const message = `
🔒 *MASTER PASSWORD INITIALIZED* 🔒
• Set by: ${user.email}
• IP Address: ${req.ip}
• Timestamp: ${new Date().toISOString()}
        `;

        setImmediate(async () => {
          try {
            await this.notifySlack(host, "Master Password Initialized", message, user);
          } catch (err) {
            logger.warn(`Could not send Slack notification: ${err}`);
          }
        });

        return true;
      }

      if (!oldPassword || !newPassword) {
        throw new Error("Old password and new password are required.");
      }

      // ✅ VALIDATE OLD PASSWORD
      const isMatch = await bcrypt.compare(oldPassword, masterpass.value as string);

      // Validate old password
      if (!isMatch) {
        throw new Error("Invalid old password. Try again!");
      }

      // Prevent reusing same password
      const isSamePassword = await bcrypt.compare(newPassword, masterpass.value as string);
      if (isSamePassword) {
        logger.warn(`Attempt to reuse old master password by ${user.email}`);
        throw new Error("New password cannot be the same as the old password");
      }

      // Hash new password and update record
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await masterpass.update({
        value: hashedPassword,
        updatedBy: user.email,
        updatedAt: new Date()
      });

      // Send Slack notification ASYNCHRONOUSLY
      setImmediate(async () => {
        try {
          const message = `
🔒 *MASTER PASSWORD CHANGED* 🔒
• Changed by: ${user.email}
• IP Address: ${req.ip}
• Timestamp: ${new Date().toISOString()}
          `;
          await this.notifySlack(host, "Master Password Changed", message, user);
        } catch (err) {
          logger.warn(`Could not send Slack notification: ${err}`);
        }
      });

      logger.info(`✅ Master password updated by ${user.email}`);
      return true;
    } catch (error: any) {
      logger.error(`❌ Failed to update master password: ${error.message}`);
      throw error;
    }
  }
}