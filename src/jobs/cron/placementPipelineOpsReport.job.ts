// import cron from "node-cron";
// import { Op, fn, col, literal } from "sequelize";
// import { Application } from "../../models/v1/application.model";
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

// const logger = getServiceLogger("placement-pipeline-ops-report-job");

// // ─── Date helpers ────────────────────────────────────────────────────────────

// function getDaysAgoDate(days: number): Date {
//   const d = new Date();
//   d.setDate(d.getDate() - days);
//   d.setHours(0, 0, 0, 0);
//   return d;
// }

// function formatDate(date: Date): string {
//   return date.toLocaleDateString("en-GB", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//     timeZone: "Africa/Lagos",
//   });
// }

// function getTodayLabel(): string {
//   return new Date().toLocaleDateString("en-GB", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//     timeZone: "Africa/Lagos",
//   });
// }

// // ─── Types ────────────────────────────────────────────────────────────────────

// interface ClientRow {
//   clientId: string;
//   clientName: string;
//   clientEmail: string;
//   dpcName: string | null;
//   dpcEmail: string | null;
//   vpcName: string | null;
//   vpcEmail: string | null;
//   spcName: string | null;
//   spcEmail: string | null;
// }

// interface DiscoveryStats {
//   clientId: string;
//   count1d: number;
//   count5d: number;
//   unattended: number;
// }

// interface VettingStats {
//   clientId: string;
//   count1d: number;
//   count5d: number;
//   highQuality: number;
//   medQuality: number;
//   lowQuality: number;
//   pendingVet: number;
// }

// interface SubmissionStats {
//   clientId: string;
//   count1d: number;
//   count5d: number;
//   unattended: number;
//   sourceNA: number;
//   sourceJORA: number;
//   sourceADZUNA: number;
// }

// // ─── Data fetching ────────────────────────────────────────────────────────────

// async function fetchAllActiveClients(): Promise<ClientRow[]> {
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
//     // Prefer the User record as the source of truth for the client's display name
//     const fullName = user
//       ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email
//       : `Client ${cred.clientId}`;
//     return {
//       clientId: cred.clientId,
//       clientName: fullName,
//       clientEmail: user?.email || "N/A",
//       dpcName: cred.AssignedPCName || null,
//       dpcEmail: cred.AssignedPCEmail || null,
//       vpcName: cred.AssignedVetName || null,
//       vpcEmail: cred.AssignedVetEmail || null,
//       spcName: cred.AssignedCompletedName || null,
//       spcEmail: cred.AssignedCompletedEmail || null,
//     };
//   });
// }

// async function fetchDiscoveryStats(
//   clientIds: string[],
//   since1d: Date,
//   since5d: Date
// ): Promise<Map<string, DiscoveryStats>> {
//   // "Discovered" = any Application row created in window (the bot puts them in the pipeline)
//   // "Unattended" = Status = 'Discovered' or 'Pending' and older than now (not yet vetted)
//   const [apps1d, apps5d, unattended] = await Promise.all([
//     Application.findAll({
//       where: {
//         client_id: { [Op.in]: clientIds },
//         createdAt: { [Op.gte]: since1d },
//         isDeleted: false,
//       },
//       attributes: ["client_id"],
//       raw: true,
//     }),
//     Application.findAll({
//       where: {
//         client_id: { [Op.in]: clientIds },
//         createdAt: { [Op.gte]: since5d },
//         isDeleted: false,
//       },
//       attributes: ["client_id"],
//       raw: true,
//     }),
//     Application.findAll({
//       where: {
//         client_id: { [Op.in]: clientIds },
//         Status: { [Op.in]: ["Discovered", "Pending", "Unattended"] },
//         isDeleted: false,
//       },
//       attributes: ["client_id"],
//       raw: true,
//     }),
//   ]);

//   const map = new Map<string, DiscoveryStats>();

//   for (const id of clientIds) {
//     map.set(id, { clientId: id, count1d: 0, count5d: 0, unattended: 0 });
//   }

//   for (const row of apps1d) {
//     const entry = map.get((row as any).client_id);
//     if (entry) entry.count1d++;
//   }
//   for (const row of apps5d) {
//     const entry = map.get((row as any).client_id);
//     if (entry) entry.count5d++;
//   }
//   for (const row of unattended) {
//     const entry = map.get((row as any).client_id);
//     if (entry) entry.unattended++;
//   }

//   return map;
// }

// async function fetchVettingStats(
//   clientIds: string[],
//   since1d: Date,
//   since5d: Date
// ): Promise<Map<string, VettingStats>> {
//   const [vetted1d, vetted5d, pendingVet, manualVetted1d, manualVetted5d] =
//     await Promise.all([
//       Application.findAll({
//         where: {
//           client_id: { [Op.in]: clientIds },
//           Status: "Vetted",
//           updatedAt: { [Op.gte]: since1d },
//           isDeleted: false,
//         },
//         attributes: ["client_id", "MatchLevel"],
//         raw: true,
//       }),
//       Application.findAll({
//         where: {
//           client_id: { [Op.in]: clientIds },
//           Status: "Vetted",
//           updatedAt: { [Op.gte]: since5d },
//           isDeleted: false,
//         },
//         attributes: ["client_id", "MatchLevel"],
//         raw: true,
//       }),
//       Application.findAll({
//         where: {
//           client_id: { [Op.in]: clientIds },
//           Status: { [Op.in]: ["Discovered", "Pending", "Unattended"] },
//           isDeleted: false,
//         },
//         attributes: ["client_id"],
//         raw: true,
//       }),
//       ManualApplication.findAll({
//         where: {
//           client_id: { [Op.in]: clientIds },
//           VettedDate: { [Op.gte]: since1d },
//           isDeleted: false,
//         },
//         attributes: ["client_id", "QualityScore"],
//         raw: true,
//       }),
//       ManualApplication.findAll({
//         where: {
//           client_id: { [Op.in]: clientIds },
//           VettedDate: { [Op.gte]: since5d },
//           isDeleted: false,
//         },
//         attributes: ["client_id", "QualityScore"],
//         raw: true,
//       }),
//     ]);

//   const map = new Map<string, VettingStats>();
//   for (const id of clientIds) {
//     map.set(id, {
//       clientId: id,
//       count1d: 0,
//       count5d: 0,
//       highQuality: 0,
//       medQuality: 0,
//       lowQuality: 0,
//       pendingVet: 0,
//     });
//   }

//   const applyQuality = (
//     entry: VettingStats,
//     matchLevel: string | null | undefined
//   ) => {
//     const lvl = (matchLevel || "").toUpperCase();
//     if (lvl === "H" || lvl === "HIGH") entry.highQuality++;
//     else if (lvl === "M" || lvl === "MEDIUM" || lvl === "MED") entry.medQuality++;
//     else entry.lowQuality++;
//   };

//   for (const row of vetted1d) {
//     const entry = map.get((row as any).client_id);
//     if (entry) {
//       entry.count1d++;
//       applyQuality(entry, (row as any).MatchLevel);
//     }
//   }
//   for (const row of vetted5d) {
//     const entry = map.get((row as any).client_id);
//     if (entry) entry.count5d++;
//   }
//   for (const row of pendingVet) {
//     const entry = map.get((row as any).client_id);
//     if (entry) entry.pendingVet++;
//   }
//   for (const row of manualVetted1d) {
//     const entry = map.get((row as any).client_id);
//     if (entry) {
//       entry.count1d++;
//       applyQuality(entry, (row as any).QualityScore);
//     }
//   }
//   for (const row of manualVetted5d) {
//     const entry = map.get((row as any).client_id);
//     if (entry) entry.count5d++;
//   }

//   return map;
// }

// async function fetchSubmissionStats(
//   clientIds: string[],
//   since1d: Date,
//   since5d: Date
// ): Promise<Map<string, SubmissionStats>> {
//   const [apps1d, apps5d, unattended] = await Promise.all([
//     Application.findAll({
//       where: {
//         client_id: { [Op.in]: clientIds },
//         Status: "Applied",
//         updatedAt: { [Op.gte]: since1d },
//         isDeleted: false,
//       },
//       attributes: ["client_id", "Application_Source"],
//       raw: true,
//     }),
//     Application.findAll({
//       where: {
//         client_id: { [Op.in]: clientIds },
//         Status: "Applied",
//         updatedAt: { [Op.gte]: since5d },
//         isDeleted: false,
//       },
//       attributes: ["client_id", "Application_Source"],
//       raw: true,
//     }),
//     Application.findAll({
//       where: {
//         client_id: { [Op.in]: clientIds },
//         Status: "Vetted",
//         isDeleted: false,
//       },
//       attributes: ["client_id"],
//       raw: true,
//     }),
//   ]);

//   const map = new Map<string, SubmissionStats>();
//   for (const id of clientIds) {
//     map.set(id, {
//       clientId: id,
//       count1d: 0,
//       count5d: 0,
//       unattended: 0,
//       sourceNA: 0,
//       sourceJORA: 0,
//       sourceADZUNA: 0,
//     });
//   }

//   const applySource = (entry: SubmissionStats, src: string | undefined) => {
//     const s = (src || "").toUpperCase();
//     if (s.includes("JORA")) entry.sourceJORA++;
//     else if (s.includes("ADZUNA")) entry.sourceADZUNA++;
//     else entry.sourceNA++;
//   };

//   for (const row of apps1d) {
//     const entry = map.get((row as any).client_id);
//     if (entry) {
//       entry.count1d++;
//       applySource(entry, (row as any).Application_Source);
//     }
//   }
//   for (const row of apps5d) {
//     const entry = map.get((row as any).client_id);
//     if (entry) entry.count5d++;
//   }
//   for (const row of unattended) {
//     const entry = map.get((row as any).client_id);
//     if (entry) entry.unattended++;
//   }

//   return map;
// }

// // Backlog: jobs unattended >24h (discovered but not vetted)
// async function fetchUnattendedBacklog(): Promise<
//   Array<{ clientId: string; count: number; oldestDate: Date }>
// > {
//   const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
//   const rows = await Application.findAll({
//     where: {
//       Status: { [Op.in]: ["Discovered", "Pending", "Unattended"] },
//       createdAt: { [Op.lte]: cutoff },
//       isDeleted: false,
//     },
//     attributes: [
//       "client_id",
//       [fn("COUNT", col("id")), "count"],
//       [fn("MIN", col("createdAt")), "oldestDate"],
//     ],
//     group: ["client_id"],
//     order: [[literal('"count"'), "DESC"]],
//     raw: true,
//   });

//   return (rows as any[]).map((r) => ({
//     clientId: r.client_id,
//     count: parseInt(r.count, 10),
//     oldestDate: new Date(r.oldestDate),
//   }));
// }

// // Backlog: jobs vetted but not submitted >24h
// async function fetchVettedNotSubmittedBacklog(): Promise<
//   Array<{ clientId: string; count: number; oldestDate: Date }>
// > {
//   const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
//   const rows = await Application.findAll({
//     where: {
//       Status: "Vetted",
//       updatedAt: { [Op.lte]: cutoff },
//       isDeleted: false,
//     },
//     attributes: [
//       "client_id",
//       [fn("COUNT", col("id")), "count"],
//       [fn("MIN", col("updatedAt")), "oldestDate"],
//     ],
//     group: ["client_id"],
//     order: [[literal('"count"'), "DESC"]],
//     raw: true,
//   });

//   return (rows as any[]).map((r) => ({
//     clientId: r.client_id,
//     count: parseInt(r.count, 10),
//     oldestDate: new Date(r.oldestDate),
//   }));
// }

// // ─── Section builders ─────────────────────────────────────────────────────────

// async function buildDiscoverySection(
//   clients: ClientRow[],
//   discoveryMap: Map<string, DiscoveryStats>
// ): Promise<string> {
//   const lines: string[] = [
//     "─────────────────────────────────────────────────",
//     ":mag: DISCOVERY — Last 1 Day  /  Last 5 Days",
//     "─────────────────────────────────────────────────",
//   ];

//   // Clients with 0 discoveries in last 5d
//   const zeroClients = clients.filter(
//     (c) => (discoveryMap.get(c.clientId)?.count5d ?? 0) === 0
//   );

//   if (zeroClients.length > 0) {
//     lines.push(":x: Clients with 0 jobs discovered (last 5d):");

//     const unassigned = zeroClients.filter((c) => !c.dpcName && !c.dpcEmail);
//     const assignedInactive = zeroClients.filter((c) => c.dpcName || c.dpcEmail);

//     if (unassigned.length > 0) {
//       lines.push("Unassigned DPC:");
//       for (const c of unassigned) {
//         lines.push(`• ${c.clientName} — 0`);
//       }
//     }
//     if (assignedInactive.length > 0) {
//       lines.push("Assigned but inactive:");
//       for (const c of assignedInactive) {
//         lines.push(`• ${c.clientName} — 0`);
//       }
//     }
//     lines.push("");
//   }

//   // Group active clients by DPC
//   const activeClients = clients.filter(
//     (c) => (discoveryMap.get(c.clientId)?.count5d ?? 0) > 0
//   );

//   const dpcGroups = new Map<
//     string,
//     { dpcEmail: string | null; clients: ClientRow[] }
//   >();

//   for (const c of activeClients) {
//     const key = c.dpcName || "Unassigned";
//     if (!dpcGroups.has(key)) {
//       dpcGroups.set(key, { dpcEmail: c.dpcEmail, clients: [] });
//     }
//     dpcGroups.get(key)!.clients.push(c);
//   }

//   for (const [dpcName, group] of dpcGroups.entries()) {
//     const total1d = group.clients.reduce(
//       (s, c) => s + (discoveryMap.get(c.clientId)?.count1d ?? 0),
//       0
//     );
//     const total5d = group.clients.reduce(
//       (s, c) => s + (discoveryMap.get(c.clientId)?.count5d ?? 0),
//       0
//     );

//     const slackTag = group.dpcEmail
//       ? await getSlackIdOrName(group.dpcEmail)
//       : dpcName;

//     lines.push(
//       `:bust_in_silhouette: ${slackTag}; Discovered 1d: ${total1d} | 5d: ${total5d}`
//     );

//     const sorted = [...group.clients].sort(
//       (a, b) =>
//         (discoveryMap.get(b.clientId)?.count5d ?? 0) -
//         (discoveryMap.get(a.clientId)?.count5d ?? 0)
//     );

//     for (const c of sorted) {
//       const s = discoveryMap.get(c.clientId)!;
//       lines.push(
//         `  • ${c.clientName}: 1d: ${s.count1d} | 5d: ${s.count5d} | Currently Unattended: ${s.unattended}`
//       );
//     }

//     lines.push("");
//   }

//   return lines.join("\n");
// }

// async function buildVettingSection(
//   clients: ClientRow[],
//   vettingMap: Map<string, VettingStats>
// ): Promise<string> {
//   const lines: string[] = [
//     "─────────────────────────────────────────────────",
//     ":white_check_mark: VETTING — Last 1 Day  /  Last 5 Days",
//     "─────────────────────────────────────────────────",
//   ];

//   const zeroClients = clients.filter(
//     (c) => (vettingMap.get(c.clientId)?.count5d ?? 0) === 0
//   );

//   if (zeroClients.length > 0) {
//     lines.push(":x: Clients with 0 jobs vetted (last 5d):");

//     const unassigned = zeroClients.filter((c) => !c.vpcName && !c.vpcEmail);
//     const assignedInactive = zeroClients.filter((c) => c.vpcName || c.vpcEmail);

//     if (unassigned.length > 0) {
//       lines.push("Unassigned VPC:");
//       for (const c of unassigned) lines.push(`• ${c.clientName} — 0`);
//     }
//     if (assignedInactive.length > 0) {
//       lines.push("Assigned but inactive:");
//       for (const c of assignedInactive) lines.push(`• ${c.clientName} — 0`);
//     }
//     lines.push("");
//   }

//   const activeClients = clients.filter(
//     (c) => (vettingMap.get(c.clientId)?.count5d ?? 0) > 0
//   );

//   const vpcGroups = new Map<
//     string,
//     { vpcEmail: string | null; clients: ClientRow[] }
//   >();

//   for (const c of activeClients) {
//     const key = c.vpcName || "Unassigned";
//     if (!vpcGroups.has(key)) {
//       vpcGroups.set(key, { vpcEmail: c.vpcEmail, clients: [] });
//     }
//     vpcGroups.get(key)!.clients.push(c);
//   }

//   for (const [vpcName, group] of vpcGroups.entries()) {
//     const total1d = group.clients.reduce(
//       (s, c) => s + (vettingMap.get(c.clientId)?.count1d ?? 0),
//       0
//     );
//     const total5d = group.clients.reduce(
//       (s, c) => s + (vettingMap.get(c.clientId)?.count5d ?? 0),
//       0
//     );

//     const slackTag = group.vpcEmail
//       ? await getSlackIdOrName(group.vpcEmail)
//       : vpcName;

//     lines.push(
//       `:bust_in_silhouette: ${slackTag}; Vetted 1d: ${total1d} | 5d: ${total5d}`
//     );

//     const sorted = [...group.clients].sort(
//       (a, b) =>
//         (vettingMap.get(b.clientId)?.count5d ?? 0) -
//         (vettingMap.get(a.clientId)?.count5d ?? 0)
//     );

//     for (const c of sorted) {
//       const s = vettingMap.get(c.clientId)!;
//       lines.push(
//         `  • ${c.clientName}: 1d: ${s.count1d} | 5d: ${s.count5d} | Quality: H=${s.highQuality} M=${s.medQuality} L=${s.lowQuality} | Pending vet: ${s.pendingVet}`
//       );
//     }

//     lines.push("");
//   }

//   return lines.join("\n");
// }

// async function buildSubmissionSection(
//   clients: ClientRow[],
//   submissionMap: Map<string, SubmissionStats>
// ): Promise<string> {
//   const lines: string[] = [
//     "─────────────────────────────────────────────────",
//     ":inbox_tray: SUBMISSION — Last 1 Day  /  Last 5 Days",
//     "─────────────────────────────────────────────────",
//   ];

//   const zeroClients = clients.filter(
//     (c) => (submissionMap.get(c.clientId)?.count5d ?? 0) === 0
//   );

//   if (zeroClients.length > 0) {
//     lines.push(":x: Clients with 0 applications (last 5d):");

//     const unassigned = zeroClients.filter((c) => !c.spcName && !c.spcEmail);
//     const assignedInactive = zeroClients.filter((c) => c.spcName || c.spcEmail);

//     if (unassigned.length > 0) {
//       lines.push("Unassigned SPC:");
//       for (const c of unassigned) lines.push(`• ${c.clientName} — 0`);
//     }
//     if (assignedInactive.length > 0) {
//       lines.push("Assigned but inactive:");
//       for (const c of assignedInactive) lines.push(`• ${c.clientName} — 0`);
//     }
//     lines.push("");
//   }

//   const activeClients = clients.filter(
//     (c) => (submissionMap.get(c.clientId)?.count5d ?? 0) > 0
//   );

//   const spcGroups = new Map<
//     string,
//     { spcEmail: string | null; clients: ClientRow[] }
//   >();

//   for (const c of activeClients) {
//     const key = c.spcName || "Unassigned";
//     if (!spcGroups.has(key)) {
//       spcGroups.set(key, { spcEmail: c.spcEmail, clients: [] });
//     }
//     spcGroups.get(key)!.clients.push(c);
//   }

//   for (const [spcName, group] of spcGroups.entries()) {
//     const total1d = group.clients.reduce(
//       (s, c) => s + (submissionMap.get(c.clientId)?.count1d ?? 0),
//       0
//     );
//     const total5d = group.clients.reduce(
//       (s, c) => s + (submissionMap.get(c.clientId)?.count5d ?? 0),
//       0
//     );

//     const slackTag = group.spcEmail
//       ? await getSlackIdOrName(group.spcEmail)
//       : spcName;

//     lines.push(
//       `:bust_in_silhouette: ${slackTag}; Total Applications 1d: ${total1d} | 5d: ${total5d}`
//     );

//     const sorted = [...group.clients].sort(
//       (a, b) =>
//         (submissionMap.get(b.clientId)?.count5d ?? 0) -
//         (submissionMap.get(a.clientId)?.count5d ?? 0)
//     );

//     for (const c of sorted) {
//       const s = submissionMap.get(c.clientId)!;
//       lines.push(
//         `  • ${c.clientName}: Applied 1d: ${s.count1d} | 5d: ${s.count5d} | Unattended: ${s.unattended} | Jobsites: N/A(${s.sourceNA}), JORA(${s.sourceJORA}), ADZUNA(${s.sourceADZUNA})`
//       );
//     }

//     lines.push("");
//   }

//   return lines.join("\n");
// }

// async function buildBacklogSection(
//   clients: ClientRow[],
//   unattendedBacklog: Array<{ clientId: string; count: number; oldestDate: Date }>,
//   vettedNotSubmitted: Array<{ clientId: string; count: number; oldestDate: Date }>
// ): Promise<string> {
//   const clientMap = new Map(clients.map((c) => [c.clientId, c]));

//   const lines: string[] = [
//     "─────────────────────────────────────────────────",
//     ":warning: BACKLOG SNAPSHOT (right now)",
//     "─────────────────────────────────────────────────",
//   ];

//   const totalUnattended = unattendedBacklog.reduce((s, r) => s + r.count, 0);
//   const unattendedClientCount = unattendedBacklog.length;

//   lines.push(
//     `• Unattended >24h: ${totalUnattended} jobs across ${unattendedClientCount} clients`
//   );

//   const topUnattended = unattendedBacklog.slice(0, 5);
//   for (const row of topUnattended) {
//     const c = clientMap.get(row.clientId);
//     const clientName = c?.clientName ?? `Client ${row.clientId}`;
//     const dpcTag = c?.dpcEmail
//       ? await getSlackIdOrName(c.dpcEmail)
//       : c?.dpcName ?? "unassigned";
//     const vpcTag = c?.vpcEmail
//       ? await getSlackIdOrName(c.vpcEmail)
//       : c?.vpcName ?? "unassigned";
//     lines.push(
//       `  - ${clientName} — ${row.count} stuck — oldest: ${formatDate(row.oldestDate)} — DPC ${dpcTag} / VPC ${vpcTag}`
//     );
//   }

//   lines.push("");

//   const totalVettedNotSub = vettedNotSubmitted.reduce((s, r) => s + r.count, 0);
//   const vettedNotSubClientCount = vettedNotSubmitted.length;

//   lines.push(
//     `• Vetted but not Submitted >24h: ${totalVettedNotSub} jobs across ${vettedNotSubClientCount} clients`
//   );

//   const topVettedNotSub = vettedNotSubmitted.slice(0, 5);
//   for (const row of topVettedNotSub) {
//     const c = clientMap.get(row.clientId);
//     const clientName = c?.clientName ?? `Client ${row.clientId}`;
//     const vpcTag = c?.vpcEmail
//       ? await getSlackIdOrName(c.vpcEmail)
//       : c?.vpcName ?? "unassigned";
//     const spcTag = c?.spcEmail
//       ? await getSlackIdOrName(c.spcEmail)
//       : c?.spcName ?? "unassigned";
//     lines.push(
//       `  - ${clientName} — ${row.count} stuck — oldest: ${formatDate(row.oldestDate)} — VPC ${vpcTag} / SPC ${spcTag}`
//     );
//   }

//   lines.push("");
//   return lines.join("\n");
// }

// async function buildMissingPCSection(clients: ClientRow[]): Promise<string> {
//   const lines: string[] = [
//     "─────────────────────────────────────────────────",
//     ":rotating_light: CLIENTS MISSING PC ASSIGNMENT (with active pipeline)",
//     "─────────────────────────────────────────────────",
//   ];

//   const flagged = clients.filter(
//     (c) => !c.dpcName || !c.vpcName || !c.spcName
//   );

//   if (flagged.length === 0) {
//     lines.push("✅ All active clients have full PC assignments.");
//     return lines.join("\n");
//   }

//   for (const c of flagged) {
//     const missing: string[] = [];
//     if (!c.dpcName) missing.push("DPC");
//     if (!c.vpcName) missing.push("VPC");
//     if (!c.spcName) missing.push("SPC");
//     lines.push(`• ${c.clientName} — missing: ${missing.join(", ")}`);
//   }

//   return lines.join("\n");
// }

// // ─── Main job logic ───────────────────────────────────────────────────────────

// export async function runPlacPipelineOpsReportJob() {
//   logger.info("📊 Running PlacPipeline Ops Report job...");

//   const since1d = getDaysAgoDate(1);
//   const since5d = getDaysAgoDate(5);

//   const clients = await fetchAllActiveClients();

//   if (clients.length === 0) {
//     logger.info("No active clients found, skipping ops report.");
//     return;
//   }

//   const clientIds = clients.map((c) => c.clientId);

//   const [discoveryMap, vettingMap, submissionMap, unattendedBacklog, vettedNotSub] =
//     await Promise.all([
//       fetchDiscoveryStats(clientIds, since1d, since5d),
//       fetchVettingStats(clientIds, since1d, since5d),
//       fetchSubmissionStats(clientIds, since1d, since5d),
//       fetchUnattendedBacklog(),
//       fetchVettedNotSubmittedBacklog(),
//     ]);

//   const [discoverySection, vettingSection, submissionSection, backlogSection, missingSection] =
//     await Promise.all([
//       buildDiscoverySection(clients, discoveryMap),
//       buildVettingSection(clients, vettingMap),
//       buildSubmissionSection(clients, submissionMap),
//       buildBacklogSection(clients, unattendedBacklog, vettedNotSub),
//       buildMissingPCSection(clients),
//     ]);

//   const body = [
//     `:bar_chart: *PlacPipeline Ops Report — ${getTodayLabel()} (Africa/Lagos)*`,
//     "",
//     discoverySection,
//     "",
//     vettingSection,
//     "",
//     submissionSection,
//     "",
//     backlogSection,
//     "",
//     missingSection,
//     "",
//     `_Automated check · ${new Date().toISOString()}_`,
//   ].join("\n");

//   await SlackService.notify({
//     location: getEnvironmentFromHost(process.env.CLIENT_APP_DOMAIN),
//     host: process.env.CLIENT_APP_DOMAIN,
//     node: SlackNode.BACKGROUND_JOB,
//     provider: SlackProvider.SYSTEM,
//     severity: SlackSeverity.INFO,
//     trigger: "PlacPipeline Ops Report",
//     type: SlackEventType.SYSTEM_JOB,
//     channel: SlackChannel.VA,
//     body,
//   });

//   logger.info("✅ PlacPipeline Ops Report sent successfully");
// }

// /**
//  * Cron job: runs daily at 9:00 AM WAT (08:00 UTC).
//  */
// export function createPlacPipelineOpsReportJob() {
//   return cron.schedule(
//     "0 8 * * *",
//     async () => {
//       try {
//         await runPlacPipelineOpsReportJob();
//       } catch (error: any) {
//         logger.error(`❌ PlacPipeline Ops Report job failed: ${error.message}`);
//       }
//     },
//     {
//       scheduled: false,
//       timezone: "Africa/Lagos",
//     } as any
//   );
// }