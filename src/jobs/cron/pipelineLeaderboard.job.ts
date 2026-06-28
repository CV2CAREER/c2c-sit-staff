// import cron from "node-cron";
// import { Op } from "sequelize";
// import { ManualApplication } from "../../models/v1/manual-application.model";
// import { Credentials } from "../../models/v1/credentials.model";
// import { User } from "../../models/v1/user.model";
// import { getServiceLogger } from "../../utils/createLogger";
// import { SlackService } from "../../services/slack.service";
// import { getEnvironmentFromHost, getSlackIdOrName } from "../../utils/slack-helpers";
// import {
//   SlackChannel,
//   SlackEventType,
//   SlackNode,
//   SlackProvider,
//   SlackSeverity,
// } from "../../utils/enum";

// const logger = getServiceLogger("pipeline-leaderboard-job");

// // ─── Date helpers ─────────────────────────────────────────────────────────────

// function getYesterdayRange(): { start: Date; end: Date } {
//   const now = new Date();
//   const start = new Date(now);
//   start.setDate(start.getDate() - 1);
//   start.setHours(0, 0, 0, 0);
//   const end = new Date(now);
//   end.setHours(0, 0, 0, 0);
//   return { start, end };
// }

// function getYesterdayLabel(): string {
//   const d = new Date();
//   d.setDate(d.getDate() - 1);
//   return d.toLocaleDateString("en-GB", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//     timeZone: "Africa/Lagos",
//   });
// }

// // ─── Types ────────────────────────────────────────────────────────────────────

// interface ClientInfo {
//   clientId: string;
//   clientName: string;
//   dpcName: string | null;
//   dpcEmail: string | null;
//   vpcName: string | null;
//   vpcEmail: string | null;
//   spcName: string | null;
//   spcEmail: string | null;
// }

// interface QualityCount {
//   count: number;
//   high: number;
//   med: number;
//   low: number;
// }

// interface PCEntry {
//   pcName: string;
//   pcEmail: string | null;
//   total: number;
//   high: number;
//   med: number;
//   low: number;
//   // clientId → stats
//   clients: Map<string, { clientName: string } & QualityCount>;
// }

// // ─── Fetch active clients from Credentials + User join ────────────────────────

// async function fetchAllActiveClients(): Promise<ClientInfo[]> {
//   const credentials = await Credentials.findAll({
//     where: { Active: true, deletedAt: null },
//     attributes: [
//       "clientId",
//       "AssignedPCName",
//       "AssignedPCEmail",
//       "AssignedVetName",
//       "AssignedVetEmail",
//       "AssignedCompletedName",
//       "AssignedCompletedEmail",
//     ],
//     include: [
//       {
//         model: User,
//         as: "client",
//         attributes: ["id", "firstName", "lastName", "email"],
//         required: false,
//       },
//     ],
//   });

//   return credentials.map((c) => {
//     const cred = c as any;
//     const user = cred.client;
//     const fullName = user
//       ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email
//       : `Client ${cred.clientId}`;
//     return {
//       clientId: cred.clientId,
//       clientName: fullName,
//       dpcName: cred.AssignedPCName || null,
//       dpcEmail: cred.AssignedPCEmail || null,
//       vpcName: cred.AssignedVetName || null,
//       vpcEmail: cred.AssignedVetEmail || null,
//       spcName: cred.AssignedCompletedName || null,
//       spcEmail: cred.AssignedCompletedEmail || null,
//     };
//   });
// }

// // ─── Quality score bucketing ──────────────────────────────────────────────────

// function bucketQuality(score: string | null | undefined): "high" | "med" | "low" {
//   const s = (score || "").toUpperCase().trim();
//   if (s === "H" || s === "HQA" || s === "HIGH") return "high";
//   if (s === "M" || s === "MQA" || s === "MEDIUM" || s === "MED") return "med";
//   return "low";
// }

// // ─── Fetch ManualApplication rows for yesterday ───────────────────────────────

// async function fetchManualAppsYesterday(
//   clientIds: string[],
//   start: Date,
//   end: Date
// ): Promise<Array<{
//   client_id: string;
//   DiscoveredBy: string | null;
//   VettedBy: string | null;
//   ApplicationSubmittedBy: string | null;
//   QualityScore: string | null;
// }>> {
//   const rows = await ManualApplication.findAll({
//     where: {
//       client_id: { [Op.in]: clientIds },
//       isDeleted: false,
//       [Op.or]: [
//         { DiscoveryDate: { [Op.gte]: start, [Op.lt]: end } },
//         { VettedDate:    { [Op.gte]: start, [Op.lt]: end } },
//         { ApplicationSubmissionDate: { [Op.gte]: start, [Op.lt]: end } },
//       ],
//     },
//     attributes: [
//       "client_id",
//       "DiscoveredBy",
//       "VettedBy",
//       "ApplicationSubmittedBy",
//       "QualityScore",
//       "DiscoveryDate",
//       "VettedDate",
//       "ApplicationSubmissionDate",
//     ],
//     raw: true,
//   });

//   return rows as any[];
// }

// // ─── Aggregate helpers ────────────────────────────────────────────────────────

// /**
//  * Groups rows by the value of `getKey(row)` and builds a PCEntry map.
//  * Only rows where getKey returns a non-empty string are counted.
//  * countQuality controls whether QualityScore is bucketed (vetting only).
//  */
// function aggregateByPCField(
//   rows: Array<{
//     client_id: string;
//     DiscoveredBy: string | null;
//     VettedBy: string | null;
//     ApplicationSubmittedBy: string | null;
//     QualityScore: string | null;
//   }>,
//   getKey: (row: typeof rows[number]) => string | null | undefined,
//   clientMap: Map<string, ClientInfo>,
//   countQuality: boolean
// ): PCEntry[] {
//   const pcMap = new Map<string, PCEntry>();

//   for (const row of rows) {
//     const pcName = (getKey(row) || "").trim();
//     if (!pcName) continue;

//     if (!pcMap.has(pcName)) {
//       pcMap.set(pcName, {
//         pcName,
//         pcEmail: null, // resolved later via Credentials
//         total: 0,
//         high: 0,
//         med: 0,
//         low: 0,
//         clients: new Map(),
//       });
//     }

//     const entry = pcMap.get(pcName)!;
//     entry.total++;

//     const bucket = countQuality ? bucketQuality(row.QualityScore) : "low";
//     if (countQuality) {
//       if (bucket === "high") entry.high++;
//       else if (bucket === "med") entry.med++;
//       else entry.low++;
//     }

//     const clientId = row.client_id;
//     const clientName = clientMap.get(clientId)?.clientName ?? `Client ${clientId}`;

//     if (!entry.clients.has(clientId)) {
//       entry.clients.set(clientId, { clientName, count: 0, high: 0, med: 0, low: 0 });
//     }

//     const clientEntry = entry.clients.get(clientId)!;
//     clientEntry.count++;
//     if (countQuality) {
//       if (bucket === "high") clientEntry.high++;
//       else if (bucket === "med") clientEntry.med++;
//       else clientEntry.low++;
//     }
//   }

//   // Sort PCs biggest → smallest
//   return [...pcMap.values()].sort((a, b) => b.total - a.total);
// }

// // ─── Resolve PC email from Credentials (to tag on Slack) ─────────────────────

// /**
//  * Build a name→email lookup from active Credentials so we can resolve
//  * the free-text DiscoveredBy / VettedBy / ApplicationSubmittedBy names
//  * to an email for Slack tagging.
//  */
// async function buildPCEmailLookup(): Promise<Map<string, string>> {
//   const creds = await Credentials.findAll({
//     where: { Active: true, deletedAt: null },
//     attributes: [
//       "AssignedPCName",    "AssignedPCEmail",
//       "AssignedVetName",   "AssignedVetEmail",
//       "AssignedCompletedName", "AssignedCompletedEmail",
//     ],
//     raw: true,
//   });

//   const lookup = new Map<string, string>();

//   for (const c of creds as any[]) {
//     if (c.AssignedPCName && c.AssignedPCEmail)
//       lookup.set(c.AssignedPCName.trim(), c.AssignedPCEmail.trim());
//     if (c.AssignedVetName && c.AssignedVetEmail)
//       lookup.set(c.AssignedVetName.trim(), c.AssignedVetEmail.trim());
//     if (c.AssignedCompletedName && c.AssignedCompletedEmail)
//       lookup.set(c.AssignedCompletedName.trim(), c.AssignedCompletedEmail.trim());
//   }

//   return lookup;
// }

// // ─── Slack tag helper ─────────────────────────────────────────────────────────

// async function tagPC(name: string, emailLookup: Map<string, string>): Promise<string> {
//   const email = emailLookup.get(name);
//   if (email) return getSlackIdOrName(email);
//   return name;
// }

// // ─── Section builders ─────────────────────────────────────────────────────────

// async function buildDiscoverySection(
//   entries: PCEntry[],
//   emailLookup: Map<string, string>
// ): Promise<string> {
//   const lines: string[] = [
//     "─────────────────────────────────────────────────",
//     "*:mag: DISCOVERY TEAM — Ranked Biggest to Smallest*",
//     "─────────────────────────────────────────────────",
//   ];

//   if (entries.length === 0) {
//     lines.push("_No discovery activity yesterday._");
//     lines.push("");
//     return lines.join("\n");
//   }

//   for (let i = 0; i < entries.length; i++) {
//     const pc = entries[i];
//     const tag = await tagPC(pc.pcName, emailLookup);
//     lines.push(`*${i + 1}.* ${tag} — *${pc.total}* jobs discovered`);

//     const sorted = [...pc.clients.values()].sort((a, b) => b.count - a.count);
//     for (const c of sorted) {
//       lines.push(`   • *${c.clientName}:* ${c.count}`);
//     }
//   }

//   lines.push("");
//   return lines.join("\n");
// }

// async function buildVettingSection(
//   entries: PCEntry[],
//   emailLookup: Map<string, string>
// ): Promise<string> {
//   const lines: string[] = [
//     "─────────────────────────────────────────────────",
//     "*:white_check_mark: VETTING TEAM — Ranked Biggest to Smallest*",
//     "─────────────────────────────────────────────────",
//   ];

//   if (entries.length === 0) {
//     lines.push("_No vetting activity yesterday._");
//     lines.push("");
//     return lines.join("\n");
//   }

//   for (let i = 0; i < entries.length; i++) {
//     const pc = entries[i];
//     const tag = await tagPC(pc.pcName, emailLookup);
//     lines.push(
//       `*${i + 1}.* ${tag} — *${pc.total}* jobs vetted _(${pc.high}H / ${pc.med}M / ${pc.low}L)_`
//     );

//     const sorted = [...pc.clients.values()].sort((a, b) => b.count - a.count);
//     for (const c of sorted) {
//       lines.push(
//         `   • *${c.clientName}:* ${c.count}  _(H=${c.high} M=${c.med} L=${c.low})_`
//       );
//     }
//   }

//   lines.push("");
//   return lines.join("\n");
// }

// async function buildSubmissionSection(
//   entries: PCEntry[],
//   emailLookup: Map<string, string>
// ): Promise<string> {
//   const lines: string[] = [
//     "─────────────────────────────────────────────────",
//     "*:inbox_tray: SUBMISSION TEAM — Ranked Biggest to Smallest*",
//     "─────────────────────────────────────────────────",
//   ];

//   if (entries.length === 0) {
//     lines.push("_No submission activity yesterday._");
//     lines.push("");
//     return lines.join("\n");
//   }

//   for (let i = 0; i < entries.length; i++) {
//     const pc = entries[i];
//     const tag = await tagPC(pc.pcName, emailLookup);
//     lines.push(`*${i + 1}.* ${tag} — *${pc.total}* applications submitted`);

//     const sorted = [...pc.clients.values()].sort((a, b) => b.count - a.count);
//     for (const c of sorted) {
//       lines.push(`   • *${c.clientName}:* ${c.count}`);
//     }
//   }

//   lines.push("");
//   return lines.join("\n");
// }

// async function buildMissingPCSection(
//   clients: ClientInfo[],
//   emailLookup: Map<string, string>
// ): Promise<string> {
//   const lines: string[] = [
//     "─────────────────────────────────────────────────",
//     "*:rotating_light: CLIENTS MISSING PC ASSIGNMENT*",
//     "─────────────────────────────────────────────────",
//   ];

//   // Only flag clients missing at least one PC
//   const flagged = [...clients]
//     .filter((c) => !c.dpcName || !c.vpcName || !c.spcName)
//     .sort((a, b) => a.clientName.localeCompare(b.clientName));

//   if (flagged.length === 0) {
//     lines.push("_✅ All active clients have full PC assignments._");
//     lines.push("");
//     return lines.join("\n");
//   }

//   for (const c of flagged) {
//     lines.push(`\n:rotating_light: *${c.clientName}*`);

//     // DPC line
//     if (c.dpcName) {
//       const tag = await tagPC(c.dpcName, emailLookup);
//       lines.push(`   *DPC:* ${tag}`);
//     } else {
//       lines.push(`   *DPC:* _unassigned_`);
//     }

//     // VPC line
//     if (c.vpcName) {
//       const tag = await tagPC(c.vpcName, emailLookup);
//       lines.push(`   *VPC:* ${tag}`);
//     } else {
//       lines.push(`   *VPC:* _unassigned_`);
//     }

//     // SPC line
//     if (c.spcName) {
//       const tag = await tagPC(c.spcName, emailLookup);
//       lines.push(`   *SPC:* ${tag}`);
//     } else {
//       lines.push(`   *SPC:* _unassigned_`);
//     }
//   }

//   lines.push("");
//   return lines.join("\n");
// }

// // ─── Main job logic ───────────────────────────────────────────────────────────

// export async function runPipelineLeaderboardJob() {
//   logger.info("🏆 Running Pipeline Performance Leaderboard job...");

//   const { start, end } = getYesterdayRange();

//   const [clients, emailLookup] = await Promise.all([
//     fetchAllActiveClients(),
//     buildPCEmailLookup(),
//   ]);

//   if (clients.length === 0) {
//     logger.info("No active clients found, skipping leaderboard.");
//     return;
//   }

//   const clientIds = clients.map((c) => c.clientId);
//   const clientMap = new Map(clients.map((c) => [c.clientId, c]));

//   // All ManualApplication rows for yesterday — one query, split by field
//   const rows = await fetchManualAppsYesterday(clientIds, start, end);

//   // Split into per-action rows by date field that falls in yesterday's window
//   const discoveryRows = rows.filter(
//     (r) => {
//       // DiscoveryDate in window
//       const d = (r as any).DiscoveryDate;
//       return d && new Date(d) >= start && new Date(d) < end;
//     }
//   );
//   const vettingRows = rows.filter((r) => {
//     const d = (r as any).VettedDate;
//     return d && new Date(d) >= start && new Date(d) < end;
//   });
//   const submissionRows = rows.filter((r) => {
//     const d = (r as any).ApplicationSubmissionDate;
//     return d && new Date(d) >= start && new Date(d) < end;
//   });

//   const discoveryEntries = aggregateByPCField(
//     discoveryRows,
//     (r) => r.DiscoveredBy,
//     clientMap,
//     false
//   );
//   const vettingEntries = aggregateByPCField(
//     vettingRows,
//     (r) => r.VettedBy,
//     clientMap,
//     true
//   );
//   const submissionEntries = aggregateByPCField(
//     submissionRows,
//     (r) => r.ApplicationSubmittedBy,
//     clientMap,
//     false
//   );

//   const [discoverySection, vettingSection, submissionSection, missingSection] =
//     await Promise.all([
//       buildDiscoverySection(discoveryEntries, emailLookup),
//       buildVettingSection(vettingEntries, emailLookup),
//       buildSubmissionSection(submissionEntries, emailLookup),
//       buildMissingPCSection(clients, emailLookup),
//     ]);

//   const body = [
//     `:trophy: *Pipeline Performance Leaderboard — ${getYesterdayLabel()}*`,
//     "",
//     discoverySection,
//     vettingSection,
//     submissionSection,
//     missingSection,
//     `_Automated check · ${new Date().toISOString()}_`,
//   ].join("\n");

//   await SlackService.notify({
//     location: getEnvironmentFromHost(process.env.CLIENT_APP_DOMAIN),
//     host: process.env.CLIENT_APP_DOMAIN,
//     node: SlackNode.BACKGROUND_JOB,
//     provider: SlackProvider.SYSTEM,
//     severity: SlackSeverity.INFO,
//     trigger: "Pipeline Performance Leaderboard",
//     type: SlackEventType.SYSTEM_JOB,
//     channel: SlackChannel.VA,
//     teamMentions: 'CSM',
//     body,
//   });

//   logger.info("✅ Pipeline Performance Leaderboard sent successfully");
// }

// /**
//  * Cron job: runs daily at 9:05 AM WAT (08:05 UTC) — 5 min after the ops report.
//  */
// export function createPipelineLeaderboardJob() {
//   return cron.schedule(
//     "5 8 * * *",
//     async () => {
//       try {
//         await runPipelineLeaderboardJob();
//       } catch (error: any) {
//         logger.error(`❌ Pipeline Leaderboard job failed: ${error.message}`);
//       }
//     },
//     {
//       scheduled: false,
//       timezone: "Africa/Lagos",
//     } as any
//   );
// }