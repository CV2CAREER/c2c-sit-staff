import { getServiceLogger } from "../utils/createLogger";
import ErrorHandler from "../utils/errorHandler";
import { Upload } from "../models/v1/upload.model";
import {
  UploadStatus,
  UploadSource,
  UploadType,
} from "../utils/enum";
import { DocumentFile } from "../types/userdocument.types";


const logger = getServiceLogger("admin-upload-service");


export class UploadService {

  /**
   * Admin upload of CV and/or Cover Letter files to Google bucket
   * Only accepts 'resume' and 'coverletter' types. Creates Upload records with source = ADMIN.
   */
  static async adminUploadCvCoverLetter(
    userId: string,
    files: Array<{
      type: UploadType.RESUME | UploadType.COVER_LETTER;
      document: DocumentFile;
    }>,
  ): Promise<Upload[]> {
    logger.info(`[AdminUploadCvCoverLetter] Admin uploading ${files.length} document(s) for user ${userId}`);

    if (files.length === 0) {
      throw new ErrorHandler("No files provided. Please attach a CV and/or Cover Letter.", 400);
    }

    const uploadsData = files.map((file) => ({
      userId,
      type: file.type,
      document: file.document,
      status: UploadStatus.REVISED,
      source: UploadSource.ADMIN,
    }));

    const uploads = await Upload.bulkCreate(uploadsData);

    logger.info(`[AdminUploadCvCoverLetter] Created ${uploads.length} upload record(s) for user ${userId}`);

    return uploads;
  }
}