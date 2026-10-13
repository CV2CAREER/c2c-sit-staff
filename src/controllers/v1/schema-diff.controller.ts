import { Request, Response } from "express";
import { schemaDiffApplicationService } from "../../services/admin/schema-diff.application.service";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { Role } from "../../utils/enum";

// Admin > System Controls > Database Evaluation. Admin-only: one side is often
// PROD, and the diff exposes full DDL.
const ensureAdmin = (req: Request) => {
  const { user } = req;
  if (!user || user.role !== Role.ADMIN) {
    throw new ErrorHandler("Only Admin users can compare database schemas.", 403);
  }
  return user;
};

export const getSchemaDiffTargets = catchAsyncError(async (req: Request, res: Response) => {
  ensureAdmin(req);
  const result = await schemaDiffApplicationService.listTargets(req.query.refresh === "true");
  res.apiSuccess(result, "Databases retrieved successfully");
});

export const postSchemaDiffPing = catchAsyncError(async (req: Request, res: Response) => {
  ensureAdmin(req);
  const result = await schemaDiffApplicationService.ping(String(req.body?.key || ""));
  res.apiSuccess(result, `Connected to ${result.label} in ${result.latencyMs}ms`);
});

export const postSchemaDiffCompare = catchAsyncError(async (req: Request, res: Response) => {
  const user = ensureAdmin(req);
  const result = await schemaDiffApplicationService.compare({
    sourceKey: String(req.body?.sourceKey || ""),
    targetKey: String(req.body?.targetKey || ""),
    schemas: req.body?.schemas,
    refresh: Boolean(req.body?.refresh),
    includeLegacy: Boolean(req.body?.includeLegacy),
    actorUserId: user.id,
  });
  res.apiSuccess(
    result,
    result.summary.identical
      ? result.legacy.hiddenDifferences
        ? "Every table the app uses matches (only migrated/unused tables differ)"
        : "The schemas are identical"
      : `Found ${result.summary.total} difference(s)`,
  );
});

export const postSchemaDiffAi = catchAsyncError(async (req: Request, res: Response) => {
  const user = ensureAdmin(req);
  const result = await schemaDiffApplicationService.aiReview({
    sourceKey: String(req.body?.sourceKey || ""),
    targetKey: String(req.body?.targetKey || ""),
    schemas: req.body?.schemas,
    question: req.body?.question,
    includeLegacy: Boolean(req.body?.includeLegacy),
    actorUserId: user.id,
  });
  res.apiSuccess(result, "AI review ready");
});

export const postSchemaDiffTableUsage = catchAsyncError(async (req: Request, res: Response) => {
  const user = ensureAdmin(req);
  const usage = req.body?.usage ?? null;
  const result = await schemaDiffApplicationService.setTableUsage(String(req.body?.table || ""), usage, user.id);
  res.apiSuccess(
    result,
    usage === "unused"
      ? `"${result.table}" is now treated as unused`
      : usage === "used"
        ? `"${result.table}" is now treated as used by the app`
        : `"${result.table}" is back to automatic detection`,
  );
});
