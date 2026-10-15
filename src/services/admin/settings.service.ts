import bcrypt from "bcryptjs";

import { getServiceLogger } from "../../utils/createLogger";
import ErrorHandler from "../../utils/errorHandler";
import { Setting } from "../../models/v1/settings.model";
import { SlackService } from "../slack.service";
import { getEnvironmentFromHost } from "../../utils/slack-helpers";
import { SlackChannel, SlackEventType, SlackNode, SlackProvider, SlackSeverity } from "../../utils/enum";

const logger = getServiceLogger("setting-service");

/**
 * Three interchangeable master keys. Any one of them unlocks everything the
 * master key does, and any one can be used to change any of the others — so
 * a key changed by someone who then leaves can be reset with another.
 * Slot 1 keeps the original "masterpass" row so the existing key still works.
 */
export const MASTER_KEY_SLOTS = [
  { slot: 1, key: "masterpass", label: "Key 1" },
  { slot: 2, key: "masterpass_2", label: "Key 2" },
  { slot: 3, key: "masterpass_3", label: "Key 3" },
] as const;

export const MASTER_KEY_SETTING_KEYS: string[] = MASTER_KEY_SLOTS.map((s) => s.key);

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

  private static async loadMasterKeyRows() {
    const rows = await Setting.findAll({ where: { key: MASTER_KEY_SETTING_KEYS } });
    return MASTER_KEY_SLOTS.map((slot) => ({
      ...slot,
      row: rows.find((r) => r.key === slot.key) ?? null,
    }));
  }

  /**
   * Which master key slot (1-3) the candidate matches, or null when it
   * matches none of them.
   */
  static async findMatchingMasterKeySlot(candidate: string): Promise<number | null> {
    if (!candidate) return null;
    for (const { slot, row } of await this.loadMasterKeyRows()) {
      if (row?.value && (await bcrypt.compare(candidate, row.value))) return slot;
    }
    return null;
  }

  /**
   * Check a candidate against the stored (bcrypt) master keys. Returns
   * true when it matches any one of the three.
   */
  static async verifyMasterPassword(candidate: string): Promise<boolean> {
    return (await this.findMatchingMasterKeySlot(candidate)) !== null;
  }

  /**
   * Status of all three master keys (never the values).
   */
  static async getMasterKeys() {
    return (await this.loadMasterKeyRows()).map(({ slot, label, row }) => ({
      slot,
      label,
      isSet: !!row?.value,
      updated: row?.updatedAt ?? null,
      updatedBy: row?.updatedBy ?? null,
    }));
  }

  /**
   * Set or change one master key. Authorised by any of the three current
   * keys; only when no key exists at all can one be set without it.
   */
  static async updateMasterKey(
    req: any,
    payload: { slot: number; currentKey?: string; newPassword: string },
    user: any,
  ) {
    const host = req.headers.host || req.headers.origin || "localhost";
    const { currentKey, newPassword } = payload;
    const target = MASTER_KEY_SLOTS.find((s) => s.slot === Number(payload.slot));

    if (!target) {
      throw new ErrorHandler("Choose which master key to change (Key 1, 2 or 3).", 400);
    }
    if (!newPassword || newPassword.length < 8) {
      logger.warn(`Attempt to set weak master key by ${user.email}`);
      throw new ErrorHandler("New key must be at least 8 characters long", 400);
    }

    const slots = await this.loadMasterKeyRows();
    const anySet = slots.some((s) => s.row?.value);

    let authorisedBy: number | null = null;
    if (anySet) {
      if (!currentKey) {
        throw new ErrorHandler("Enter any one of the current master keys to authorise this change.", 400);
      }
      authorisedBy = await this.findMatchingMasterKeySlot(currentKey);
      if (authorisedBy === null) {
        throw new ErrorHandler("That doesn't match any of the current master keys. Try again!", 400);
      }
    }

    // Keep the three keys distinct, otherwise one person effectively holds two.
    for (const { row, label } of slots) {
      if (row?.value && (await bcrypt.compare(newPassword, row.value))) {
        logger.warn(`Attempt to reuse an existing master key by ${user.email}`);
        throw new ErrorHandler(`New key cannot be the same as ${label}.`, 400);
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const existing = slots.find((s) => s.slot === target.slot)!.row;
    const isInit = !existing?.value;

    if (existing) {
      await existing.update({ value: hashedPassword, updatedBy: user.email, updatedAt: new Date() });
    } else {
      await Setting.create({ key: target.key, value: hashedPassword, updatedBy: user.email, updatedAt: new Date() });
    }

    const authorisedLabel = authorisedBy
      ? MASTER_KEY_SLOTS.find((s) => s.slot === authorisedBy)!.label
      : "none (first master key)";
    const message = `
🔒 *MASTER ${target.label.toUpperCase()} ${isInit ? "SET" : "CHANGED"}* 🔒
• ${isInit ? "Set" : "Changed"} by: ${user.email}
• Authorised with: ${authorisedLabel}
• IP Address: ${req.ip}
• Timestamp: ${new Date().toISOString()}
    `;
    void this.notifySlack(host, `Master ${target.label} ${isInit ? "Set" : "Changed"}`, message, user);

    logger.info(`✅ Master ${target.label} ${isInit ? "set" : "updated"} by ${user.email} (authorised with ${authorisedLabel})`);
    return true;
  }

  /**
   * Alert the same channel as master-password changes whenever the master
   * password is used to authorise something.
   */
  static notifyMasterPasswordUse(host: string, message: string, user: any) {
    return this.notifySlack(host, "Master Password Used", message, user);
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
      
      // Map updatedAt to updated for frontend compatibility
      return {
        ...masterpass,
        updated: masterpass.updatedAt
      };
    } catch (error: any) {
      logger.error(`❌ Failed to get master password details: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update Master Password (legacy /settings/masterpass route) — changes Key 1.
   */
  static async updateMasterPassword(req: any, oldPassword: string, newPassword: string, user: any) {
    return this.updateMasterKey(req, { slot: 1, currentKey: oldPassword, newPassword }, user);
  }
}