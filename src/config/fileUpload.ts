import bucket from "../config/firebase";
import { getServiceLogger } from "./createLogger";
import ErrorHandler from "./errorHandler";
import path from "path";

const logger = getServiceLogger("file-upload");

/**
 * Upload a file to Firebase Storage
 * @param file - The file to upload (can be buffer, base64 string, or file path)
 * @param filename - The name to save the file as in storage
 * @param folder - The folder path in storage (default: "uploads")
 * @returns The public URL and storage path of the uploaded file
 */
export interface UploadResult {
  url: string;
  publicId: string;
  name: string;
  size: number;
  mimeType: string;
}

export interface FileUploadOptions {
  folder?: string;
  mimeType?: string;
}

/**
 * Upload a buffer to Firebase Storage
 */
export const uploadBufferToStorage = async (
  buffer: Buffer,
  filename: string,
  options?: FileUploadOptions
): Promise<UploadResult> => {
  const folder = options?.folder || "uploads";
  const storagePath = `${folder}/${filename}`;

  try {
    logger.info(`[Firebase Upload] Starting upload: ${storagePath}`);
    logger.debug(`[Firebase Upload] Buffer size: ${buffer.length} bytes, MIME: ${options?.mimeType}`);

    const file = bucket.file(storagePath);
    
    // Upload with timeout handling
    await Promise.race([
      file.save(buffer, {
        metadata: {
          contentType: options?.mimeType || "application/octet-stream",
        },
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Firebase upload timeout after 30s")), 30000)
      ),
    ]);

    logger.info(`[Firebase Upload] File saved, making public: ${storagePath}`);

    // Make the file publicly accessible
    await file.makePublic();

    // Get the public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

    logger.info(`[Firebase Upload] Upload complete: ${publicUrl}`);

    return {
      url: publicUrl,
      publicId: storagePath,
      name: filename,
      size: buffer.length,
      mimeType: options?.mimeType || "application/octet-stream",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error(`[Firebase Upload] Failed: ${errorMessage}`);
    throw new ErrorHandler(`Failed to upload file: ${errorMessage}`, 500);
  }
};

/**
 * Upload a base64 encoded string to Firebase Storage
 */
export const uploadBase64ToStorage = async (
  base64String: string,
  filename: string,
  options?: FileUploadOptions
): Promise<UploadResult> => {
  try {
    // Handle data URI format (e.g., "data:application/pdf;base64,xxx")
    let mimeType = options?.mimeType || "application/octet-stream";
    let base64Data = base64String;

    if (base64String.includes(";base64,")) {
      const matches = base64String.match(/^data:(.+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        base64Data = matches[2];
      }
    }

    const buffer = Buffer.from(base64Data, "base64");

    return await uploadBufferToStorage(buffer, filename, {
      ...options,
      mimeType,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Failed to upload base64 file: ${errorMessage}`);
    throw new ErrorHandler(`Failed to upload base64 file: ${errorMessage}`, 500);
  }
};

/**
