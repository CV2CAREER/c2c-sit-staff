import { Request, Response } from "express";
import { SCHEMA_CHANGE_STATUSES } from "../../models/v1/schema-change-request.model";
import { PlanResult, schemaChangeService, withPeople } from "../../services/admin/schema-change/schema-change.service";
import { fetchWorkbookFromUrl, parseWorkbook, serviceAccountEmail } from "../../services/admin/schema-change/sheet-import/fetch-workbook";
import { interpretSheet } from "../../services/admin/schema-change/sheet-import/interpret";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { Role } from "../../utils/enum";

// Admin > Database Modifications. Admin-only; approval rules for protected
// databases are enforced in the service.
const ensureAdmin = (req: Request) => {
  const { user } = req;
  if (!user || user.role !== Role.ADMIN) {
    throw new ErrorHandler("Only Admin users can change database schemas.", 403);
  }
  return user;
};

export const getSchemaChanges = catchAsyncError(async (req: Request, res: Response) => {
  ensureAdmin(req);
  const status = typeof req.query.status === "string" && SCHEMA_CHANGE_STATUSES.includes(req.query.status as any) ? req.query.status : undefined;
  res.apiSuccess(await withPeople(await schemaChangeService.list(status)), "Schema changes retrieved");
});

export const getSchemaChangeStructure = catchAsyncError(async (req: Request, res: Response) => {
  ensureAdmin(req);
  const key = String(req.query.key || "");
  if (!key) throw new ErrorHandler("Pick a database first.", 400);
  res.apiSuccess(await schemaChangeService.structure(key), "Database structure retrieved");
});

export const postSchemaChangePreview = catchAsyncError(async (req: Request, res: Response) => {
  ensureAdmin(req);
  const plan = await schemaChangeService.preview(String(req.body?.targetKey || ""), req.body?.operations);
  res.apiSuccess(plan, plan.summary.canApply ? "Review ready — the change can be applied" : "Review ready — the change is blocked");
});

export const postSchemaChangeExplain = catchAsyncError(async (req: Request, res: Response) => {
  ensureAdmin(req);
  let plan: PlanResult | undefined;
  if (req.body?.requestId) {
    plan = (await schemaChangeService.get(String(req.body.requestId))).plan as unknown as PlanResult;
  } else if (req.body?.plan && Array.isArray(req.body.plan.operations)) {
    plan = req.body.plan as PlanResult;
  }
  if (!plan) throw new ErrorHandler("Nothing to explain — review the change first.", 400);
  res.apiSuccess({ explanation: await schemaChangeService.explain(plan) }, "Explanation ready");
});

export const postSchemaChange = catchAsyncError(async (req: Request, res: Response) => {
  const user = ensureAdmin(req);
  const request = await schemaChangeService.create({
    targetKey: String(req.body?.targetKey || ""),
    operations: req.body?.operations,
    title: req.body?.title,
    reason: req.body?.reason,
    actorUserId: user.id,
  });
  res.apiSuccess(
    request,
    request.isProtected ? "Submitted — another admin must approve it before it can run" : "Saved — ready to apply",
    201,
  );
});

export const getSchemaChange = catchAsyncError(async (req: Request, res: Response) => {
  ensureAdmin(req);
  res.apiSuccess((await withPeople([await schemaChangeService.get(req.params.id)]))[0], "Schema change retrieved");
});

export const postSchemaChangeApprove = catchAsyncError(async (req: Request, res: Response) => {
  const user = ensureAdmin(req);
  const masterKey = typeof req.body?.masterKey === "string" ? req.body.masterKey : undefined;
  const host = String(req.headers.host || req.headers.origin || "localhost");
  const request = await schemaChangeService.approve(req.params.id, user.id, { masterKey, host });
  res.apiSuccess(request, masterKey ? "Approved with the master key — it can now be applied" : "Approved — it can now be applied");
});

export const postSchemaChangeReject = catchAsyncError(async (req: Request, res: Response) => {
  const user = ensureAdmin(req);
  res.apiSuccess(await schemaChangeService.reject(req.params.id, user.id, req.body?.reason), "Rejected");
});

export const postSchemaChangeCancel = catchAsyncError(async (req: Request, res: Response) => {
  const user = ensureAdmin(req);
  res.apiSuccess(await schemaChangeService.cancel(req.params.id, user.id), "Cancelled");
});

export const postSchemaChangeApply = catchAsyncError(async (req: Request, res: Response) => {
  const user = ensureAdmin(req);
  const request = await schemaChangeService.apply(req.params.id, user.id, req.body?.confirmation);
  res.apiSuccess(
    request,
    request.status === "applied" ? "Applied and verified" : "The change failed and was rolled back — the database is unchanged",
  );
});

export const postSchemaChangeRevert = catchAsyncError(async (req: Request, res: Response) => {
  const user = ensureAdmin(req);
  const request = await schemaChangeService.createRevert(req.params.id, user.id);
  res.apiSuccess(request, "Revert prepared — review it, then apply", 201);
});

export const postSchemaChangeRows = catchAsyncError(async (req: Request, res: Response) => {
  ensureAdmin(req);
  const result = await schemaChangeService.rows({
    targetKey: String(req.body?.targetKey || ""),
    schema: req.body?.schema,
    table: req.body?.table,
    conditions: req.body?.conditions,
    page: req.body?.page,
    pageSize: req.body?.pageSize,
  });
  res.apiSuccess(result, "Rows retrieved");
});

// Import a change-request sheet: an uploaded .xlsx/.xls/.csv, or a link.
export const postSchemaChangeImportLoad = catchAsyncError(async (req: Request, res: Response) => {
  ensureAdmin(req);
  const file = (req as Request & { file?: { buffer: Buffer; originalname: string } }).file;
  const workbook = file
    ? parseWorkbook(file.buffer, file.originalname.replace(/\.(xlsx|xls|csv)$/i, ""))
    : await fetchWorkbookFromUrl(String(req.body?.url || ""));
  res.apiSuccess({ ...workbook, serviceAccountEmail: serviceAccountEmail() }, `Read ${workbook.sheets.length} sheet(s)`);
});

export const postSchemaChangeImportInterpret = catchAsyncError(async (req: Request, res: Response) => {
  const user = ensureAdmin(req);
  const result = await interpretSheet({
    targetKey: String(req.body?.targetKey || ""),
    source: String(req.body?.source || "Spreadsheet").slice(0, 200),
    sheetName: String(req.body?.sheetName || "Sheet").slice(0, 200),
    headers: req.body?.headers,
    rows: req.body?.rows,
    answers: req.body?.answers,
    actorUserId: user.id,
  });
  res.apiSuccess(result, result.understood ? "Sheet understood" : "A few questions before continuing");
});
