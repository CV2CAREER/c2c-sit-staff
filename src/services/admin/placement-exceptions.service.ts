import { Op } from "sequelize";
import { Credentials } from "../../models/v1/credentials.model";
import { User } from "../../models/v1/user.model";
import { getServiceLogger } from "../../utils/createLogger";
import { calculateCampaignFields, parseDate } from "../../utils/campaign-calculator";

const logger = getServiceLogger("placement-exceptions-service");

// Broader than Assignments' in-flight-only population — Exceptions also
// surfaces on-hold clients (the "On hold" reason).
const EXCEPTION_STATUSES = ["INFLIGHT", "HOLD"];

export type ExceptionLevel = "warn" | "bad";

export interface ExceptionRow {
  credId: string;
  name: string;
  reason: string;
  level: ExceptionLevel;
  status: string | null;
  dpc: string | null;
  subEnd: string | null;
  days: number | null;
}

export interface PlacementExceptions {
  rows: ExceptionRow[];
  lapsedCount: number;
  renewalCount: number;
  holdCount: number;
  noDateCount: number;
  generatedAt: string;
}

const trimOrNull = (v: string | null | undefined): string | null => {
  const t = (v || "").trim();
  return t || null;
};

class PlacementExceptionsService {
  async getExceptions(): Promise<PlacementExceptions> {
    const credentials = await Credentials.findAll({
      where: {
        isDeleted: false,
        capitalized: { [Op.in]: EXCEPTION_STATUSES },
      },
      include: [{ model: User, as: "client", attributes: ["id", "firstName", "lastName"], required: false }],
      order: [["createdAt", "ASC"]],
    });

    const now = new Date();

    const resolved = credentials.map((row) => {
      const cred = row.seekExternalCredentials || {};
      const computed = calculateCampaignFields({
        SeekSubStartDate: row.SeekSubStartDate || undefined,
        createdAt: row.createdAt,
        SeekSubDurDays: (cred as any).SeekSubDurDays,
        GraceDuration: (cred as any).GraceDuration,
      });
      const campaignEnd = parseDate(computed.CampaignEnd);
      const days = campaignEnd
        ? Math.round((campaignEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        : null;

      return {
        credId: row.id,
        name: `${row.client?.firstName || ""} ${row.client?.lastName || ""}`.trim() || "Unknown client",
        capitalized: trimOrNull(row.capitalized || null),
        dpc: trimOrNull(row.AssignedPCName),
        vpc: trimOrNull(row.AssignedVetName),
        spc: trimOrNull(row.AssignedCompletedName),
        subEnd: computedEndDisplay(campaignEnd),
        days,
      };
    });

    const holdList = resolved.filter((r) => r.capitalized === "HOLD");
    const activeList = resolved.filter((r) => r.capitalized === "INFLIGHT");
    const lapsed = resolved.filter((r) => r.days !== null && r.days < 0);
    const w14 = resolved.filter((r) => r.days !== null && r.days >= 0 && r.days <= 14);
    const noDate = resolved.filter((r) => !r.subEnd);

    const rows: ExceptionRow[] = [];
    const seen = new Set<string>();
    const push = (r: (typeof resolved)[number], reason: string, level: ExceptionLevel) => {
      const key = `${r.credId}:${reason}`;
      if (seen.has(key)) return;
      seen.add(key);
      rows.push({
        credId: r.credId,
        name: r.name,
        reason,
        level,
        status: r.capitalized,
        dpc: r.dpc,
        subEnd: r.subEnd,
        days: r.days,
      });
    };

    holdList.forEach((r) => push(r, "On hold", "warn"));
    w14.forEach((r) => push(r, "Ends within 14 days", "warn"));
    lapsed.forEach((r) => push(r, "Past end date", "bad"));
    noDate.forEach((r) => push(r, "No end date", "bad"));
    activeList.filter((r) => !r.dpc || !r.vpc || !r.spc).forEach((r) => push(r, "Controller role unassigned", "bad"));

    const rank: Record<ExceptionLevel, number> = { bad: 0, warn: 1 };
    rows.sort(
      (a, b) => rank[a.level] - rank[b.level] || (a.days === null ? -9e5 : a.days) - (b.days === null ? -9e5 : b.days),
    );

    logger.info(`Placement exceptions computed (rows=${rows.length})`);

    return {
      rows,
      lapsedCount: lapsed.length,
      renewalCount: w14.length,
      holdCount: holdList.length,
      noDateCount: noDate.length,
      generatedAt: new Date().toISOString(),
    };
  }
}

// Formats a resolved CampaignEnd as DD-MM-YYYY (same convention as
// placement-assignments.service.ts's computedEndDisplay).
function computedEndDisplay(campaignEnd: Date | null): string | null {
  if (!campaignEnd) return null;
  const d = String(campaignEnd.getUTCDate()).padStart(2, "0");
  const m = String(campaignEnd.getUTCMonth() + 1).padStart(2, "0");
  const y = campaignEnd.getUTCFullYear();
  return `${d}-${m}-${y}`;
}

export const placementExceptionsService = new PlacementExceptionsService();
