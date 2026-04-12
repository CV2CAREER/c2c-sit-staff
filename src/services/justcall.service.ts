// services/justcall.service.ts
import Redis from "ioredis";
import crypto from "crypto";
import db from "@/database/postgres";

type TriggerInput = {
  action: string;
  payload: Record<string, any>;
};

/* ---------------- REDIS CLIENT (REUSED) ---------------- */
const redisClient = new Redis({
  host: process.env.CLIENT_SAMPLE_REDIS_HOST,
  password: process.env.CLIENT_SAMPLE_REDIS_PASSWORD,
  maxRetriesPerRequest: 1,
  enableAutoPipelining: true,
});

/* ---------------- QUEUES ---------------- */
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
      const jobData = JSON.stringify({ template, triggerId: _id });

      await redisClient.rpush(TEMPLATE_QUEUE, jobData);

      return `Queued template for processing`;
    } catch (error) {
      console.error("verifyTemplate error:", error);
      throw error;
    }
  }

  /* ---------------- SEND MESSAGE ---------------- */
  static async sendMsg({ action, payload }: TriggerInput): Promise<void> {
    try {
      /* -------- FETCH TRIGGER FROM POSTGRES -------- */
      const trigger = await db.jc_triggers.findOne({
        where: {
          trigger: action,
          status: true,
        },
        raw: true,
      });

      if (!trigger) {
        console.warn(`No active trigger for action: ${action}`);
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
        console.log("Duplicate skipped:", message);
        return;
      }

      /* -------- PUSH TO QUEUE -------- */
      await redisClient.rpush(MESSAGE_QUEUE, JSON.stringify(message));
    } catch (error) {
      console.error("sendMsg error:", error);
    }
  }
}
