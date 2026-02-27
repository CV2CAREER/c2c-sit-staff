import { Job } from "bullmq";
import { getServiceLogger } from "../../utils/createLogger";
import { createWorker } from "../../config/bullMQ";

const logger = getServiceLogger("email-worker");

export const EMAIL_QUEUE = "email";

// --- Job type definitions ---
interface VerificationEmailPayload {
  type: "verification";
  user: { firstName: string; lastName: string; email: string };
  otp: string;
  url: string;
}

interface WelcomeEmailPayload {
  type: "welcome";
  user: { firstName: string; lastName: string; email: string };
}

interface ResetEmailPayload {
  type: "reset";
  user: { firstName: string; lastName: string; email: string };
  url: string;
}

type EmailJobPayload =
  | VerificationEmailPayload
  | WelcomeEmailPayload
  | ResetEmailPayload;

// --- Worker ---
export const emailWorker = createWorker(
  EMAIL_QUEUE,
  async (job: Job<EmailJobPayload>) => {
    const { type } = job.data;

    switch (type) {
      case "verification": {
        // const { user, otp, url } = job.data;
        // await sendVerificationEmail(user, otp, url);
        logger.info(`Verification email sent`);
        break;
      }

      case "welcome": {
        // const { user } = job.data;
        // await sendWelcomeEmail(user);
        logger.info(`Welcome email sent`);
        break;
      }

      case "reset": {
        // const { user, url } = job.data;
        // await sendPasswordResetEmail(user, url);
        logger.info(`Password reset email sent`);
        break;
      }

      default:
        logger.warn(`Unknown email job type received`);
    }
  },
);
