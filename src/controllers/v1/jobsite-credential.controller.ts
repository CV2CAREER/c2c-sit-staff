import fs from "fs/promises";
import { Request, Response } from "express";
import formidable, { type File as FormidableFile } from "formidable";
import { parse as parseCsv } from "csv-parse/sync";
import catchAsyncError from "../../utils/catchAsyncError";
import { getServiceLogger } from "../../utils/createLogger";
import { JobsiteCredentialRejectionReason } from "../../utils/enum";
import ErrorHandler from "../../utils/errorHandler";
import {
  submitJobsiteCredential as submitJobsiteCredentialService,
  addJobsiteCredentialManually as addJobsiteCredentialManuallyService,
  editJobsiteCredential as editJobsiteCredentialService,
  acceptJobsiteCredential as acceptJobsiteCredentialService,
  unapproveJobsiteCredential as unapproveJobsiteCredentialService,
  sendTestEmail as sendTestEmailService,
  approveJobsiteCredential as approveJobsiteCredentialService,
  rejectJobsiteCredential as rejectJobsiteCredentialService,
  revealJobsiteCredentialPassword as revealJobsiteCredentialPasswordService,
  getAllJobsiteCredentials as getAllJobsiteCredentialsService,
  getMyJobsiteCredential as getMyJobsiteCredentialService,
  getClientJobsiteCredential as getClientJobsiteCredentialService,
  importJobsiteCredentialsFromCsv as importJobsiteCredentialsFromCsvService,
  CsvImportRow,
} from "../../services/jobsite-credential.service";

// Staff-only authorization for these routes is enforced at the route
// layer via authorizeRoles("admin", "assistant") — see
// routes/v1/jobsite-credential.route.ts.

const logger = getServiceLogger("jobsite-credential-controller");

export const getAllJobsiteCredentials = catchAsyncError(
  async (req: Request, res: Response) => {
    const adminId = (req as any).user?.id;

    if (!adminId) {
      throw new Error("User not authenticated");
    }

    logger.info(`Fetching all jobsite credentials, requested by: ${adminId}`);

    const credentials = await getAllJobsiteCredentialsService();

    res.apiSuccess(credentials, "Jobsite credentials retrieved successfully");
  },
);

export const getMyJobsiteCredential = catchAsyncError(
  async (req: Request, res: Response) => {
    const clientId = (req as any).user?.id;

    if (!clientId) {
      throw new Error("User not authenticated");
    }

    const credential = await getMyJobsiteCredentialService(clientId);

    res.apiSuccess(credential, "Jobsite credential retrieved successfully");
  },
);

export const getClientJobsiteCredential = catchAsyncError(
  async (req: Request, res: Response) => {
    const adminId = (req as any).user?.id;

    if (!adminId) {
      throw new Error("User not authenticated");
    }

    const { clientId } = req.params;

    const credential = await getClientJobsiteCredentialService(clientId);

    res.apiSuccess(credential, "Jobsite credential retrieved successfully");
  },
);

export const submitJobsiteCredential = catchAsyncError(
  async (req: Request, res: Response) => {
    const clientId = (req as any).user?.id;

    if (!clientId) {
      throw new Error("User not authenticated");
    }

    const { email } = req.body;

    logger.info(`Client ${clientId} submitting jobsite credential`);

    const credential = await submitJobsiteCredentialService(clientId, email);

    res.apiSuccess(
      credential,
      "Application email submitted — pending forwarding and approval",
      201,
    );
  },
);

export const addJobsiteCredentialManually = catchAsyncError(
  async (req: Request, res: Response) => {
    const adminId = (req as any).user?.id;

    if (!adminId) {
      throw new Error("User not authenticated");
    }

    const { clientId, email } = req.body;

    if (!clientId) {
      throw new ErrorHandler("clientId is required", 400);
    }

    logger.info(
      `Admin ${adminId} manually adding jobsite credential for client ${clientId}`,
    );

    const credential = await addJobsiteCredentialManuallyService(
      clientId,
      email,
      adminId,
    );

    res.apiSuccess(credential, "Credential added successfully", 201);
  },
);

export const editJobsiteCredential = catchAsyncError(
  async (req: Request, res: Response) => {
    const adminId = (req as any).user?.id;

    if (!adminId) {
      throw new Error("User not authenticated");
    }

    const { id } = req.params;
    const { email, generatedPassword } = req.body;

    const credential = await editJobsiteCredentialService(id, adminId, {
      email,
      generatedPassword,
    });

    res.apiSuccess(credential, "Credential updated successfully");
  },
);

export const acceptJobsiteCredential = catchAsyncError(
  async (req: Request, res: Response) => {
    const adminId = (req as any).user?.id;

    if (!adminId) {
      throw new Error("User not authenticated");
    }

    const { id } = req.params;

    logger.info(`Admin ${adminId} accepting jobsite credential: ${id}`);

    const credential = await acceptJobsiteCredentialService(id, adminId);

    res.apiSuccess(
      credential,
      "Credential accepted — client can no longer edit this email",
    );
  },
);

export const unapproveJobsiteCredential = catchAsyncError(
  async (req: Request, res: Response) => {
    const adminId = (req as any).user?.id;

    if (!adminId) {
      throw new Error("User not authenticated");
    }

    const { id } = req.params;
    const host = req.headers.host || req.headers.origin || "localhost";

    logger.info(`Admin ${adminId} unapproving jobsite credential: ${id}`);

    const credential = await unapproveJobsiteCredentialService(id, adminId, host);

    res.apiSuccess(credential, "Credential moved back a stage");
  },
);

export const sendTestEmail = catchAsyncError(
  async (req: Request, res: Response) => {
    const adminId = (req as any).user?.id;

    if (!adminId) {
      throw new Error("User not authenticated");
    }

    const { id } = req.params;
    const host = req.headers.host || req.headers.origin || "localhost";

    logger.info(`Admin ${adminId} sending test email for jobsite credential: ${id}`);

    const credential = await sendTestEmailService(id, adminId, host);

    res.apiSuccess(credential, "Test email sent");
  },
);

export const approveJobsiteCredential = catchAsyncError(
  async (req: Request, res: Response) => {
    const adminId = (req as any).user?.id;

    if (!adminId) {
      throw new Error("User not authenticated");
    }

    const { id } = req.params;
    const host = req.headers.host || req.headers.origin || "localhost";

    logger.info(`Admin ${adminId} approving jobsite credential: ${id}`);

    const credential = await approveJobsiteCredentialService(id, adminId, host);

    res.apiSuccess(credential, "Credential approved — now ACTIVE");
  },
);

export const rejectJobsiteCredential = catchAsyncError(
  async (req: Request, res: Response) => {
    const adminId = (req as any).user?.id;

    if (!adminId) {
      throw new Error("User not authenticated");
    }

    const { id } = req.params;
    const { reason, note } = req.body;
    const host = req.headers.host || req.headers.origin || "localhost";

    if (
      !reason ||
      !Object.values(JobsiteCredentialRejectionReason).includes(reason)
    ) {
      throw new ErrorHandler(
        "A valid rejection reason is required — free text is not accepted",
        400,
      );
    }

    logger.info(`Admin ${adminId} rejecting jobsite credential: ${id} — ${reason}`);

    const credential = await rejectJobsiteCredentialService(
      id,
      adminId,
      reason,
      host,
      note,
      host,
    );

    res.apiSuccess(credential, "Credential rejected successfully");
  },
);

export const revealJobsiteCredentialPassword = catchAsyncError(
  async (req: Request, res: Response) => {
    const adminId = (req as any).user?.id;

    if (!adminId) {
      throw new Error("User not authenticated");
    }

    const { id } = req.params;

    logger.info(`Admin ${adminId} revealing password for jobsite credential: ${id}`);

    const password = await revealJobsiteCredentialPasswordService(id, adminId);

    res.apiSuccess({ password }, "Password revealed — this has been logged");
  },
);

const parseCsvUploadForm = (
  req: Request,
): Promise<{ file: FormidableFile | undefined }> =>
  new Promise((resolve, reject) => {
    const form = formidable({ keepExtensions: true, multiples: false });

    form.parse(req, (err, _fields, files) => {
      if (err) {
        reject(err);
        return;
      }

      const uploaded = files.file;
      const file = Array.isArray(uploaded) ? uploaded[0] : uploaded;
      resolve({ file });
    });
  });

export const importJobsiteCredentialsCsv = catchAsyncError(
  async (req: Request, res: Response) => {
    const adminId = (req as any).user?.id;

    if (!adminId) {
      throw new Error("User not authenticated");
    }

    const { file } = await parseCsvUploadForm(req);

    if (!file) {
      throw new ErrorHandler("No CSV file uploaded", 400);
    }

    let rows: CsvImportRow[];
    try {
      const buffer = await fs.readFile(file.filepath);
      rows = parseCsv(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as CsvImportRow[];
    } catch (error: any) {
      throw new ErrorHandler(
        `Failed to parse CSV — check the file has "clientEmail" and "applicationEmail" columns: ${error.message}`,
        400,
      );
    } finally {
      await fs.unlink(file.filepath).catch(() => {
        logger.warn(`Failed to clean up temp CSV file: ${file.filepath}`);
      });
    }

    logger.info(
      `Admin ${adminId} importing ${rows.length} jobsite credential rows from CSV`,
    );

    const result = await importJobsiteCredentialsFromCsvService(rows, adminId);

    res.apiSuccess(
      result,
      `Import complete: ${result.created} created, ${result.skipped.length} skipped`,
    );
  },
);
