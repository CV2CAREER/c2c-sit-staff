import sgMail, { MailDataRequired } from "@sendgrid/mail";
import path from "path";
import ejs from "ejs";
import { getServiceLogger } from "../utils/createLogger";
import {
  SENDGRID_API_KEY,
  SENDGRID_FROM_EMAIL,
  SENDGRID_FROM_NAME,
} from "./env";

const logger = getServiceLogger("sendgrid");

let isInitialized = false;

export const initializeSendGrid = () => {
  if (isInitialized) return;

  if (!SENDGRID_API_KEY) {
    throw new Error("SENDGRID_API_KEY is missing from environment variables");
  }

  sgMail.setApiKey(SENDGRID_API_KEY);
  isInitialized = true;
  logger.info("✅ SendGrid client initialized");
};

// ---

interface EmailOptions {
  email: string;
  subject: string;
  templateName: string;
  templateData: Record<string, any>;
  templateDir: string;
  attachments?: {
    filename: string;
    path?: string;
    content?: string; // base64
    type?: string;
    disposition?: "attachment" | "inline";
    contentId?: string;
  }[];
}

export const sendMail = async (options: EmailOptions): Promise<void> => {
  initializeSendGrid();

  const templatePath = path.join(options.templateDir, options.templateName);
  const html = await ejs.renderFile(templatePath, options.templateData);

  const allAttachments = [...(options.attachments || [])];

  const msg: MailDataRequired = {
    to: options.email,
    from: {
      email: SENDGRID_FROM_EMAIL,
      name: SENDGRID_FROM_NAME,
    },
    subject: options.subject,
    html,
    attachments: allAttachments.map((a) => ({
      filename: a.filename,
      content: a.content || "",
      type: a.type || "application/octet-stream",
      disposition: a.disposition || "attachment",
      contentId: a.contentId,
    })),
  };

  try {
    await sgMail.send(msg);
    logger.info(
      `✅ Email sent to ${options.email} — subject: "${options.subject}"`,
    );
  } catch (error: any) {
    const sgError =
      error?.response?.body?.errors?.[0]?.message || error.message;
    logger.error(`Failed to send email to ${options.email}: ${sgError}`);
    throw new Error(`Email failed: ${sgError}`);
  }
};

// helper to convert local file to base64 for SendGrid attachments
const fileToBase64 = async (filePath: string): Promise<string> => {
  const fs = await import("fs/promises");
  const buffer = await fs.readFile(filePath);
  return buffer.toString("base64");
};
