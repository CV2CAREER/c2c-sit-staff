import { Op, QueryTypes } from "sequelize";
import { Credentials } from "../../models/v1/credentials.model";
import { User } from "../../models/v1/user.model";
import { ManualApplication } from "../../models/v1/manual-application.model";
import { getServiceLogger } from "../../utils/createLogger";
import { calculateCampaignFields, parseDate } from "../../utils/campaign-calculator";
import { getSequelize } from "../../utils/sequelize";

const logger = getServiceLogger("placement-performance-service");

export type PerformanceRange = "1d" | "5d";

// Rolling trailing windows (now - N days), not calendar-day-aligned — avoids
// the non-monotonic-boundary bug pipeline-stats.service.ts hit earlier with
// startOf('week')/startOf('month').
const RANGE_LOOKBACK_MS: Record<PerformanceRange, number> = {
  "1d": 24 * 60 * 60 * 1000,
  "5d": 5 * 24 * 60 * 60 * 1000,
};

const RANGE_LABEL: Record<PerformanceRange, string> = {
  "1d": "Last 1 day",
  "5d": "Last 5 days",
};

// VPC/SPC score denominator, and the "full day's work" threshold for a DPC's
// client — both given directly by the business, not derived from data.
const VPC_SPC_STANDARD = 240;
const CLIENTS_15_PLUS_THRESHOLD = 15;
const QUEUE_HEALTHY_MAX = 5;
// A vetted job left unsubmitted longer than this is treated as abandoned
// rather than waiting — otherwise months-old VETTED rows keep every client
// permanently "not clear".
const SPC_QUEUE_LOOKBACK_DAYS = 7;

// Per-metric pass/fail bars — the reference console's per-cell red-flag
// thresholds (jobs<160, vet-through<70%, LQA>=5%, vetted<240, submitted<120).
// The console's own "Standing" verdict was computed by an external report
// upload not present in this codebase, so these are reconstructed from the
// only concrete numbers the design actually embeds.
const DPC_JOBS_STANDARD = 160;
const DPC_VET_THROUGH_STANDARD = 70;
const DPC_LQA_MAX = 5;
const VPC_VETTED_STANDARD = 240;
const SPC_SUBMITTED_STANDARD = 120;

export interface BookClient {
  clientId: string;
  name: string;
  days: number | null;
  subEnd: string | null;
}

export interface Standing {
  met: boolean;
  missed: string[];
}

// One client's jobs discovered by this DPC in the window — backs the
// "Clients at 15+" breakdown modal.
export interface DpcClientProgress {
  clientId: string;
  name: string;
  jobs: number;
  assigned: boolean;
}

export interface DpcPerformanceRow {
  name: string;
  email: string | null;
  score: number;
  jobs: number;
  clientsAt15: number;
  clientsAssigned: number;
  vetThrough: number;
  lqaRate: number;
  standing: Standing;
  book: BookClient[];
  clientProgress: DpcClientProgress[];
}

export interface VpcPerformanceRow {
  name: string;
  email: string | null;
  score: number;
  vetted: number;
  queueEntries: number;
  queueScore: number;
  high: number;
  med: number;
  low: number;
  standing: Standing;
  book: BookClient[];
}

export interface SpcPerformanceRow {
  name: string;
  email: string | null;
  score: number;
  submitted: number;
  queueEntries: number;
  queueScore: number;
  clientsClear: number;
  clientsAssigned: number;
  // Submitted + every other job this SPC closed out in the window.
  handled: number;
  handledBreakdown: SpcHandledBreakdown;
  standing: Standing;
  book: BookClient[];
}

export interface SpcHandledBreakdown {
  submitted: number;
  blocked: number;
  pending: number;
  expired: number;
  skipped: number;
}

export interface DayCard {
  date: string;
  dow: string;
  label: string;
  value: number;
  isLatestActive: boolean;
}

export interface PlacementPerformance {
  range: PerformanceRange;
  windowLabel: string;
  headline: string;
  dayCards: DayCard[];
  dpc: DpcPerformanceRow[];
  vpc: VpcPerformanceRow[];
  spc: SpcPerformanceRow[];
  generatedAt: string;
}

interface ClientLink {
  clientId: string;
  clientName: string;
  days: number | null;
  subEnd: string | null;
  dpc: string | null;
  vpc: string | null;
  spc: string | null;
}

// Formats a resolved CampaignEnd as DD-MM-YYYY, or null when it couldn't be
// computed — same convention as placement-assignments.service.ts.
function computedEndDisplay(campaignEnd: Date | null): string | null {
  if (!campaignEnd) return null;
  const d = String(campaignEnd.getUTCDate()).padStart(2, "0");
  const m = String(campaignEnd.getUTCMonth() + 1).padStart(2, "0");
  const y = campaignEnd.getUTCFullYear();
  return `${d}-${m}-${y}`;
}

// Sorted by days-left ascending (soonest-ending first), unset dates pushed
// to the end — same convention the Assignments table sorts by.
function bookFor(clients: ClientLink[], role: "dpc" | "vpc" | "spc", name: string): BookClient[] {
  return clients
    .filter((c) => c[role] === name)
    .map((c) => ({ clientId: c.clientId, name: c.clientName, days: c.days, subEnd: c.subEnd }))
    .sort((a, b) => (a.days ?? 900000) - (b.days ?? 900000));
}

// Africa/Lagos has no DST — fixed UTC+1 year-round — same convention the
// leaderboard/ops-report cron jobs use for "today"/"yesterday" boundaries.
const LAGOS_TZ = "Africa/Lagos";

function lagosDateString(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: LAGOS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function lagosDayBounds(ymd: string): { start: Date; end: Date } {
  return {
    start: new Date(`${ymd}T00:00:00.000+01:00`),
    end: new Date(`${ymd}T23:59:59.999+01:00`),
  };
}

// Oldest → newest, ending today (Lagos wall-clock).
function lastNLagosDays(n: number): string[] {
  const todayYmd = lagosDateString(new Date());
  const anchor = new Date(`${todayYmd}T00:00:00Z`);
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(anchor);
    d.setUTCDate(d.getUTCDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

const formatDayLabel = (ymd: string) =>
  new Date(`${ymd}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });
const formatDow = (ymd: string) =>
  new Date(`${ymd}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });

// Same "blank" convention used by the existing leaderboard/ops-report cron
// jobs — these free-text attribution columns store 'N/A' rather than null
// for an unset value as often as not.
const NOT_EMPTY = { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: "" }, { [Op.ne]: "N/A" }] };
const isBlank = (v: unknown) => !v || (typeof v === "string" && (!v.trim() || v.trim() === "N/A"));

const round1 = (n: number) => Math.round(n * 10) / 10;

// Controller names are free text typed in several places, so the same person
// shows up as "Annastescia Nneka" and "annastescia nneka". Group on a
// case/whitespace-insensitive key and display one canonical spelling.
const nameKey = (v: string | null | undefined): string | null => {
  const k = (v || "").trim().replace(/\s+/g, " ").toLowerCase();
  return k && k !== "n/a" ? k : null;
};

// Prefers a spelling with capitals over an all-lowercase one; otherwise the
// first one seen.
class DisplayNames {
  private names = new Map<string, string>();
  add(raw: string | null | undefined): string | null {
    const key = nameKey(raw);
    if (!key) return null;
    const pretty = (raw as string).trim().replace(/\s+/g, " ");
    const current = this.names.get(key);
    if (!current || (current === current.toLowerCase() && pretty !== pretty.toLowerCase())) {
      this.names.set(key, pretty);
    }
    return key;
  }
  get(key: string): string {
    return this.names.get(key) || key;
  }
}

// Same bucketing the leaderboard/ops-report jobs use — QualityScore is one
// of the real AI-vetting values ('HQA' | 'MQA' | 'LQA'), or a human VPC's
// shorthand for the same three tiers.
function bucketQuality(score: string | null | undefined): "high" | "med" | "low" {
  const s = (score || "").toUpperCase().trim();
  if (s === "H" || s === "HQA" || s === "HIGH") return "high";
  if (s === "M" || s === "MQA" || s === "MEDIUM" || s === "MED") return "med";
  return "low";
}

class PlacementPerformanceService {
  async getPerformance(range: PerformanceRange): Promise<PlacementPerformance> {
    const since = new Date(Date.now() - RANGE_LOOKBACK_MS[range]);

    const credentials = await Credentials.findAll({
      where: { isDeleted: false, Active: true },
      include: [{ model: User, as: "client", attributes: ["id", "firstName", "lastName"], required: false }],
    });

    const now = new Date();
    const displayNames = new DisplayNames();
    const clients: ClientLink[] = credentials
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
          clientName: `${c.client?.firstName || ""} ${c.client?.lastName || ""}`.trim() || "Unknown client",
          days,
          subEnd: computedEndDisplay(campaignEnd),
          dpc: displayNames.add(c.AssignedPCName),
          vpc: displayNames.add(c.AssignedVetName),
          spc: displayNames.add(c.AssignedCompletedName),
        };
      });

    // Shared across all three roles — a name→email lookup so a controller
    // showing zero activity this window (still assigned, just idle) is
    // still resolvable to an email.
    const emailLookup = new Map<string, string>();
    credentials.forEach((c) => {
      const pc = nameKey(c.AssignedPCName);
      const vet = nameKey(c.AssignedVetName);
      const completed = nameKey(c.AssignedCompletedName);
      if (pc && c.AssignedPCEmail) emailLookup.set(pc, c.AssignedPCEmail.trim());
      if (vet && c.AssignedVetEmail) emailLookup.set(vet, c.AssignedVetEmail.trim());
      if (completed && c.AssignedCompletedEmail) emailLookup.set(completed, c.AssignedCompletedEmail.trim());
    });

    const clientIds = clients.map((c) => c.clientId);

    const [dpc, vpc, spc, daily] = await Promise.all([
      this.computeDpc(clients, clientIds, since, emailLookup, displayNames),
      this.computeVpc(clients, clientIds, since, emailLookup, displayNames),
      this.computeSpc(clients, clientIds, since, emailLookup, displayNames),
      this.computeDailySummary(clientIds),
    ]);

    logger.info(`Placement performance computed (range=${range}, dpc=${dpc.length}, vpc=${vpc.length}, spc=${spc.length})`);

    return {
      range,
      windowLabel: RANGE_LABEL[range],
      headline: daily.headline,
      dayCards: daily.dayCards,
      dpc,
      vpc,
      spc,
      generatedAt: new Date().toISOString(),
    };
  }

  // A live, real-data replacement for the reference console's manual-export
  // day strip: real submitted-per-day totals across the whole pipeline for
  // the last 5 calendar days (Africa/Lagos), no upload required — a day with
  // zero submissions just shows zero rather than "awaiting export".
  private async computeDailySummary(clientIds: string[]): Promise<{ headline: string; dayCards: DayCard[] }> {
    const days = lastNLagosDays(5);
    const windowStart = lagosDayBounds(days[0]).start;
    const windowEnd = lagosDayBounds(days[days.length - 1]).end;

    // Not limited to currently-active clients — a submission made for a
    // client deactivated since is still work that was done that day.
    const rows = await ManualApplication.findAll({
      where: {
        isDeleted: false,
        ApplicationSubmittedBy: NOT_EMPTY,
        ApplicationSubmissionDate: { [Op.gte]: windowStart, [Op.lte]: windowEnd },
      },
      attributes: ["ApplicationSubmissionDate"],
      raw: true,
    });

    const countByDay = new Map<string, number>();
    days.forEach((d) => countByDay.set(d, 0));
    for (const row of rows as any[]) {
      const raw = row.ApplicationSubmissionDate;
      if (!raw) continue;
      const ymd = lagosDateString(new Date(raw));
      if (countByDay.has(ymd)) countByDay.set(ymd, (countByDay.get(ymd) || 0) + 1);
    }

    const total = [...countByDay.values()].reduce((sum, v) => sum + v, 0);
    const daysWithActivity = [...countByDay.values()].filter((v) => v > 0).length;
    const avg = round1(total / days.length);
    const perClient = clientIds.length > 0 ? round1(total / clientIds.length) : 0;

    // Latest day with any activity — falls back to today if the whole window is quiet.
    let latestDay = days[days.length - 1];
    for (let i = days.length - 1; i >= 0; i--) {
      if ((countByDay.get(days[i]) || 0) > 0) {
        latestDay = days[i];
        break;
      }
    }
    const latestValue = countByDay.get(latestDay) || 0;

    const dayCards: DayCard[] = days.map((d) => ({
      date: d,
      dow: formatDow(d),
      label: formatDayLabel(d),
      value: countByDay.get(d) || 0,
      isLatestActive: d === latestDay && latestValue > 0,
    }));

    const headline =
      latestValue > 0
        ? `${latestValue} submissions on ${formatDayLabel(latestDay)} — 5-day average ${avg}. ${perClient} per client vs. a standard of ${SPC_SUBMITTED_STANDARD}. ${daysWithActivity} of ${days.length} days this window have submission activity.`
        : `No submissions recorded in the last ${days.length} days.`;

    return { headline, dayCards };
  }

  // Score = clients with 15+ jobs discovered this window / clients assigned.
  // Vet-through = of the jobs this DPC discovered this window, how many have
  // since been vetted (any time, not just within the window).
  // LQA rate = of those vetted, how many came back Low Quality.
  private async computeDpc(
    clients: ClientLink[],
    clientIds: string[],
    since: Date,
    emailLookup: Map<string, string>,
    displayNames: DisplayNames,
  ): Promise<DpcPerformanceRow[]> {
    const assignedCount = new Map<string, number>();
    clients.forEach((c) => {
      if (c.dpc) assignedCount.set(c.dpc, (assignedCount.get(c.dpc) || 0) + 1);
    });

    const rows = await ManualApplication.findAll({
      where: {
        client_id: { [Op.in]: clientIds },
        isDeleted: false,
        DiscoveredBy: NOT_EMPTY,
        [Op.or]: [
          { DiscoveryDate: { [Op.gte]: since } },
          { DiscoveryDate: null, createdAt: { [Op.gte]: since } },
        ],
      },
      attributes: ["client_id", "DiscoveredBy", "VettedBy", "QualityScore"],
      raw: true,
    });

    interface Agg {
      total: number;
      vetted: number;
      lqa: number;
      perClient: Map<string, number>;
    }
    const byDpc = new Map<string, Agg>();
    for (const row of rows as any[]) {
      const name = displayNames.add(row.DiscoveredBy);
      if (!name) continue;
      if (!byDpc.has(name)) byDpc.set(name, { total: 0, vetted: 0, lqa: 0, perClient: new Map() });
      const a = byDpc.get(name)!;
      a.total++;
      if (!isBlank(row.VettedBy)) {
        a.vetted++;
        if (bucketQuality(row.QualityScore) === "low") a.lqa++;
      }
      a.perClient.set(row.client_id, (a.perClient.get(row.client_id) || 0) + 1);
    }

    const names = new Set<string>([...assignedCount.keys(), ...byDpc.keys()]);
    const out: DpcPerformanceRow[] = [];
    for (const name of names) {
      const a = byDpc.get(name) || { total: 0, vetted: 0, lqa: 0, perClient: new Map<string, number>() };
      const clientsAssigned = assignedCount.get(name) || 0;
      const clientsAt15 = [...a.perClient.values()].filter((n) => n >= CLIENTS_15_PLUS_THRESHOLD).length;
      const vetThrough = a.total > 0 ? round1((a.vetted / a.total) * 100) : 0;
      const lqaRate = a.vetted > 0 ? round1((a.lqa / a.vetted) * 100) : 0;

      const missed: string[] = [];
      if (a.total < DPC_JOBS_STANDARD) missed.push(`jobs (${a.total} of ${DPC_JOBS_STANDARD})`);
      if (a.total > 0 && vetThrough < DPC_VET_THROUGH_STANDARD) missed.push(`vet-through (${vetThrough}%, standard ${DPC_VET_THROUGH_STANDARD}%)`);
      if (a.vetted > 0 && lqaRate >= DPC_LQA_MAX) missed.push(`LQA (${lqaRate}%, cap ${DPC_LQA_MAX}%)`);

      // Every assigned client (even at 0 jobs) plus any unassigned client
      // this DPC discovered for — most jobs first.
      const clientNames = new Map(clients.map((c) => [c.clientId, c.clientName]));
      const assignedIds = new Set(clients.filter((c) => c.dpc === name).map((c) => c.clientId));
      const progressIds = new Set<string>([...assignedIds, ...a.perClient.keys()]);
      const clientProgress: DpcClientProgress[] = [...progressIds]
        .map((id) => ({
          clientId: id,
          name: clientNames.get(id) || "Unknown client",
          jobs: a.perClient.get(id) || 0,
          assigned: assignedIds.has(id),
        }))
        .sort((x, y) => y.jobs - x.jobs || x.name.localeCompare(y.name));

      out.push({
        name: displayNames.get(name),
        email: emailLookup.get(name) || null,
        score: clientsAssigned > 0 ? round1((clientsAt15 / clientsAssigned) * 100) : 0,
        jobs: a.total,
        clientsAt15,
        clientsAssigned,
        vetThrough,
        lqaRate,
        standing: { met: missed.length === 0, missed },
        book: bookFor(clients, "dpc", name),
        clientProgress,
      });
    }
    return out.sort((a, b) => b.jobs - a.jobs);
  }

  // Score = jobs vetted this window / 240 standard.
  // In queue = a live (unbounded) snapshot of this VPC's book: discovered
  // jobs still at UNATTENDED, i.e. waiting for a vetting decision — not
  // scoped to the window, since backlog doesn't care when the job was
  // discovered, only whether it's still waiting. Keyed on Status rather than
  // a blank VettedBy: LQA skips, AI auto-submits etc. leave VettedBy blank
  // even though nothing is waiting on a VPC any more.
  private async computeVpc(
    clients: ClientLink[],
    clientIds: string[],
    since: Date,
    emailLookup: Map<string, string>,
    displayNames: DisplayNames,
  ): Promise<VpcPerformanceRow[]> {
    const assignedClientsByVpc = new Map<string, string[]>();
    clients.forEach((c) => {
      if (c.vpc) {
        const arr = assignedClientsByVpc.get(c.vpc) || [];
        arr.push(c.clientId);
        assignedClientsByVpc.set(c.vpc, arr);
      }
    });

    const [vettedRows, unattendedRows] = await Promise.all([
      ManualApplication.findAll({
        where: {
          client_id: { [Op.in]: clientIds },
          isDeleted: false,
          VettedBy: NOT_EMPTY,
          [Op.or]: [
            { VettedDate: { [Op.gte]: since } },
            { VettedDate: null, createdAt: { [Op.gte]: since } },
          ],
        },
        attributes: ["client_id", "VettedBy", "QualityScore"],
        raw: true,
      }),
      // Any application without an assigned/human VPC still gets vetted by
      // the AI vetting agent, which stamps VettedBy = 'AI Vetting Agent' —
      // so it naturally falls into its own row here rather than needing a
      // separate "unassigned" bucket.
      ManualApplication.findAll({
        where: {
          client_id: { [Op.in]: clientIds },
          isDeleted: false,
          DiscoveredBy: NOT_EMPTY,
          Status: "UNATTENDED",
        },
        attributes: ["client_id"],
        raw: true,
      }),
    ]);

    interface Agg {
      vetted: number;
      high: number;
      med: number;
      low: number;
    }
    const byVpc = new Map<string, Agg>();
    for (const row of vettedRows as any[]) {
      const name = displayNames.add(row.VettedBy);
      if (!name) continue;
      if (!byVpc.has(name)) byVpc.set(name, { vetted: 0, high: 0, med: 0, low: 0 });
      const a = byVpc.get(name)!;
      a.vetted++;
      const bucket = bucketQuality(row.QualityScore);
      if (bucket === "high") a.high++;
      else if (bucket === "med") a.med++;
      else a.low++;
    }

    const unattendedByClient = new Map<string, number>();
    for (const row of unattendedRows as any[]) {
      unattendedByClient.set(row.client_id, (unattendedByClient.get(row.client_id) || 0) + 1);
    }

    const names = new Set<string>([...assignedClientsByVpc.keys(), ...byVpc.keys()]);
    const out: VpcPerformanceRow[] = [];
    for (const name of names) {
      const a = byVpc.get(name) || { vetted: 0, high: 0, med: 0, low: 0 };
      const assignedIds = assignedClientsByVpc.get(name) || [];
      const queueEntries = assignedIds.reduce((sum, id) => sum + (unattendedByClient.get(id) || 0), 0);
      const missed: string[] = [];
      if (a.vetted < VPC_VETTED_STANDARD) missed.push(`vetted (${a.vetted} of ${VPC_VETTED_STANDARD})`);

      out.push({
        name: displayNames.get(name),
        email: emailLookup.get(name) || null,
        score: round1((a.vetted / VPC_SPC_STANDARD) * 100),
        vetted: a.vetted,
        queueEntries,
        queueScore: queueEntries <= QUEUE_HEALTHY_MAX ? 100 : round1((QUEUE_HEALTHY_MAX / queueEntries) * 100),
        high: a.high,
        med: a.med,
        low: a.low,
        standing: { met: missed.length === 0, missed },
        book: bookFor(clients, "vpc", name),
      });
    }
    return out.sort((a, b) => b.vetted - a.vetted);
  }

  // Score = jobs submitted this window / 240 standard.
  // In queue = live snapshot of this SPC's book: vetted in the last
  // SPC_QUEUE_LOOKBACK_DAYS, still VETTED or PENDING, and not yet submitted. Skipped/blocked/expired/declined jobs
  // have been dealt with even though no submitter is recorded, so they
  // don't count. Clients clear = assigned clients with none of those left.
  // Submitted counts every submission in the window, including ones for
  // clients deactivated since — the SPC still did that work.
  private async computeSpc(
    clients: ClientLink[],
    clientIds: string[],
    since: Date,
    emailLookup: Map<string, string>,
    displayNames: DisplayNames,
  ): Promise<SpcPerformanceRow[]> {
    const assignedClientsBySpc = new Map<string, string[]>();
    clients.forEach((c) => {
      if (c.spc) {
        const arr = assignedClientsBySpc.get(c.spc) || [];
        arr.push(c.clientId);
        assignedClientsBySpc.set(c.spc, arr);
      }
    });

    const queueSince = new Date(Date.now() - SPC_QUEUE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const [submittedRows, readyRows, nonSubmitActions] = await Promise.all([
      ManualApplication.findAll({
        where: {
          isDeleted: false,
          ApplicationSubmittedBy: NOT_EMPTY,
          [Op.or]: [
            { ApplicationSubmissionDate: { [Op.gte]: since } },
            { ApplicationSubmissionDate: null, createdAt: { [Op.gte]: since } },
          ],
        },
        attributes: ["client_id", "ApplicationSubmittedBy"],
        raw: true,
      }),
      ManualApplication.findAll({
        where: {
          client_id: { [Op.in]: clientIds },
          isDeleted: false,
          VettedBy: NOT_EMPTY,
          Status: { [Op.in]: ["VETTED", "PENDING"] },
          [Op.and]: [
            {
              [Op.or]: [
                { ApplicationSubmittedBy: null },
                { ApplicationSubmittedBy: "" },
                { ApplicationSubmittedBy: "N/A" },
              ],
            },
            {
              [Op.or]: [
                { VettedDate: { [Op.gte]: queueSince } },
                { VettedDate: null, createdAt: { [Op.gte]: queueSince } },
              ],
            },
          ],
        },
        attributes: ["client_id"],
        raw: true,
      }),
      this.loadSpcNonSubmitActions(since),
    ]);

    const bySpc = new Map<string, number>();
    for (const row of submittedRows as any[]) {
      const name = displayNames.add(row.ApplicationSubmittedBy);
      if (!name) continue;
      bySpc.set(name, (bySpc.get(name) || 0) + 1);
    }

    const readyByClient = new Map<string, number>();
    for (const row of readyRows as any[]) {
      readyByClient.set(row.client_id, (readyByClient.get(row.client_id) || 0) + 1);
    }

    const actionsBySpc = new Map<string, Omit<SpcHandledBreakdown, "submitted">>();
    for (const row of nonSubmitActions) {
      const name = displayNames.add(row.who);
      if (!name) continue;
      const a = actionsBySpc.get(name) || { blocked: 0, pending: 0, expired: 0, skipped: 0 };
      const key = row.status.toLowerCase() as keyof typeof a;
      a[key] += Number(row.n) || 0;
      actionsBySpc.set(name, a);
    }

    // Anyone who only blocked/skipped/etc. in the window isn't necessarily an
    // SPC (VPCs use the same endpoint), so only assigned or submitting
    // names get a row.
    const names = new Set<string>([...assignedClientsBySpc.keys(), ...bySpc.keys()]);
    const out: SpcPerformanceRow[] = [];
    for (const name of names) {
      const submitted = bySpc.get(name) || 0;
      const other = actionsBySpc.get(name) || { blocked: 0, pending: 0, expired: 0, skipped: 0 };
      const handledBreakdown: SpcHandledBreakdown = { submitted, ...other };
      const assignedIds = assignedClientsBySpc.get(name) || [];
      const queueEntries = assignedIds.reduce((sum, id) => sum + (readyByClient.get(id) || 0), 0);
      const clientsClear = assignedIds.filter((id) => (readyByClient.get(id) || 0) === 0).length;
      const missed: string[] = [];
      if (submitted < SPC_SUBMITTED_STANDARD) missed.push(`submitted (${submitted} of ${SPC_SUBMITTED_STANDARD})`);

      out.push({
        name: displayNames.get(name),
        email: emailLookup.get(name) || null,
        score: round1((submitted / VPC_SPC_STANDARD) * 100),
        submitted,
        queueEntries,
        queueScore: queueEntries <= QUEUE_HEALTHY_MAX ? 100 : round1((QUEUE_HEALTHY_MAX / queueEntries) * 100),
        clientsClear,
        clientsAssigned: assignedIds.length,
        handled: submitted + other.blocked + other.pending + other.expired + other.skipped,
        handledBreakdown,
        standing: { met: missed.length === 0, missed },
        book: bookFor(clients, "spc", name),
      });
    }
    return out.sort((a, b) => b.submitted - a.submitted);
  }

  // Non-submit decisions (Blocked / Pending / Expired / Skipped) leave no
  // actor on the manual_applications row, but every status change goes
  // through POST .../applications/update-status and audit_logs records the
  // caller and request body. One count per (person, status, application).
  // LQA skips are the vetting step (credited to the VPC via VettedBy), so
  // they're excluded here.
  private async loadSpcNonSubmitActions(since: Date): Promise<{ who: string; status: string; n: string }[]> {
    try {
      return (await getSequelize().query(
        `SELECT trim("userFullName") AS who,
                upper("dataEntry"->'body'->>'status') AS status,
                count(DISTINCT "dataEntry"->'body'->>'applicationId') AS n
           FROM audit_logs
          WHERE "createdAt" >= :since
            AND method = 'POST'
            AND url LIKE '%/applications/update-status%'
            AND "dataEntry"->>'statusCode' = '200'
            AND upper("dataEntry"->'body'->>'status') IN ('BLOCKED', 'PENDING', 'EXPIRED', 'SKIPPED')
            AND upper(coalesce("dataEntry"->'body'->>'qualityScore', '')) <> 'LQA'
            AND coalesce(trim("userFullName"), '') <> ''
          GROUP BY 1, 2`,
        { replacements: { since }, type: QueryTypes.SELECT },
      )) as { who: string; status: string; n: string }[];
    } catch (err) {
      // Handled is supplementary — never fail the whole screen over it.
      logger.warn(`audit_logs lookup for SPC actions failed: ${(err as Error).message}`);
      return [];
    }
  }
}

export const placementPerformanceService = new PlacementPerformanceService();
