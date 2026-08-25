import fs from "fs/promises";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
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
  ROLE_TITLE_HEADERS,
  type RoleTitleRow,
} from "../../utils/roleTitleCsv";
import { xlsxBufferToCsv } from "../../utils/roleTitleXlsx";
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
        attributes: ["id", "firstName", "lastName", "email"],
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

    const clientEmailSubject = hasRoleTitles
      ? "New Documents Shared With You — Role Titles Need Your Confirmation"
      : "New Documents Shared With You";
    const clientEmailTemplate = "client-support-documents-user.ejs";

    try {
      await sendMail({
        email: client.email,
        subject: clientEmailSubject,
        templateName: clientEmailTemplate,
        userId: client.id,
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
      });
      logger.info(`✅ Upload email sent to ${client.email}`);
    } catch (err: any) {
      logger.error(`❌ Upload email to client failed: ${err}`);
    }

    try {
      await sendMail({
        email: TEAM_EMAIL!,
        subject: `Document Upload Notification — ${fullName}`,
        templateName: "client-support-documents-admin.ejs",
        templateData: {
          userId: client.id,
          typeList,
          count: documents.length,
          timestamp,
          link: `${staffUrl}/admin-dashboard/users/${client.id}`,
          currentYear,
        },
      });
      logger.info(`✅ Upload email sent to ${TEAM_EMAIL}`);
    } catch (err) {
      logger.error(`❌ Upload email to team failed: ${err}`);
    }
  });
};

/** Allowed extensions per category — mirrors the staff UI. */
const ALLOWED_EXTENSIONS: Record<ClientSupportDocumentCategory, string[]> = {
  [ClientSupportDocumentCategory.ROLE_TITLE_RECOMMENDATIONS]: ["csv", "xlsx"],
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

interface RoleTitleExtractionResult {
  rows: RoleTitleRow[];
  rowCount: number;
  extractionMethod: "csv" | "xlsx";
}

/**
 * Dispatches Role Title Recommendations content validation by file type.
 * Both are deterministic — XLSX is converted to CSV text first, then run
 * through the same header/value rules as a real CSV upload.
 */
const extractRoleTitles = async (
  buffer: Buffer,
  extension: string,
  originalFilename: string,
): Promise<RoleTitleExtractionResult> => {
  if (extension === "xlsx") {
    const { errors, rowCount, rows } = validateRoleTitleCsv(
      xlsxBufferToCsv(buffer),
    );
    if (errors.length) {
      throw new ErrorHandler(
        `${originalFilename} was rejected. ${errors.join(" ")}`,
        400,
      );
    }
    return { rows, rowCount, extractionMethod: "xlsx" };
  }

  const { errors, rowCount, rows } = validateRoleTitleCsv(
    buffer.toString("utf8"),
  );
  if (errors.length) {
    throw new ErrorHandler(
      `${originalFilename} was rejected. ${errors.join(" ")}`,
      400,
    );
  }
  return { rows, rowCount, extractionMethod: "csv" };
};

/**
 * Uploads each file to Firebase Storage under the client's folder and records
 * it against the client. Role Title files are content-validated/extracted
 * first; a file that fails validation is rejected and never reaches storage.
 */
export const uploadClientSupportDocuments = async ({
  clientId,
  uploadedBy,
  files,
}: UploadSupportDocumentsInput): Promise<ClientSupportDocument[]> => {
  const client = await User.findByPk(clientId, {
    attributes: ["id", "firstName", "lastName", "email"],
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
      const { rows, rowCount, extractionMethod } = await extractRoleTitles(
        buffer,
        extension,
        file.originalFilename,
      );

      metadata.rowCount = rowCount;
      metadata.extractionMethod = extractionMethod;
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
      isActive: true,
      uploadedBy,
      uploadedAt: new Date(),
      updatedBy: uploadedBy,
    });

    logger.info(
      `Stored ${file.category} "${file.originalFilename}" for client ${clientId}`,
    );

    created.push(record);
  }

  // Documents are active immediately, so the client is notified right away
  // instead of waiting on a separate admin activation step.
  notifyUpload(client, created, uploadedBy);

  return created;
};

export interface AiRoleTitleRole {
  role_title: string;
  classification: string;
  craft: string;
  industry: string;
  status: string;
  ai_career_resilience_rating: string;
  [key: string]: unknown;
}

export interface AiRoleTitleResult {
  candidate_name?: string;
  qa_flags?: { type: string; description: string }[];
  roles: AiRoleTitleRole[];
}

const csvEscape = (value: unknown): string => {
  const str = String(value ?? "");
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

/**
 * Renders AI-generated role title recommendations into the same CSV shape as
 * a manually-uploaded Role Title Recommendations file, then delegates to
 * uploadClientSupportDocuments above so validation, storage, and
 * notifications all stay in lockstep with the manual-upload path.
 */
export const saveAiRoleTitleRecommendations = async (
  clientId: string,
  aiResult: AiRoleTitleResult,
  uploadedBy?: string,
): Promise<{ document: ClientSupportDocument; clientName: string; filename: string }> => {
  if (!Array.isArray(aiResult.roles) || aiResult.roles.length === 0) {
    throw new ErrorHandler("No role title rows to save", 400);
  }

  const csvLines = [
    ROLE_TITLE_HEADERS.join(","),
    ...aiResult.roles.map((role) =>
      [
        role.role_title,
        role.classification,
        role.craft,
        role.industry,
        role.status,
        role.ai_career_resilience_rating,
      ]
        .map(csvEscape)
        .join(","),
    ),
  ];
  const csvText = csvLines.join("\n");

  const { errors } = validateRoleTitleCsv(csvText);
  if (errors.length) {
    throw new ErrorHandler(
      `AI-generated role titles failed validation: ${errors.join(" ")}`,
      422,
    );
  }

  const client = await User.findByPk(clientId, {
    attributes: ["id", "firstName", "lastName", "email"],
  });
  if (!client) {
    throw new ErrorHandler("Client not found", 404);
  }

  const clientName = getFullName(client).trim() || clientId;
  const filenameSlug =
    clientName.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "") || clientId;
  const dateStamp = new Date().toISOString().split("T")[0];
  const filename = `${filenameSlug}_Role_Title_Recommendations_${dateStamp}.csv`;

  const tmpPath = path.join(os.tmpdir(), `role-titles-${randomUUID()}.csv`);
  await fs.writeFile(tmpPath, csvText, "utf8");

  try {
    const [record] = await uploadClientSupportDocuments({
      clientId,
      uploadedBy,
      files: [
        {
          category: ClientSupportDocumentCategory.ROLE_TITLE_RECOMMENDATIONS,
          filepath: tmpPath,
          originalFilename: filename,
          mimetype: "text/csv",
        },
      ],
    });

    // Attach the richer AI metadata (candidate name, qa flags, per-role
    // reasoning) that doesn't fit the flat RoleTitleRow shape stored in
    // `roleTitles`.
    await record.update({
      metadata: {
        ...(record.metadata || {}),
        source: "ai-generated",
        candidateName: aiResult.candidate_name,
        qaFlags: aiResult.qa_flags ?? [],
        roleDetails: aiResult.roles,
      },
    });

    return { document: record, clientName, filename };
  } finally {
    await fs.unlink(tmpPath).catch(() => {});
  }
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
    // Oldest-to-newest, matching the resume/cover-letter uploads list
    // (getUserUploadedDocuments) these rows are displayed alongside.
    order: [["createdAt", "ASC"]],
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
 * Activates a support document. New uploads are created active already;
 * this only matters for legacy rows created inactive under the old gated
 * flow, and fires the client notification (email + Slack) for those.
 */
export const activateClientSupportDocument = async (
  id: string,
  activatedBy?: string,
): Promise<ClientSupportDocument> => {
  const document = await ClientSupportDocument.findByPk(id);

  if (!document || document.isDeleted) {
    throw new ErrorHandler("Document not found", 404);
  }

  if (document.isActive) {
    logger.info(`Client support document ${id} was already active`);
    return document;
  }

  await document.update({ isActive: true, updatedBy: activatedBy });

  const client = await User.findByPk(document.clientId, {
    attributes: ["id", "firstName", "lastName", "email"],
  });

  if (client) {
    notifyUpload(client, [document], activatedBy);
  } else {
    logger.warn(
      `Activated client support document ${id} but client ${document.clientId} was not found — skipped client notification`,
    );
  }

  logger.info(`Activated client support document ${id}`);

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

/**
 * Bulk soft-delete client support documents, removing each underlying
 * object from storage on a best-effort basis. Continues past per-document
 * failures instead of aborting the whole batch.
 */
export const deleteClientSupportDocumentsBulk = async (
  ids: string[],
  deletedBy?: string,
): Promise<{ deletedCount: number; failedCount: number; failures: { id: string; reason: string }[] }> => {
  const failures: { id: string; reason: string }[] = [];
  let deletedCount = 0;

  for (const id of ids) {
    try {
      await deleteClientSupportDocument(id, deletedBy);
      deletedCount++;
    } catch (error: any) {
      failures.push({ id, reason: error?.message || "Failed to delete document" });
    }
  }

  logger.info(`Bulk deleted ${deletedCount} client support document(s)`);

  return { deletedCount, failedCount: failures.length, failures };
};
