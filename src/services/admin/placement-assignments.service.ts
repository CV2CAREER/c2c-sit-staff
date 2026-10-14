import { Op } from "sequelize";
import { Credentials } from "../../models/v1/credentials.model";
import { User } from "../../models/v1/user.model";
import { CredentialsTour } from "../../models/v1/credentials-tour.model";
import { getServiceLogger } from "../../utils/createLogger";
import { calculateCampaignFields, parseDate } from "../../utils/campaign-calculator";
import { Role, SlackChannel, SlackEventType, SlackNode, SlackProvider, SlackSeverity } from "../../utils/enum";
import { getEnvironmentFromHost } from "../../utils/slack-helpers";
import { SlackService } from "../slack.service";

const logger = getServiceLogger("placement-assignments-service");

// Same in-flight population as the Pipeline card's "In-Flight" tile.
const FLIGHT_STATUSES = ["INFLIGHT"];

// Placement controllers = every user with the "assistant" role — same
// mapping the sidebar's Switch Persona list uses ("Placement Controller").
const CONTROLLER_ROLES = [Role.ASSISTANT];

export type AssignmentRoleKey = "dpc" | "vpc" | "spc" | "interimdpc" | "interimspc";

export interface AssignmentRoleValue {
  name: string | null;
  email: string | null;
  load: number;
}

export interface AssignmentRow {
  credId: string;
  clientId: string | null;
  name: string;
  dpc: AssignmentRoleValue;
  vpc: AssignmentRoleValue;
  spc: AssignmentRoleValue;
  interimdpc: AssignmentRoleValue;
  interimspc: AssignmentRoleValue;
  industry: string | null;
  subEnd: string | null;
  days: number | null;
  gaps: number;
  capitalized: string | null;
}

export interface AssignableController {
  name: string;
  email: string;
}

export interface PlacementAssignments {
  rows: AssignmentRow[];
  controllers: AssignableController[];
  generatedAt: string;
}

export interface AssignmentRowDetail {
  row: AssignmentRow;
  controllers: AssignableController[];
}

export interface BulkAssignParams {
  credIds: string[];
  role: AssignmentRoleKey;
  controllerName: string | null;
  controllerEmail: string | null;
  host?: string;
  triggeredBy?: string;
}

export interface BulkAssignResult {
  success: true;
  updated: number;
  clientNames: string[];
}

const ROLE_FIELD_MAP: Record<AssignmentRoleKey, { nameField: string; emailField: string; label: string }> = {
  dpc: { nameField: "AssignedPCName", emailField: "AssignedPCEmail", label: "DPC" },
  vpc: { nameField: "AssignedVetName", emailField: "AssignedVetEmail", label: "VPC" },
  spc: { nameField: "AssignedCompletedName", emailField: "AssignedCompletedEmail", label: "SPC" },
  interimdpc: { nameField: "InterimDPCName", emailField: "InterimDPCEmail", label: "Interim DPC" },
  interimspc: { nameField: "InterimSPCName", emailField: "InterimSPCEmail", label: "Interim SPC" },
};

const trimOrNull = (v: string | null | undefined): string | null => {
  const t = (v || "").trim();
  return t || null;
};

const norm = (v: string | null): string => (v || "").trim().toLowerCase();

class PlacementAssignmentsService {
  private async getEligibleControllers(): Promise<AssignableController[]> {
    const users = await User.findAll({
      where: {
        role: { [Op.in]: CONTROLLER_ROLES },
      },
      // "id" must be requested explicitly — Sequelize doesn't auto-include
      // the PK when `attributes` is restricted, and User's @AfterFind PII
      // decryption hook filters instances by `i?.id` before decrypting, so
      // omitting it silently skips decryption for every row (email ends up
      // empty, not just undecrypted).
      attributes: ["id", "firstName", "lastName", "email"],
      order: [["firstName", "ASC"], ["lastName", "ASC"]],
    });

    return users
      .map((u) => ({ name: `${u.firstName || ""} ${u.lastName || ""}`.trim(), email: u.email || "" }))
      .filter((c) => c.name && c.email);
  }

  // Shared by getAssignments (bulk, in-flight population) and
  // getAssignmentDetail's fallback (a single row outside that population,
  // e.g. an on-hold client opened from the Exceptions drawer).
  private resolveRow(row: Credentials) {
    const cred = row.seekExternalCredentials || {};
    const computed = calculateCampaignFields({
      SeekSubStartDate: row.SeekSubStartDate || undefined,
      createdAt: row.createdAt,
      SeekSubDurDays: (cred as any).SeekSubDurDays,
      GraceDuration: (cred as any).GraceDuration,
    });
    const campaignEnd = parseDate(computed.CampaignEnd);

    return {
      row,
      clientName: `${row.client?.firstName || ""} ${row.client?.lastName || ""}`.trim() || "Unknown client",
      dpc: trimOrNull(row.AssignedPCName),
      dpcEmail: trimOrNull(row.AssignedPCEmail),
      vpc: trimOrNull(row.AssignedVetName),
      vpcEmail: trimOrNull(row.AssignedVetEmail),
      spc: trimOrNull(row.AssignedCompletedName),
      spcEmail: trimOrNull(row.AssignedCompletedEmail),
      interimdpc: trimOrNull(row.InterimDPCName),
      interimdpcEmail: trimOrNull(row.InterimDPCEmail),
      interimspc: trimOrNull(row.InterimSPCName),
      interimspcEmail: trimOrNull(row.InterimSPCEmail),
      industry: trimOrNull(row.tour?.craft || null),
      campaignEnd,
      capitalized: trimOrNull(row.capitalized || null),
    };
  }

  private async getInFlightResolved() {
    const credentials = await Credentials.findAll({
      where: {
        isDeleted: false,
        capitalized: { [Op.in]: FLIGHT_STATUSES },
      },
      include: [
        { model: User, as: "client", attributes: ["id", "firstName", "lastName"], required: false },
        { model: CredentialsTour, as: "tour", attributes: ["craft"], required: false },
      ],
      order: [["createdAt", "ASC"]],
    });

    return credentials.map((row) => this.resolveRow(row));
  }

  private buildRow(
    r: ReturnType<PlacementAssignmentsService["resolveRow"]>,
    loads: Record<AssignmentRoleKey, Map<string, number>>,
  ): AssignmentRow {
    const now = new Date();
    const days = r.campaignEnd
      ? Math.round((r.campaignEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      : null;
    // Interim roles are optional backups, not part of the required trio, so
    // they don't count toward "gaps" the way a missing DPC/VPC/SPC does.
    const gaps = [r.dpc, r.vpc, r.spc].filter((v) => !v).length;

    return {
      credId: r.row.id,
      clientId: r.row.client?.id || null,
      name: r.clientName,
      dpc: { name: r.dpc, email: r.dpcEmail, load: r.dpc ? loads.dpc.get(norm(r.dpc)) || 0 : 0 },
      vpc: { name: r.vpc, email: r.vpcEmail, load: r.vpc ? loads.vpc.get(norm(r.vpc)) || 0 : 0 },
      spc: { name: r.spc, email: r.spcEmail, load: r.spc ? loads.spc.get(norm(r.spc)) || 0 : 0 },
      interimdpc: {
        name: r.interimdpc,
        email: r.interimdpcEmail,
        load: r.interimdpc ? loads.interimdpc.get(norm(r.interimdpc)) || 0 : 0,
      },
      interimspc: {
        name: r.interimspc,
        email: r.interimspcEmail,
        load: r.interimspc ? loads.interimspc.get(norm(r.interimspc)) || 0 : 0,
      },
      industry: r.industry,
      subEnd: computedEndDisplay(r),
      days,
      gaps,
      capitalized: r.capitalized,
    };
  }

  private loadMaps(
    resolved: ReturnType<PlacementAssignmentsService["resolveRow"]>[],
  ): Record<AssignmentRoleKey, Map<string, number>> {
    const loadOf = (key: "dpc" | "vpc" | "spc" | "interimdpc" | "interimspc") => {
      const m = new Map<string, number>();
      resolved.forEach((r) => {
        const v = r[key];
        if (!v) return;
        const k = norm(v);
        m.set(k, (m.get(k) || 0) + 1);
      });
      return m;
    };
    return {
      dpc: loadOf("dpc"),
      vpc: loadOf("vpc"),
      spc: loadOf("spc"),
      interimdpc: loadOf("interimdpc"),
      interimspc: loadOf("interimspc"),
    };
  }

  async getAssignments(): Promise<PlacementAssignments> {
    const [resolved, controllers] = await Promise.all([
      this.getInFlightResolved(),
      this.getEligibleControllers(),
    ]);

    const loads = this.loadMaps(resolved);
    const rows: AssignmentRow[] = resolved.map((r) => this.buildRow(r, loads));

    logger.info(`Placement assignments computed (rows=${rows.length}, controllers=${controllers.length})`);

    return { rows, controllers, generatedAt: new Date().toISOString() };
  }

  // Single-row lookup for the shared assignment drawer — works for clients
  // outside the in-flight population too (e.g. an on-hold client opened from
  // the Exceptions screen), while still counting load against the same
  // in-flight population so the numbers stay comparable.
  async getAssignmentDetail(credId: string): Promise<AssignmentRowDetail | null> {
    const [resolved, controllers] = await Promise.all([
      this.getInFlightResolved(),
      this.getEligibleControllers(),
    ]);
    const loads = this.loadMaps(resolved);

    const existing = resolved.find((r) => r.row.id === credId);
    if (existing) {
      return { row: this.buildRow(existing, loads), controllers };
    }

    const row = await Credentials.findOne({
      where: { id: credId, isDeleted: false },
      include: [
        { model: User, as: "client", attributes: ["id", "firstName", "lastName"], required: false },
        { model: CredentialsTour, as: "tour", attributes: ["craft"], required: false },
      ],
    });
    if (!row) return null;

    return { row: this.buildRow(this.resolveRow(row), loads), controllers };
  }

  // Bulk assign/unassign one role across many clients in one write, then a
  // single Slack message listing the affected client names — not one
  // notification per client, which is what looping the single-assign
  // endpoint from the frontend would otherwise produce.
  async bulkAssign(params: BulkAssignParams): Promise<BulkAssignResult> {
    const { credIds, role, controllerName, controllerEmail, host, triggeredBy } = params;
    const field = ROLE_FIELD_MAP[role];
    const isUnassign = !controllerEmail;

    const credentials = await Credentials.findAll({
      where: { id: { [Op.in]: credIds } },
      include: [{ model: User, as: "client", attributes: ["firstName", "lastName"], required: false }],
    });

    await Promise.all(
      credentials.map((c) =>
        c.update({
          [field.nameField]: isUnassign ? null : controllerName,
          [field.emailField]: isUnassign ? null : controllerEmail,
        } as any),
      ),
    );

    const clientNames = credentials.map(
      (c) => `${c.client?.firstName || ""} ${c.client?.lastName || ""}`.trim() || "Unknown client",
    );

    logger.info(
      `Bulk ${field.label} ${isUnassign ? "unassign" : "assign"} (${clientNames.length} clients)${isUnassign ? "" : ` -> ${controllerEmail}`}`,
    );

    if (clientNames.length > 0) {
      setImmediate(async () => {
        try {
          const message = isUnassign
            ? `Bulk ${field.label} unassignment.\n*Clients (${clientNames.length})*: ${clientNames.join(", ")}`
            : `Bulk ${field.label} assignment to ${controllerName}.\n*Clients (${clientNames.length})*: ${clientNames.join(", ")}`;

          await SlackService.notify({
            location: getEnvironmentFromHost(host || ""),
            host: host || "",
            node: SlackNode.HUMAN_RESOURCE,
            provider: SlackProvider.HUBSTAFF,
            severity: SlackSeverity.INFO,
            trigger: triggeredBy,
            type: SlackEventType.USER_TRIGGERED,
            channel: SlackChannel.VA,
            body: message,
          });
        } catch (err) {
          logger.error(`❌ Bulk assignment Slack notification failed: ${err}`);
        }
      });
    }

    return { success: true, updated: credentials.length, clientNames };
  }
}

// Formats the resolved CampaignEnd as DD-MM-YYYY (same convention as
// campaign-calculator.ts's formatDate), or null when it couldn't be computed.
function computedEndDisplay(r: { campaignEnd: Date | null }): string | null {
  if (!r.campaignEnd) return null;
  const d = String(r.campaignEnd.getUTCDate()).padStart(2, "0");
  const m = String(r.campaignEnd.getUTCMonth() + 1).padStart(2, "0");
  const y = r.campaignEnd.getUTCFullYear();
  return `${d}-${m}-${y}`;
}

export const placementAssignmentsService = new PlacementAssignmentsService();
