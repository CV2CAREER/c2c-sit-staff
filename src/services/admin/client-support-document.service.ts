import fs from "fs/promises";
import path from "path";
import {
  ClientSupportDocument,
  ClientSupportDocumentCategory,
} from "../../models/v1/client-support-document.model";
import { User } from "../../models/v1/user.model";
import {
  deleteFileFromStorage,
  generateUniqueFilename,
  uploadBufferToStorage,
} from "../../utils/fileUpload";
import {
  validateRoleTitleCsv,
  type RoleTitleRow,
} from "../../utils/roleTitleCsv";
import { getServiceLogger } from "../../utils/createLogger";
import ErrorHandler from "../../utils/errorHandler";
import { SlackService } from "../slack.service";
import { getEnvironmentFromHost } from "../../utils/slack-helpers";
import {
  SlackChannel,
  SlackEventType,
  SlackNode,
  SlackProvider,
  SlackSeverity,
} from "../../utils/enum";
import { sendMail } from "../../config/sendGrid";
import { getFullName, getFrontendUrl } from "../../utils/helpers";
import { TEAM_EMAIL } from "../../config/env";

const logger = getServiceLogger("client-support-document-service");
const mailDirectory = path.resolve(__dirname, "../../views/emails");

/** Human-readable labels for notification copy. */
const CATEGORY_LABELS: Record<ClientSupportDocumentCategory, string> = {
  [ClientSupportDocumentCategory.ROLE_TITLE_RECOMMENDATIONS]:
    "Role Title Recommendations",
  [ClientSupportDocumentCategory.SUPPORT_IMAGES]: "Support Images",
  [ClientSupportDocumentCategory.SUPPORT_SPREADSHEETS]: "Support Spreadsheets",
};

/**
 * Fire-and-forget notifications: Slack to the team channel, plus email to the
 * client and the team inbox. Deliberately non-blocking — a failed notification
 * must not fail an upload that already succeeded.
 */
const notifyUpload = (
  client: User,
  documents: ClientSupportDocument[],
  uploadedBy?: string,
): void => {
  setImmediate(async () => {
    const host = process.env.CLIENT_APP_DOMAIN;
    const location = getEnvironmentFromHost(host);
    const fullName = getFullName(client);
    // Staff-facing links (Slack, team email) point at the staff dashboard;
    // anything the CLIENT clicks must use CLIENT_APP_DOMAIN, which is the real
    // client-side URL.
    const staffUrl = getFrontendUrl();
    const clientUrl = process.env.CLIENT_APP_DOMAIN;

    // Resolve the staff member's name so the alert reads "id (Name)" rather
    // than a bare id nobody recognises.
    let uploadedByLabel = "system";
    if (uploadedBy) {
      const uploader = await User.findByPk(uploadedBy, {
        attributes: ["id", "firstName", "lastName"],
      }).catch(() => null);

      uploadedByLabel = uploader
        ? `${uploadedBy} (${getFullName(uploader)})`
        : uploadedBy;
    }

    const fileLines = documents
      .map((doc) => {
        // Role Title CSVs carry their parsed rows, so the alert can say how
        // many titles were shared and that they still need client sign-off.
        const suffix =
          doc.category ===
          ClientSupportDocumentCategory.ROLE_TITLE_RECOMMENDATIONS
            ? ` — Role Titles — ${doc.roleTitles?.length ?? 0} titles, awaiting client confirmation`
            : "";

        return `• ${CATEGORY_LABELS[doc.category]} — ${doc.filename}${suffix}`;
      })
      .join("\n");

    try {
      await SlackService.notify({
        location,
        host,
        node: SlackNode.DATA_STORE,
        provider: SlackProvider.FIREBASE,
        severity: SlackSeverity.INFO,
        trigger: `Client support documents uploaded for ${client.email}`,
        type: SlackEventType.DOCUMENT_UPLOAD,
        channel: SlackChannel.TOWN_CRIER,
        teamMentions: "CSM",
        body: `📄 *Documents shared with a client*
Client: ${fullName} · ${client.id}
Shared by: ${uploadedByLabel}
Documents (${documents.length}):
${fileLines}
Next steps: Review the uploads at ${staffUrl}/admin-dashboard/users/${client.id}`,
      });
      logger.info(`✅ Slack notified of support document upload: ${client.email}`);
    } catch (err) {
      logger.error(`❌ Slack notification failed: ${err}`);
    }

    const hasRoleTitles = documents.some(
      (doc) =>
        doc.category ===
        ClientSupportDocumentCategory.ROLE_TITLE_RECOMMENDATIONS,
    );
    const fileList = documents.map((doc) => doc.filename).join(", ");
    const typeList = Array.from(
      new Set(documents.map((doc) => CATEGORY_LABELS[doc.category])),
    ).join(", ");
    const timestamp = new Date().toLocaleString("en-GB", {
      dateStyle: "long",
      timeStyle: "short",
    });
    const currentYear = new Date().getFullYear();

    try {
      await Promise.all([
        sendMail({
          email: client.email,
          subject: hasRoleTitles
            ? "New Documents Shared With You — Role Titles Need Your Confirmation"
            : "New Documents Shared With You",
          templateName: "client-support-documents-user.ejs",
          templateDir: mailDirectory,
          templateData: {
            title: "New Documents Shared With You",
            name: client.firstName,
            documentNames: fileList,
            documentTypes: typeList,
            timestamp,
            hasRoleTitles,
            // Client-facing links — must be the client app, not the staff app.
            frontendUrl: clientUrl,
            currentYear,
          },
        }),
        sendMail({
          email: TEAM_EMAIL!,
          subject: `Document Upload Notification — ${fullName}`,
          templateName: "client-support-documents-admin.ejs",
          templateDir: mailDirectory,
          templateData: {
            userId: client.id,
            typeList,
            count: documents.length,
            timestamp,
            link: `${staffUrl}/admin-dashboard/users/${client.id}`,
            currentYear,
          },
        }),
      ]);
      logger.info(
        `✅ Upload emails sent to ${client.email} and ${TEAM_EMAIL}`,
      );
    } catch (err) {
      logger.error(`❌ Upload email failed: ${err}`);
    }
  });
};

/** Allowed extensions per category — mirrors the staff UI. */
const ALLOWED_EXTENSIONS: Record<ClientSupportDocumentCategory, string[]> = {
  [ClientSupportDocumentCategory.ROLE_TITLE_RECOMMENDATIONS]: ["csv"],
  [ClientSupportDocumentCategory.SUPPORT_IMAGES]: [
    "png",
    "jpg",
    "jpeg",
    "heic",
  ],
  [ClientSupportDocumentCategory.SUPPORT_SPREADSHEETS]: ["xlsx", "csv"],
};

export interface IncomingSupportFile {
  category: ClientSupportDocumentCategory;
  /** Temp path written by the multipart parser. */
  filepath: string;
  originalFilename: string;
  mimetype?: string;
  size?: number;
}

export interface UploadSupportDocumentsInput {
  clientId: string;
  /** Staff user performing the upload. */
  uploadedBy?: string;
  files: IncomingSupportFile[];
}

const extensionOf = (filename: string) =>
  path.extname(filename).replace(/^\./, "").toLowerCase();

/**
 * Uploads each file to Firebase Storage under the client's folder and records
 * it against the client. Role Title CSVs are content-validated first; a file
 * that fails validation is rejected and never reaches storage.
 */
export const uploadClientSupportDocuments = async ({
  clientId,
  uploadedBy,
  files,
}: UploadSupportDocumentsInput): Promise<ClientSupportDocument[]> => {
  const client = await User.findByPk(clientId, {
    attributes: ["id", "email", "firstName", "lastName"],
  });
  if (!client) {
    throw new ErrorHandler("Client not found", 404);
  }

  if (!files.length) {
    throw new ErrorHandler("No files uploaded", 400);
  }

  const created: ClientSupportDocument[] = [];

  for (const file of files) {
    const allowed = ALLOWED_EXTENSIONS[file.category];
    const extension = extensionOf(file.originalFilename);

    if (!allowed.includes(extension)) {
      throw new ErrorHandler(
        `${file.originalFilename} is not a valid ${file.category} file. Accepted: ${allowed.join(", ")}.`,
        400,
      );
    }

    const buffer = await fs.readFile(file.filepath);
    const metadata: Record<string, unknown> = {};
    let roleTitles: RoleTitleRow[] | undefined;

    if (
      file.category === ClientSupportDocumentCategory.ROLE_TITLE_RECOMMENDATIONS
    ) {
      const { errors, rowCount, rows } = validateRoleTitleCsv(
        buffer.toString("utf8"),
      );

      if (errors.length) {
        throw new ErrorHandler(
          `${file.originalFilename} was rejected. ${errors.join(" ")}`,
          400,
        );
      }

      metadata.rowCount = rowCount;
      roleTitles = rows;
    }

    const storageName = generateUniqueFilename(file.originalFilename);
    const uploadResult = await uploadBufferToStorage(buffer, storageName, {
      folder: `client-support-documents/${clientId}/${file.category}`,
      mimeType: file.mimetype || undefined,
    });

    const record = await ClientSupportDocument.create({
      clientId,
      category: file.category,
      filename: file.originalFilename,
      cloudFilename: uploadResult.publicId,
      fileUrl: uploadResult.url,
      mimeType: uploadResult.mimeType,
      size: uploadResult.size,
      metadata,
      roleTitles,
      uploadedBy,
      uploadedAt: new Date(),
      updatedBy: uploadedBy,
    });

    logger.info(
      `Stored ${file.category} "${file.originalFilename}" for client ${clientId}`,
    );

    created.push(record);
  }

  notifyUpload(client, created, uploadedBy);

  return created;
};

export const listClientSupportDocuments = async (
  clientId: string,
  category?: ClientSupportDocumentCategory,
): Promise<ClientSupportDocument[]> =>
  ClientSupportDocument.findAll({
    where: {
      clientId,
      isDeleted: false,
      ...(category ? { category } : {}),
    },
    order: [["createdAt", "DESC"]],
  });

export const getClientSupportDocument = async (
  id: string,
): Promise<ClientSupportDocument> => {
  const document = await ClientSupportDocument.findByPk(id);

  if (!document || document.isDeleted) {
    throw new ErrorHandler("Document not found", 404);
  }

  return document;
};

/**
 * Soft-deletes the record and removes the underlying object from storage.
 */
export const deleteClientSupportDocument = async (
  id: string,
  deletedBy?: string,
): Promise<void> => {
  const document = await ClientSupportDocument.findByPk(id);

  if (!document || document.isDeleted) {
    throw new ErrorHandler("Document not found", 404);
  }

  try {
    await deleteFileFromStorage(document.cloudFilename);
  } catch (error: any) {
    // A missing object shouldn't block the record from being retired.
    logger.warn(
      `Could not remove ${document.cloudFilename} from storage: ${error.message}`,
    );
  }

  await document.update({ isDeleted: true, updatedBy: deletedBy });
  await document.destroy();

  logger.info(`Deleted client support document ${id}`);
};
