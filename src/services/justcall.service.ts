// services/justcall.service.ts
import crypto from "crypto";
import db from "@/database/postgres";
import { getConnectedRedis } from "@/config/redis";
import { getServiceLogger } from "@/utils/createLogger";
import ErrorHandler from "@/utils/errorHandler";

const logger = getServiceLogger("JustCallService");

type TriggerInput = {
  action: string;
  payload: Record<string, any>;
};

/* ---------------- QUEUE NAMES (CONFIG) ---------------- */
const TEMPLATE_QUEUE = "JC_QUEUE";
const MESSAGE_QUEUE = "JUSTCALL_MESSAGE_QUEUE";

export class JustCallTriggerService {
  /* ---------------- TEMPLATE VALIDATION QUEUE ---------------- */
  static async verifyTemplate({
    template,
    _id,
  }: {
    template: string;
    _id: string;
  }): Promise<string> {
    try {
      const redisClient = await getConnectedRedis();

      if (!redisClient) {
        throw new ErrorHandler("Redis connection unavailable", 503);
      }

      const jobData = JSON.stringify({ template, triggerId: _id });

      await redisClient.rpush(TEMPLATE_QUEUE, jobData);

      logger.info(`Template queued for processing: ${_id}`);
      return `Queued template for processing`;
    } catch (error: any) {
      logger.error("verifyTemplate error:", error);
      if (error instanceof ErrorHandler) throw error;
      throw new ErrorHandler("Failed to queue template verification", 500);
    }
  }

  /* ---------------- SEND MESSAGE ---------------- */
  static async sendMsg({ action, payload }: TriggerInput): Promise<void> {
    try {
      const redisClient = await getConnectedRedis();

      if (!redisClient) {
        logger.warn("Redis unavailable - message queuing skipped");
        return;
      }

      /* -------- FETCH TRIGGER FROM POSTGRES -------- */
      const trigger = await db.jc_triggers.findOne({
        where: {
          trigger: action,
          status: true,
        },
        raw: true,
      });

      if (!trigger) {
        logger.warn(`No active trigger for action: ${action}`);
        return;
      }

      /* -------- BUILD MESSAGE -------- */
      const message = {
        name: payload.name,
        phone: payload.phone,
        template: trigger.template,
      };

      /* -------- DEDUPLICATION -------- */
      const hash = crypto
        .createHash("sha256")
        .update(JSON.stringify(message))
        .digest("hex");

      const dedupKey = `msg_dedup:${hash}`;

      const isNew = await redisClient.set(
        dedupKey,
        "1",
        "EX",
        600, // 10 mins
        "NX",
      );

      if (!isNew) {
        logger.info("Duplicate message skipped:", message);
        return;
      }

      /* -------- PUSH TO QUEUE -------- */
      await redisClient.rpush(MESSAGE_QUEUE, JSON.stringify(message));

      logger.info(`Message queued for action: ${action}`);
    } catch (error: any) {
      logger.error("sendMsg error:", error);
    }
  }
}
