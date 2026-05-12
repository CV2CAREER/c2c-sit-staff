import { getServiceLogger } from './createLogger';

const logger = getServiceLogger('gdrive');

// Google Drive folder IDs
const prospectFolderId = process.env.PROSPECT_FOLDER_ID;
const onboardingFolderId = process.env.ONBOARDING_FOLDER_ID;

/**
 * Get MIME type based on file extension
 * @param extension - The file extension (including the dot)
 * @returns The corresponding MIME type
 */
export function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
  };
  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}

/**
 * Get parent folder ID based on payment status
 * @param hasPaid - Whether the client has paid
 * @returns The appropriate folder ID
 */
export function getParentFolderId(hasPaid: boolean): string | undefined {
  const folderId = hasPaid ? onboardingFolderId : prospectFolderId;
  logger.debug(`Parent folder ID for paid=${hasPaid}: ${folderId}`);
  return folderId;
}