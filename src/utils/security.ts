import crypto from "crypto";
import { ENCRYPTION_KEY, ENCRYPTION_SECRET } from "../config/env";
import ErrorHandler from "./errorHandler";
import dotenv from "dotenv";

dotenv.config();

// encrypt strings
const secret = Buffer.from(ENCRYPTION_SECRET!, "base64");

export const encryptData = (plainText: string): string => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(secret), iv);

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");

  return iv.toString("hex") + ":" + encrypted;
};

export const decryptData = (encryptedData: string | null): string => {
  if (!encryptedData) return "Null data";

  const [ivHex, encryptedText] = encryptedData.split(":");

  if (!ivHex || !encryptedText) {
    throw new ErrorHandler("Invalid encrypted data format", 400);
  }

  const iv = Buffer.from(ivHex, "hex");
  if (iv.length !== 16) {
    throw new ErrorHandler("Invalid IV length: expected 16 bytes", 400);
  }

  const decipher = crypto.createDecipheriv("aes-256-cbc", secret, iv);

  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};

// encrypt object

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY = crypto.createHash("sha256").update(ENCRYPTION_KEY!).digest();

export function encryptObjectData(payload: object): string {
  const plaintext = JSON.stringify(payload);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  const combined = Buffer.concat([iv, encrypted, authTag]);

  return combined.toString("base64");
}

export function decryptObjectData(encryptedToken: string): any {
  const data = Buffer.from(encryptedToken, "base64");

  const iv = data.subarray(0, 12);
  const authTag = data.subarray(data.length - 16);
  const encrypted = data.subarray(12, data.length - 16);

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString("utf8"));
}
