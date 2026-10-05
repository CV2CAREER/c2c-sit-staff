import { Request, Response } from "express";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { User } from "../../models/v1/user.model";
import {
  listManualApplications,
  getManualApplicationFilterValues,
  updateManualApplicationRecord,
  setManualApplicationAssurance,
  deleteManualApplicationRecordPermanently,
} from "../../services/discovery-tracker.service";

const resolveActor = (req: Request) => {
  const user = req.user as User;
  const name = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email : "Admin";
  return { name, email: user?.email };
};

export const getManualApplicationsController = catchAsyncError(
  async (req: Request, res: Response) => {
    const { field, value, state } = req.query as Record<string, string | undefined>;
    const isDeleted = req.query.isDeleted === "true" || state === "recycle";
    // Bad or missing values become undefined; the service falls back to its defaults.
    const toInt = (raw: unknown) => {
      const n = parseInt(String(raw), 10);
      return Number.isNaN(n) ? undefined : n;
    };

    try {
      const result = await listManualApplications({
        field,
        value,
        isDeleted,
        page: toInt(req.query.page),
        pageSize: toInt(req.query.pageSize),
      });
      res.apiSuccess(result, "Manual applications retrieved successfully");
    } catch (error: any) {
      return res.apiError(new ErrorHandler(error.message, 400));
    }
  },
);

export const getManualApplicationFilterValuesController = catchAsyncError(
  async (req: Request, res: Response) => {
    const { field } = req.query as Record<string, string | undefined>;

    if (!field) {
      return res.apiError(new ErrorHandler("field query parameter is required", 400));
    }

    try {
      const options = await getManualApplicationFilterValues(field);
      res.apiSuccess(options, "Filter values retrieved successfully");
    } catch (error: any) {
      return res.apiError(new ErrorHandler(error.message, 400));
    }
  },
);

export const updateManualApplicationController = catchAsyncError(
  async (req: Request, res: Response) => {
    const { id } = req.query as Record<string, string | undefined>;
    const host = (req.headers.host || req.headers.origin || "localhost") as string;

    if (!id) {
      return res.apiError(new ErrorHandler("id query parameter is required", 400));
    }

    try {
      const record = await updateManualApplicationRecord(id, req.body || {}, resolveActor(req), host);
      res.apiSuccess(record, "Manual application updated successfully");
    } catch (error: any) {
      const statusCode = error.message === "Manual application not found" ? 404 : 400;
      return res.apiError(new ErrorHandler(error.message, statusCode));
    }
  },
);

/** PATCH /api/v1/discovery-tracker/assurance?id=<id>  { assuranceStatus: "ASSURED" | "FAILED" | null } — admin + assistant */
export const updateAssuranceController = catchAsyncError(
  async (req: Request, res: Response) => {
    const { id } = req.query as Record<string, string | undefined>;

    if (!id) {
      return res.apiError(new ErrorHandler("id query parameter is required", 400));
    }
    if (!req.body || !("assuranceStatus" in req.body)) {
      return res.apiError(new ErrorHandler("assuranceStatus is required (use null to clear)", 400));
    }

    try {
      const record = await setManualApplicationAssurance(
        id,
        req.body.assuranceStatus,
        resolveActor(req),
      );
      res.apiSuccess(record, "Assurance updated successfully");
    } catch (error: any) {
      const statusCode = error.message === "Manual application not found" ? 404 : 400;
      return res.apiError(new ErrorHandler(error.message, statusCode));
    }
  },
);

export const deleteManualApplicationController = catchAsyncError(
  async (req: Request, res: Response) => {
    const { id } = req.query as Record<string, string | undefined>;
    const host = (req.headers.host || req.headers.origin || "localhost") as string;

    if (!id) {
      return res.apiError(new ErrorHandler("id query parameter is required", 400));
    }

    try {
      await deleteManualApplicationRecordPermanently(id, resolveActor(req), host);
      res.apiSuccess(null, "Manual application deleted successfully");
    } catch (error: any) {
      const statusCode = error.message === "Manual application not found" ? 404 : 400;
      return res.apiError(new ErrorHandler(error.message, statusCode));
    }
  },
);
