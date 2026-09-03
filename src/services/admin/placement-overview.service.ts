import { Op, fn, col } from "sequelize";
import { Credentials } from "../../models/v1/credentials.model";
import { User } from "../../models/v1/user.model";
import { ManualApplication } from "../../models/v1/manual-application.model";
import { getServiceLogger } from "../../utils/createLogger";
import { calculateCampaignFields, parseDate } from "../../utils/campaign-calculator";
import { placementExceptionsService } from "./placement-exceptions.service";
import { placementPerformanceService, PerformanceRange } from "./placement-performance.service";

const logger = getServiceLogger("placement-overview-service");

const RANGE_LOOKBACK_MS: Record<PerformanceRange, number> = {
  "1d": 24 * 60 * 60 * 1000,
  "5d": 5 * 24 * 60 * 60 * 1000,
};

const RANGE_LABEL: Record<PerformanceRange, string> = {
  "1d": "Last 1 day",
  "5d": "Last 5 days",
};

// Same standard as placement-performance.service.ts's DPC_LQA_MAX.
const DPC_LQA_MAX = 5;
const JOBS_THIS_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const JOBS_THIS_WEEK_THRESHOLD = 15;
const NO_SUB_WINDOW_MS = 5 * 24 * 60 * 60 * 1000;
// "Expiring soon and flagged" — subscription end date within 14 days.
const EXPIRING_WINDOW_DAYS = 14;

const NOT_EMPTY = { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: "" }, { [Op.ne]: "N/A" }] };

const trimOrNull = (v: string | null | undefined): string | null => {
  const t = (v || "").trim();
  return t || null;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export interface HeroStat {
  key: string;
  label: string;
  value: string;
  sub: string;
  tone: "ok" | "bad";
  href: string | null;
}

export interface RuleChip {
  id: string;
  label: string;
  available: boolean;
  count: number;
}

export interface CrackRow {
  credId: string;
  name: string;
  reasons: string[];
  dpc: string | null;
  days: number | null;
}

export interface FunnelStage {
  label: string;
  value: number;
}

export interface TopBottomEntry {
  role: "DPC" | "VPC" | "SPC";
  name: string | null;
  score: number | null;
  detail: string;
}

export interface PlacementOverview {
  range: PerformanceRange;
  windowLabel: string;
  hero: HeroStat[];
  crackChips: RuleChip[];
  crackRows: CrackRow[];
  crackNote: string;
  topPerformers: TopBottomEntry[];
  bottomPerformers: TopBottomEntry[];
  funnel: FunnelStage[];
  generatedAt: string;
}

interface ClientRow {
  clientId: string;
  credId: string;
  name: string;
  dpc: string | null;
  vpc: string | null;
  spc: string | null;
  days: number | null;
  createdAt: Date;
}

class PlacementOverviewService {
  async getOverview(range: PerformanceRange): Promise<PlacementOverview> {
    const since = new Date(Date.now() - RANGE_LOOKBACK_MS[range]);
    const now = new Date();

    const [credentials, exceptions, performance] = await Promise.all([
      Credentials.findAll({
        where: { isDeleted: false, Active: true },
        include: [{ model: User, as: "client", attributes: ["id", "firstName", "lastName"], required: false }],
      }),
      placementExceptionsService.getExceptions(),
      placementPerformanceService.getPerformance(range),
    ]);

    const clients: ClientRow[] = credentials
      .filter((c) => c.clientId)
      .map((c) => {
        const cred = c.seekExternalCredentials || {};
        const computed = calculateCampaignFields({
          SeekSubStartDate: c.SeekSubStartDate || undefined,
          createdAt: c.createdAt,
          SeekSubDurDays: (cred as any).SeekSubDurDays,
          GraceDuration: (cred as any).GraceDuration,
        });
        const campaignEnd = parseDate(computed.CampaignEnd);
        const days = campaignEnd ? Math.round((campaignEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)) : null;

        return {
          clientId: c.clientId as string,
          credId: c.id,
          name: `${c.client?.firstName || ""} ${c.client?.lastName || ""}`.trim() || "Unknown client",
          dpc: trimOrNull(c.AssignedPCName),
          vpc: trimOrNull(c.AssignedVetName),
          spc: trimOrNull(c.AssignedCompletedName),
          days,
          createdAt: c.createdAt,
        };
      });
    const clientIds = clients.map((c) => c.clientId);

    const [crackChips, crackRows, crackNote] = await this.computeCracks(clients, clientIds, performance.dpc);
    const funnel = await this.computeFunnel(clientIds, since);
    const { topPerformers, bottomPerformers } = this.computeTopBottom(performance);
    const hero = this.computeHero(clients, exceptions, performance, range, crackRows.length);

    logger.info(`Placement overview computed (range=${range}, cracks=${crackRows.length})`);

    return {
      range,
      windowLabel: RANGE_LABEL[range],
      hero,
      crackChips,
      crackRows,
      crackNote,
      topPerformers,
      bottomPerformers,
      funnel,
      generatedAt: new Date().toISOString(),
    };
  }

  // 4 of the reference console's 8 crack rules (Zero discovery, Duplicate
  // DPC, Test account, Expiring+flagged) are computed there against an
  // externally-uploaded pipeline report with no equivalent in this app —
  // shown as unavailable rather than guessed at. The other 4 are computed
  // live from Credentials + ManualApplication.
  private async computeCracks(
    clients: ClientRow[],
    clientIds: string[],
    dpcPerformance: { name: string; lqaRate: number }[],
  ): Promise<[RuleChip[], CrackRow[], string]> {
    const now = new Date();
    const weekSince = new Date(now.getTime() - JOBS_THIS_WEEK_MS);
    const nosubCutoff = new Date(now.getTime() - NO_SUB_WINDOW_MS);

    const [jobsRows, lastSubRows] = await Promise.all([
      ManualApplication.findAll({
        where: {
          client_id: { [Op.in]: clientIds },
          isDeleted: false,
          DiscoveredBy: NOT_EMPTY,
          [Op.or]: [
            { DiscoveryDate: { [Op.gte]: weekSince } },
            { DiscoveryDate: null, createdAt: { [Op.gte]: weekSince } },
          ],
        },
        attributes: ["client_id"],
        raw: true,
      }),
      ManualApplication.findAll({
        where: { client_id: { [Op.in]: clientIds }, isDeleted: false, ApplicationSubmittedBy: NOT_EMPTY },
        attributes: ["client_id", [fn("MAX", col("ApplicationSubmissionDate")), "lastSub"]],
        group: ["client_id"],
        raw: true,
      }),
    ]);

    const jobsThisWeek = new Map<string, number>();
    for (const row of jobsRows as any[]) {
      jobsThisWeek.set(row.client_id, (jobsThisWeek.get(row.client_id) || 0) + 1);
    }
    const lastSubmission = new Map<string, Date>();
    for (const row of lastSubRows as any[]) {
      if (row.lastSub) lastSubmission.set(row.client_id, new Date(row.lastSub));
    }

    const lqaByDpc = new Map<string, number>();
    dpcPerformance.forEach((d) => lqaByDpc.set(d.name, d.lqaRate));

    const hitsByClient = new Map<string, string[]>();
    const push = (clientId: string, label: string) => {
      const arr = hitsByClient.get(clientId) || [];
      arr.push(label);
      hitsByClient.set(clientId, arr);
    };

    let unassignedCount = 0;
    let lqaCount = 0;
    let expiringCount = 0;
    let jobs15Count = 0;
    let nosub5Count = 0;

    clients.forEach((c) => {
      if (!c.dpc || !c.vpc || !c.spc) {
        push(c.clientId, "Controller role unassigned");
        unassignedCount++;
      }
      if (c.dpc && (lqaByDpc.get(c.dpc) ?? 0) >= DPC_LQA_MAX) {
        push(c.clientId, "DPC failing LQA");
        lqaCount++;
      }
      // Sub end date within 14 days from now (past-due clients already show
      // up as lapsed in Exceptions, so this rule is deliberately >= 0 only).
      if (c.days !== null && c.days >= 0 && c.days <= EXPIRING_WINDOW_DAYS) {
        push(c.clientId, "Expiring soon and flagged");
        expiringCount++;
      }
      if ((jobsThisWeek.get(c.clientId) || 0) < JOBS_THIS_WEEK_THRESHOLD) {
        push(c.clientId, "Under 15 jobs this week");
        jobs15Count++;
      }
      // Only applies once a client has had time to reach a first submission —
      // otherwise every brand-new client would falsely flag on day one.
      const eligible = now.getTime() - c.createdAt.getTime() >= NO_SUB_WINDOW_MS;
      if (eligible) {
        const last = lastSubmission.get(c.clientId);
        if (!last || last < nosubCutoff) {
          push(c.clientId, "No submission in 5 days");
          nosub5Count++;
        }
      }
    });

    const crackChips: RuleChip[] = [
      { id: "never", label: "Zero discovery", available: false, count: 0 },
      { id: "duplicate", label: "Under more than one DPC", available: false, count: 0 },
      { id: "test", label: "Possible test account", available: false, count: 0 },
      { id: "unassigned", label: "Controller role unassigned", available: true, count: unassignedCount },
      { id: "lqa", label: "DPC failing LQA", available: true, count: lqaCount },
      { id: "expiring", label: "Expiring soon and flagged", available: true, count: expiringCount },
      { id: "jobs15", label: "Under 15 jobs this week", available: true, count: jobs15Count },
      { id: "nosub5", label: "No submission in 5 days", available: true, count: nosub5Count },
    ];

    const crackRows: CrackRow[] = [...hitsByClient.entries()]
      .map(([clientId, reasons]) => {
        const c = clients.find((x) => x.clientId === clientId)!;
        return { credId: c.credId, name: c.name, reasons, dpc: c.dpc, days: c.days };
      })
      .sort((a, b) => b.reasons.length - a.reasons.length || (a.days ?? 900000) - (b.days ?? 900000));

    const availableChips = crackChips.filter((c) => c.available);
    const crackNote =
      crackRows.length === 0
        ? "No client breaks a live-data rule today."
        : `${availableChips.map((c) => `${c.count} ${c.label.toLowerCase()}`).join(" · ")}. ` +
          "Zero discovery, duplicate DPC and test account rules need a report upload this app doesn't have — shown as unavailable.";

    return [crackChips, crackRows, crackNote];
  }

  private async computeFunnel(clientIds: string[], since: Date): Promise<FunnelStage[]> {
    const [discovered, vetted, submitted] = await Promise.all([
      ManualApplication.count({
        where: {
          client_id: { [Op.in]: clientIds },
          isDeleted: false,
          DiscoveredBy: NOT_EMPTY,
          [Op.or]: [{ DiscoveryDate: { [Op.gte]: since } }, { DiscoveryDate: null, createdAt: { [Op.gte]: since } }],
        },
      }),
      ManualApplication.count({
        where: {
          client_id: { [Op.in]: clientIds },
          isDeleted: false,
          VettedBy: NOT_EMPTY,
          [Op.or]: [{ VettedDate: { [Op.gte]: since } }, { VettedDate: null, createdAt: { [Op.gte]: since } }],
        },
      }),
      ManualApplication.count({
        where: {
          client_id: { [Op.in]: clientIds },
          isDeleted: false,
          ApplicationSubmittedBy: NOT_EMPTY,
          [Op.or]: [
            { ApplicationSubmissionDate: { [Op.gte]: since } },
            { ApplicationSubmissionDate: null, createdAt: { [Op.gte]: since } },
          ],
        },
      }),
    ]);

    return [
      { label: "Discovered", value: discovered },
      { label: "Vetted", value: vetted },
      { label: "Submitted", value: submitted },
    ];
  }

  private computeTopBottom(performance: Awaited<ReturnType<typeof placementPerformanceService.getPerformance>>): {
    topPerformers: TopBottomEntry[];
    bottomPerformers: TopBottomEntry[];
  } {
    const pickDpc = (mode: "top" | "bottom") => {
      if (performance.dpc.length === 0) return null;
      return [...performance.dpc].sort((a, b) => (mode === "top" ? b.score - a.score : a.score - b.score))[0];
    };
    const pickVpc = (mode: "top" | "bottom") => {
      if (performance.vpc.length === 0) return null;
      return [...performance.vpc].sort((a, b) => (mode === "top" ? b.score - a.score : a.score - b.score))[0];
    };
    const pickSpc = (mode: "top" | "bottom") => {
      if (performance.spc.length === 0) return null;
      return [...performance.spc].sort((a, b) => (mode === "top" ? b.score - a.score : a.score - b.score))[0];
    };

    const entry = (
      role: "DPC" | "VPC" | "SPC",
      row: { name: string; score: number; standing: { met: boolean; missed: string[] } } | null,
      metWording: string,
      missedPrefix: string,
    ): TopBottomEntry =>
      row
        ? {
            role,
            name: row.name,
            score: row.score,
            detail: row.standing.met ? metWording : `${missedPrefix}: ${row.standing.missed.join(", ")}`,
          }
        : { role, name: null, score: null, detail: "No activity this window" };

    const dpcTop = pickDpc("top");
    const vpcTop = pickVpc("top");
    const spcTop = pickSpc("top");
    const dpcBottom = pickDpc("bottom");
    const vpcBottom = pickVpc("bottom");
    const spcBottom = pickSpc("bottom");

    return {
      topPerformers: [
        entry("DPC", dpcTop, "Met every standard, highest score", "Still missed"),
        entry("VPC", vpcTop, "Met every standard, highest score", "Still missed"),
        entry("SPC", spcTop, "Met every standard, highest score", "Still missed"),
      ],
      bottomPerformers: [
        entry("DPC", dpcBottom, "Met every standard, lowest score", "Missed"),
        entry("VPC", vpcBottom, "Met every standard, lowest score", "Missed"),
        entry("SPC", spcBottom, "Met every standard, lowest score", "Missed"),
      ],
    };
  }

  private computeHero(
    clients: ClientRow[],
    exceptions: Awaited<ReturnType<typeof placementExceptionsService.getExceptions>>,
    performance: Awaited<ReturnType<typeof placementPerformanceService.getPerformance>>,
    range: PerformanceRange,
    crackCount: number,
  ): HeroStat[] {
    const activeCount = clients.length;
    const totalSubmitted = performance.spc.reduce((sum, r) => sum + r.submitted, 0);
    const avg5d =
      performance.dayCards.length > 0
        ? round1(performance.dayCards.reduce((sum, d) => sum + d.value, 0) / performance.dayCards.length)
        : 0;
    const perClient = activeCount > 0 ? round1(totalSubmitted / activeCount) : 0;

    return [
      {
        key: "active",
        label: "Active clients",
        value: String(activeCount),
        sub: `${exceptions.holdCount} on hold`,
        tone: "ok",
        href: "/admin/placement-management/assignments",
      },
      {
        key: "cracks",
        label: "Falling through cracks",
        value: String(crackCount),
        sub: "Live-data rules only — see below",
        tone: "bad",
        href: "#cracks",
      },
      {
        key: "submitted",
        label: `Submitted, ${RANGE_LABEL[range].toLowerCase()}`,
        value: String(totalSubmitted),
        sub: `5-day daily average ${avg5d}`,
        tone: "ok",
        href: "/admin/placement-management/performance",
      },
      {
        key: "perClient",
        label: "Per client",
        value: String(perClient),
        sub: "against a standard of 120",
        tone: perClient < 120 ? "bad" : "ok",
        href: "/admin/placement-management/performance",
      },
      {
        key: "lapsed",
        label: "Lapsed subscriptions",
        value: String(exceptions.lapsedCount),
        sub: `${exceptions.renewalCount} more end within 14 days`,
        tone: "bad",
        href: "/admin/placement-management/exceptions",
      },
    ];
  }
}

export const placementOverviewService = new PlacementOverviewService();
