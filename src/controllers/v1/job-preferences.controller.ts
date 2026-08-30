import { Request, Response } from "express";
import { QueryTypes, Op } from "sequelize";
import db from "@/database/postgres";
import catchAsyncError from "@/utils/catchAsyncError";
import { getSequelize } from "@/utils/sequelize";
import { Role } from "@/utils/enum";

type Option = { label: string; value: string };

const SUPPORTED_CATEGORIES = [
  "Advertisers",
  "Classification",
  "Job Type",
  "Working Rights",
] as const;

const normalizeArray = (input: unknown): string[] => {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0);
};

const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const sendError = (res: Response, message: string, statusCode = 400) => {
  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
    statusCode,
  });
};

const ensureAdmin = (req: Request): boolean => {
  const user = req.user as any;
  return !!user && user.role === Role.ADMIN;
};

const queryDistinctOptions = async (sql: string): Promise<Option[]> => {
  const sequelize = getSequelize();
  const rows = await sequelize.query<{ value: string }>(sql, {
    type: QueryTypes.SELECT,
  });

  const seen = new Set<string>();
  const options: Option[] = [];

  for (const row of rows) {
    const value = (row.value || "").trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    options.push({ label: value, value });
  }

  return options;
};

const fetchCategoryOptions = async (category: string): Promise<Option[]> => {
  if (category === "Advertisers") {
    return queryDistinctOptions(`
      SELECT DISTINCT TRIM(value) AS value
      FROM (
        SELECT "Advertiser" AS value
        FROM applications
        WHERE "Advertiser" IS NOT NULL
        UNION ALL
        SELECT UNNEST("advertisers") AS value
        FROM profiles
        WHERE "advertisers" IS NOT NULL
      ) source
      WHERE COALESCE(TRIM(value), '') <> ''
      ORDER BY 1
      LIMIT 500
    `);
  }

  if (category === "Classification") {
    return queryDistinctOptions(`
      SELECT DISTINCT TRIM(value) AS value
      FROM (
        SELECT "Classification" AS value
        FROM applications
        WHERE "Classification" IS NOT NULL
        UNION ALL
        SELECT CASE
          WHEN jsonb_typeof(elem) = 'object' THEN elem->>'name'
          WHEN jsonb_typeof(elem) = 'string' THEN TRIM(BOTH '"' FROM elem::text)
          ELSE NULL
        END AS value
        FROM profiles,
             LATERAL jsonb_array_elements(COALESCE("classifications", '[]'::jsonb)) AS elem
      ) source
      WHERE COALESCE(TRIM(value), '') <> ''
      ORDER BY 1
      LIMIT 500
    `);
  }

  if (category === "Job Type") {
    return queryDistinctOptions(`
      SELECT DISTINCT TRIM(value) AS value
      FROM (
        SELECT "Job_Type" AS value
        FROM applications
        WHERE "Job_Type" IS NOT NULL
        UNION ALL
        SELECT UNNEST("jobTypes") AS value
        FROM profiles
        WHERE "jobTypes" IS NOT NULL
      ) source
      WHERE COALESCE(TRIM(value), '') <> ''
      ORDER BY 1
      LIMIT 500
    `);
  }

  if (category === "Working Rights") {
    return queryDistinctOptions(`
      SELECT DISTINCT TRIM(value) AS value
      FROM (
        SELECT UNNEST("workingRight") AS value
        FROM profiles
        WHERE "workingRight" IS NOT NULL
      ) source
      WHERE COALESCE(TRIM(value), '') <> ''
      ORDER BY 1
      LIMIT 500
    `);
  }

  return [];
};

export const getJobPreferencesController = catchAsyncError(
  async (req: Request, res: Response) => {
    if (!ensureAdmin(req)) {
      return sendError(res, "You are not authorized to access this resource", 403);
    }

    const queryCategoriesRaw =
      (req.query["categories[]"] as unknown) ?? (req.query.categories as unknown);

    const requestedCategories = Array.isArray(queryCategoriesRaw)
      ? queryCategoriesRaw
      : typeof queryCategoriesRaw === "string"
        ? [queryCategoriesRaw]
        : [];

    const categories =
      requestedCategories.length > 0
        ? requestedCategories
            .map((value) =>
              SUPPORTED_CATEGORIES.find(
                (candidate) =>
                  candidate.toLowerCase() === String(value).trim().toLowerCase(),
              ),
            )
            .filter((value): value is (typeof SUPPORTED_CATEGORIES)[number] => !!value)
        : [...SUPPORTED_CATEGORIES];

    const uniqueCategories = [...new Set(categories)];

    const data = await Promise.all(
      uniqueCategories.map(async (category) => ({
        category,
        options: await fetchCategoryOptions(category),
      })),
    );

    return res.apiSuccess(data, "Job preferences fetched successfully", 200);
  },
);

export const putJobPreferencesController = catchAsyncError(
  async (req: Request, res: Response) => {
    if (!ensureAdmin(req)) {
      return sendError(res, "You are not authorized to access this resource", 403);
    }

    const uid = typeof req.query.uid === "string" ? req.query.uid.trim() : "";

    if (!uid) {
      return sendError(res, "uid query parameter is required", 400);
    }

    const user = await db.users.findUnique({
      where: { id: uid },
      attributes: ["id"],
    });

    if (!user) {
      return sendError(res, "User not found", 404);
    }

    const body = req.body || {};
    const classifications = Array.isArray(body.classifications)
      ? body.classifications.map((item: any) => {
          if (typeof item === "string") {
            return { id: item, name: item };
          }
          if (item && typeof item.name === "string") {
            return {
              id: String(item.id ?? item.name),
              name: item.name,
            };
          }
          return null;
        }).filter(Boolean)
      : [];

    const payload = {
      role: typeof body.role === "string" ? body.role : null,
      titles: normalizeArray(body.titles),
      keywords: normalizeArray(body.keywords),
      advertisers: normalizeArray(body.advertisers),
      jobTypes: normalizeArray(body.jobTypes),
      minSalary: toNumberOrNull(body.minSalary),
      maxSalary: toNumberOrNull(body.maxSalary),
      classifications,
      workingRight: normalizeArray(body.workingRight),
      country: typeof body.country === "string" ? body.country : null,
      city: normalizeArray(body.city),
      locations: normalizeArray(body.locations),
      additionalComments:
        typeof body.additionalComments === "string"
          ? body.additionalComments
          : null,
      socialSecurityNumber:
        typeof body.socialSecurityNumber === "string"
          ? body.socialSecurityNumber
          : null,
      taxIdentificationNumber:
        typeof body.taxIdentificationNumber === "string"
          ? body.taxIdentificationNumber
          : null,
      maritalStatus:
        typeof body.maritalStatus === "string" ? body.maritalStatus : null,
      disabilityStatus:
        typeof body.disabilityStatus === "string"
          ? body.disabilityStatus
          : null,
      dateOfBirth: typeof body.dateOfBirth === "string" ? body.dateOfBirth : null,
    };

    const profile = await db.profiles.findUnique({
      where: { userId: uid, name: "primary" },
    });

    if (profile) {
      await profile.update(payload);
    } else {
      await db.profiles.create({
        data: {
          userId: uid,
          name: "primary",
          ...payload,
        },
      });
    }

    return res.apiSuccess(
      { uid, saved: true },
      "Job preferences saved successfully",
      200,
    );
  },
);

export const getSheetTemplatesController = catchAsyncError(
  async (req: Request, res: Response) => {
    if (!ensureAdmin(req)) {
      return sendError(res, "You are not authorized to access this resource", 403);
    }

    let templates: Option[] = [
      { label: "General Template", value: "general_template" },
      { label: "Client Sample Template", value: "client_sample_template" },
    ];

    const settingsRows = await db.settings.findMany({
      where: {
        key: {
          [Op.in]: [
            "sheet_templates",
            "sheetTemplates",
            "sheets_templates",
            "sheetsTemplates",
          ],
        },
      },
      attributes: ["key", "value"],
      limit: 1,
    });

    const configuredValue = settingsRows?.[0]?.value;
    if (typeof configuredValue === "string" && configuredValue.trim().length > 0) {
      try {
        const parsed = JSON.parse(configuredValue);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = parsed
            .map((item: any) => {
              if (typeof item === "string") {
                return {
                  label: item,
                  value: item.trim().toLowerCase().replace(/\s+/g, "_"),
                };
              }
              if (item && typeof item.value === "string") {
                return {
                  label: String(item.label || item.value),
                  value: item.value,
                };
              }
              return null;
            })
            .filter((item: Option | null): item is Option => item !== null);

          if (normalized.length > 0) {
            templates = normalized;
          }
        }
      } catch {
        // Keep defaults when setting value is not valid JSON.
      }
    }

    return res.apiSuccess(
      templates,
      "Sheet templates fetched successfully",
      200,
    );
  },
);

export const getUsersFullNameController = catchAsyncError(
  async (req: Request, res: Response) => {

    const skipRaw = Number(req.query.skip ?? 0);
    const skip = Number.isFinite(skipRaw) && skipRaw >= 0 ? skipRaw : 0;
    const limitRaw = Number(req.query.limit ?? 50);
    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 200) : 50;

    const users = await db.users.findMany({
      where: { deletedAt: null },
      attributes: ["id", "firstName", "middleName", "lastName", "email"],
      order: [["createdAt", "DESC"]],
      offset: skip,
      limit,
    });

    const data = users.map((user: any) => ({
      _id: user.id,
      firstName: user.firstName || "",
      middleName: user.middleName || "",
      lastName: user.lastName || "",
      email: user.email || "",
    }));

    return res.apiSuccess(data, "Users fetched successfully", 200);
  },
);
