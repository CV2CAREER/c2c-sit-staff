import cron from 'node-cron';
import { Op, fn, col, literal } from 'sequelize';
import { Application } from '../../models/v1/application.model';
import { ManualApplication } from '../../models/v1/manual-application.model';
import { Credentials } from '../../models/v1/credentials.model';
import { User } from '../../models/v1/user.model';
import { getServiceLogger } from '../../utils/createLogger';
import { SlackService } from '../../services/slack.service';
import {
  getEnvironmentFromHost,
  getSlackIdOrName,
} from '../../utils/slack-helpers';
import {
  SlackChannel,
  SlackEventType,
  SlackNode,
  SlackProvider,
  SlackSeverity,
} from '../../utils/enum';

const logger = getServiceLogger('plac-pipeline-ops-report-job');

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getDaysAgoDate(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Lagos',
  });
}

function getTodayLabel(): string {
  return new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Lagos',
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClientRow {
  clientId: string;
  clientName: string;
  clientEmail: string;
  dpcName: string | null;
  dpcEmail: string | null;
  vpcName: string | null;
  vpcEmail: string | null;
  spcName: string | null;
  spcEmail: string | null;
}

// Stats for discovery section — sourced from ManualApplication
interface DiscoveryStats {
  count1d: number;
  count5d: number;
}

// Stats for vetting section — sourced from ManualApplication
interface VettingStats {
  count1d: number;
  count5d: number;
  highQuality: number;
  medQuality: number;
  lowQuality: number;
  pendingVet: number;
}

// Stats for submission section — applied counts from Application, unattended from ManualApplication
interface SubmissionStats {
  count1d: number;
  count5d: number;
  unattended: number;
}

// ─── Fetch active clients ─────────────────────────────────────────────────────

async function fetchAllActiveClients(): Promise<ClientRow[]> {
  const credentials = await Credentials.findAll({
    where: { Active: true, deletedAt: null },
    attributes: [
      'clientId',
      'AssignedPCName',
      'AssignedPCEmail',
      'AssignedVetName',
      'AssignedVetEmail',
      'AssignedCompletedName',
      'AssignedCompletedEmail',
    ],
    include: [
      {
        model: User,
        as: 'client',
        attributes: ['id', 'firstName', 'lastName', 'email'],
        required: false,
      },
    ],
  });

  return credentials.map((c) => {
    const cred = c as any;
    const user = cred.client;
    const fullName = user
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
      : `Client ${cred.clientId}`;
    return {
      clientId: cred.clientId,
      clientName: fullName,
      clientEmail: user?.email || 'N/A',
      dpcName: cred.AssignedPCName || null,
      dpcEmail: cred.AssignedPCEmail || null,
      vpcName: cred.AssignedVetName || null,
      vpcEmail: cred.AssignedVetEmail || null,
      spcName: cred.AssignedCompletedName || null,
      spcEmail: cred.AssignedCompletedEmail || null,
    };
  });
}

// ─── Discovery stats (ManualApplication — in-progress jobs) ──────────────────

async function fetchDiscoveryStats(
  clientIds: string[],
  since1d: Date,
  since5d: Date
): Promise<Map<string, DiscoveryStats>> {
  const map = new Map<string, DiscoveryStats>();
  for (const id of clientIds) map.set(id, { count1d: 0, count5d: 0 });

  const [rows1d, rows5d] = await Promise.all([
    ManualApplication.findAll({
      where: {
        client_id: { [Op.in]: clientIds },
        isDeleted: false,
        [Op.or]: [
          { DiscoveryDate: { [Op.gte]: since1d } },
          { DiscoveryDate: null, createdAt: { [Op.gte]: since1d } },
        ],
        DiscoveredBy: {
          [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }, { [Op.ne]: 'N/A' }],
        },
      },
      attributes: ['client_id'],
      raw: true,
    }),
    ManualApplication.findAll({
      where: {
        client_id: { [Op.in]: clientIds },
        isDeleted: false,
        [Op.or]: [
          { DiscoveryDate: { [Op.gte]: since5d } },
          { DiscoveryDate: null, createdAt: { [Op.gte]: since5d } },
        ],
        DiscoveredBy: {
          [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }, { [Op.ne]: 'N/A' }],
        },
      },
      attributes: ['client_id'],
      raw: true,
    }),
  ]);

  for (const row of rows1d) {
    const e = map.get((row as any).client_id);
    if (e) e.count1d++;
  }
  for (const row of rows5d) {
    const e = map.get((row as any).client_id);
    if (e) e.count5d++;
  }

  return map;
}

// ─── Vetting stats (ManualApplication) ───────────────────────────────────────

function bucketQuality(
  score: string | null | undefined
): 'high' | 'med' | 'low' {
  const s = (score || '').toUpperCase().trim();
  if (s === 'H' || s === 'HQA' || s === 'HIGH') return 'high';
  if (s === 'M' || s === 'MQA' || s === 'MEDIUM' || s === 'MED') return 'med';
  return 'low';
}

async function fetchVettingStats(
  clientIds: string[],
  since1d: Date,
  since5d: Date
): Promise<Map<string, VettingStats>> {
  const map = new Map<string, VettingStats>();
  for (const id of clientIds) {
    map.set(id, {
      count1d: 0,
      count5d: 0,
      highQuality: 0,
      medQuality: 0,
      lowQuality: 0,
      pendingVet: 0,
    });
  }

  const [rows1d, rows5d, pendingRows] = await Promise.all([
    ManualApplication.findAll({
      where: {
        client_id: { [Op.in]: clientIds },
        isDeleted: false,
        VettedBy: {
          [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }, { [Op.ne]: 'N/A' }],
        },
        [Op.or]: [
          { VettedDate: { [Op.gte]: since1d } },
          { VettedDate: null, createdAt: { [Op.gte]: since1d } },
        ],
      },
      attributes: ['client_id', 'QualityScore'],
      raw: true,
    }),
    ManualApplication.findAll({
      where: {
        client_id: { [Op.in]: clientIds },
        isDeleted: false,
        VettedBy: {
          [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }, { [Op.ne]: 'N/A' }],
        },
        [Op.or]: [
          { VettedDate: { [Op.gte]: since5d } },
          { VettedDate: null, createdAt: { [Op.gte]: since5d } },
        ],
      },
      attributes: ['client_id', 'QualityScore'],
      raw: true,
    }),
    // Pending vet = discovered but VettedBy is still empty
    ManualApplication.findAll({
      where: {
        client_id: { [Op.in]: clientIds },
        isDeleted: false,
        [Op.or]: [{ VettedBy: null }, { VettedBy: '' }, { VettedBy: 'N/A' }],
        DiscoveredBy: {
          [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }, { [Op.ne]: 'N/A' }],
        },
      },
      attributes: ['client_id'],
      raw: true,
    }),
  ]);

  for (const row of rows1d) {
    const e = map.get((row as any).client_id);
    if (!e) continue;
    e.count1d++;
    const b = bucketQuality((row as any).QualityScore);
    if (b === 'high') e.highQuality++;
    else if (b === 'med') e.medQuality++;
    else e.lowQuality++;
  }
  for (const row of rows5d) {
    const e = map.get((row as any).client_id);
    if (e) e.count5d++;
  }
  for (const row of pendingRows) {
    const e = map.get((row as any).client_id);
    if (e) e.pendingVet++;
  }

  return map;
}

// ─── Submission stats (Application = successful; ManualApplication = unattended) ──

async function fetchSubmissionStats(
  clientIds: string[],
  since1d: Date,
  since5d: Date
): Promise<Map<string, SubmissionStats>> {
  const map = new Map<string, SubmissionStats>();
  for (const id of clientIds)
    map.set(id, { count1d: 0, count5d: 0, unattended: 0 });

  const [apps1d, apps5d, unattendedRows] = await Promise.all([
    // Successful applications from Application table
    Application.findAll({
      where: {
        client_id: { [Op.in]: clientIds },
        Status: 'Applied',
        isDeleted: false,
        updatedAt: { [Op.gte]: since1d },
      },
      attributes: ['client_id'],
      raw: true,
    }),
    Application.findAll({
      where: {
        client_id: { [Op.in]: clientIds },
        Status: 'Applied',
        isDeleted: false,
        updatedAt: { [Op.gte]: since5d },
      },
      attributes: ['client_id'],
      raw: true,
    }),
    // Unattended = vetted in ManualApplication but not yet submitted
    ManualApplication.findAll({
      where: {
        client_id: { [Op.in]: clientIds },
        isDeleted: false,
        VettedBy: {
          [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }, { [Op.ne]: 'N/A' }],
        },
        [Op.or]: [
          { ApplicationSubmittedBy: null },
          { ApplicationSubmittedBy: '' },
          { ApplicationSubmittedBy: 'N/A' },
        ],
      },
      attributes: ['client_id'],
      raw: true,
    }),
  ]);

  for (const row of apps1d) {
    const e = map.get((row as any).client_id);
    if (e) e.count1d++;
  }
  for (const row of apps5d) {
    const e = map.get((row as any).client_id);
    if (e) e.count5d++;
  }
  for (const row of unattendedRows) {
    const e = map.get((row as any).client_id);
    if (e) e.unattended++;
  }

  return map;
}

// ─── Backlog: unattended >24h and vetted-not-submitted >24h ──────────────────

async function fetchUnattendedBacklog(): Promise<
  Array<{ clientId: string; count: number; oldestDate: Date }>
> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  // Unattended = in ManualApplication, discovered but not yet vetted, older than 24h
  const rows = await ManualApplication.findAll({
    where: {
      isDeleted: false,
      DiscoveredBy: {
        [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }, { [Op.ne]: 'N/A' }],
      },
      [Op.or]: [{ VettedBy: null }, { VettedBy: '' }, { VettedBy: 'N/A' }],
      createdAt: { [Op.lte]: cutoff },
    },
    attributes: [
      'client_id',
      [fn('COUNT', col('id')), 'cnt'],
      [fn('MIN', col('createdAt')), 'oldestDate'],
    ],
    group: ['client_id'],
    order: [[literal('"cnt"'), 'DESC']],
    raw: true,
  });

  return (rows as any[]).map((r) => ({
    clientId: r.client_id,
    count: parseInt(r.cnt, 10),
    oldestDate: new Date(r.oldestDate),
  }));
}

async function fetchVettedNotSubmittedBacklog(): Promise<
  Array<{ clientId: string; count: number; oldestDate: Date }>
> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  // Vetted but not submitted = VettedBy set, ApplicationSubmittedBy empty, older than 24h
  const rows = await ManualApplication.findAll({
    where: {
      isDeleted: false,
      VettedBy: {
        [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }, { [Op.ne]: 'N/A' }],
      },
      [Op.or]: [
        { ApplicationSubmittedBy: null },
        { ApplicationSubmittedBy: '' },
        { ApplicationSubmittedBy: 'N/A' },
      ],
      updatedAt: { [Op.lte]: cutoff },
    },
    attributes: [
      'client_id',
      [fn('COUNT', col('id')), 'cnt'],
      [fn('MIN', col('updatedAt')), 'oldestDate'],
    ],
    group: ['client_id'],
    order: [[literal('"cnt"'), 'DESC']],
    raw: true,
  });

  return (rows as any[]).map((r) => ({
    clientId: r.client_id,
    count: parseInt(r.cnt, 10),
    oldestDate: new Date(r.oldestDate),
  }));
}

// ─── Slack tag helper ─────────────────────────────────────────────────────────

async function tagPC(
  email: string | null,
  name: string | null
): Promise<string> {
  if (email) return getSlackIdOrName(email);
  return name || 'unassigned';
}

// ─── Section builders ─────────────────────────────────────────────────────────

async function buildDiscoverySection(
  clients: ClientRow[],
  discoveryMap: Map<string, DiscoveryStats>
): Promise<string> {
  const DIV = '─────────────────────────────────────────────────';
  const lines: string[] = [
    DIV,
    '*:mag: DISCOVERY — Last 1 Day  /  Last 5 Days*',
    DIV,
  ];

  // ── Zero clients (no discoveries in last 5d), alphabetical ──
  const zeroClients = clients
    .filter((c) => (discoveryMap.get(c.clientId)?.count5d ?? 0) === 0)
    .sort((a, b) => a.clientName.localeCompare(b.clientName));

  if (zeroClients.length > 0) {
    lines.push(':x: *Clients with 0 jobs discovered (last 5d):*');
    const unassigned = zeroClients.filter((c) => !c.dpcName && !c.dpcEmail);
    if (unassigned.length > 0) {
      lines.push('*Unassigned DPC:*');
      for (const c of unassigned) lines.push(`  • ${c.clientName} — 0`);
    }
    const assignedInactive = zeroClients.filter((c) => c.dpcName || c.dpcEmail);
    if (assignedInactive.length > 0) {
      lines.push('*Assigned but inactive:*');
      for (const c of assignedInactive) lines.push(`  • ${c.clientName} — 0`);
    }
    lines.push('');
  }

  // ── Group all clients by DPC, numbered, clients alphabetical ──
  const dpcMap = new Map<
    string,
    { dpcEmail: string | null; clients: ClientRow[] }
  >();
  for (const c of clients) {
    const key = c.dpcName || 'Unassigned';
    if (!dpcMap.has(key))
      dpcMap.set(key, { dpcEmail: c.dpcEmail, clients: [] });
    dpcMap.get(key)!.clients.push(c);
  }

  // Sort DPC groups by their total 5d count descending
  const sortedDpcGroups = [...dpcMap.entries()].sort((a, b) => {
    const totalA = a[1].clients.reduce(
      (s, c) => s + (discoveryMap.get(c.clientId)?.count5d ?? 0),
      0
    );
    const totalB = b[1].clients.reduce(
      (s, c) => s + (discoveryMap.get(c.clientId)?.count5d ?? 0),
      0
    );
    return totalB - totalA;
  });

  let rank = 1;
  for (const [dpcName, group] of sortedDpcGroups) {
    const total1d = group.clients.reduce(
      (s, c) => s + (discoveryMap.get(c.clientId)?.count1d ?? 0),
      0
    );
    const total5d = group.clients.reduce(
      (s, c) => s + (discoveryMap.get(c.clientId)?.count5d ?? 0),
      0
    );
    const tag = await tagPC(group.dpcEmail, dpcName);

    lines.push(
      `:bust_in_silhouette: *${rank++}.* ${tag}  |  Discovered *1d:* ${total1d}  *5d:* ${total5d}`
    );

    const sortedClients = [...group.clients].sort((a, b) =>
      a.clientName.localeCompare(b.clientName)
    );
    for (const c of sortedClients) {
      const s = discoveryMap.get(c.clientId)!;
      lines.push(
        `    • *${c.clientName}*  1d: ${s.count1d}  |  5d: ${s.count5d}`
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}

async function buildVettingSection(
  clients: ClientRow[],
  vettingMap: Map<string, VettingStats>
): Promise<string> {
  const DIV = '─────────────────────────────────────────────────';
  const lines: string[] = [
    DIV,
    '*:white_check_mark: VETTING — Last 1 Day  /  Last 5 Days*',
    DIV,
  ];

  // ── Zero clients alphabetical ──
  const zeroClients = clients
    .filter((c) => (vettingMap.get(c.clientId)?.count5d ?? 0) === 0)
    .sort((a, b) => a.clientName.localeCompare(b.clientName));

  if (zeroClients.length > 0) {
    lines.push(':x: *Clients with 0 jobs vetted (last 5d):*');
    const unassigned = zeroClients.filter((c) => !c.vpcName && !c.vpcEmail);
    if (unassigned.length > 0) {
      lines.push('*Unassigned VPC:*');
      for (const c of unassigned) lines.push(`  • ${c.clientName} — 0`);
    }
    const assignedInactive = zeroClients.filter((c) => c.vpcName || c.vpcEmail);
    if (assignedInactive.length > 0) {
      lines.push('*Assigned but inactive:*');
      for (const c of assignedInactive) lines.push(`  • ${c.clientName} — 0`);
    }
    lines.push('');
  }

  // ── Group by VPC, sorted by total 5d descending ──
  const vpcMap = new Map<
    string,
    { vpcEmail: string | null; clients: ClientRow[] }
  >();
  for (const c of clients) {
    const key = c.vpcName || 'Unassigned';
    if (!vpcMap.has(key))
      vpcMap.set(key, { vpcEmail: c.vpcEmail, clients: [] });
    vpcMap.get(key)!.clients.push(c);
  }

  const sortedVpcGroups = [...vpcMap.entries()].sort((a, b) => {
    const totalA = a[1].clients.reduce(
      (s, c) => s + (vettingMap.get(c.clientId)?.count5d ?? 0),
      0
    );
    const totalB = b[1].clients.reduce(
      (s, c) => s + (vettingMap.get(c.clientId)?.count5d ?? 0),
      0
    );
    return totalB - totalA;
  });

  let rank = 1;
  for (const [vpcName, group] of sortedVpcGroups) {
    const total1d = group.clients.reduce(
      (s, c) => s + (vettingMap.get(c.clientId)?.count1d ?? 0),
      0
    );
    const total5d = group.clients.reduce(
      (s, c) => s + (vettingMap.get(c.clientId)?.count5d ?? 0),
      0
    );
    const tag = await tagPC(group.vpcEmail, vpcName);

    lines.push(
      `:bust_in_silhouette: *${rank++}.* ${tag}  |  Vetted *1d:* ${total1d}  *5d:* ${total5d}`
    );

    const sortedClients = [...group.clients].sort((a, b) =>
      a.clientName.localeCompare(b.clientName)
    );
    for (const c of sortedClients) {
      const s = vettingMap.get(c.clientId)!;
      lines.push(
        `    • *${c.clientName}*  1d: ${s.count1d}  |  5d: ${s.count5d}  |  Quality: H=${s.highQuality} M=${s.medQuality} L=${s.lowQuality}  |  Pending vet: ${s.pendingVet}`
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}

async function buildSubmissionSection(
  clients: ClientRow[],
  submissionMap: Map<string, SubmissionStats>
): Promise<string> {
  const DIV = '─────────────────────────────────────────────────';
  const lines: string[] = [
    DIV,
    '*:inbox_tray: SUBMISSION — Last 1 Day  /  Last 5 Days*',
    DIV,
  ];

  // ── Zero clients alphabetical ──
  const zeroClients = clients
    .filter((c) => (submissionMap.get(c.clientId)?.count5d ?? 0) === 0)
    .sort((a, b) => a.clientName.localeCompare(b.clientName));

  if (zeroClients.length > 0) {
    lines.push(':x: *Clients with 0 applications (last 5d):*');
    const unassigned = zeroClients.filter((c) => !c.spcName && !c.spcEmail);
    if (unassigned.length > 0) {
      lines.push('*Unassigned SPC:*');
      for (const c of unassigned) lines.push(`  • ${c.clientName} — 0`);
    }
    const assignedInactive = zeroClients.filter((c) => c.spcName || c.spcEmail);
    if (assignedInactive.length > 0) {
      lines.push('*Assigned but inactive:*');
      for (const c of assignedInactive) lines.push(`  • ${c.clientName} — 0`);
    }
    lines.push('');
  }

  // ── Group by SPC, sorted by total 5d descending ──
  const spcMap = new Map<
    string,
    { spcEmail: string | null; clients: ClientRow[] }
  >();
  for (const c of clients) {
    const key = c.spcName || 'Unassigned';
    if (!spcMap.has(key))
      spcMap.set(key, { spcEmail: c.spcEmail, clients: [] });
    spcMap.get(key)!.clients.push(c);
  }

  const sortedSpcGroups = [...spcMap.entries()].sort((a, b) => {
    const totalA = a[1].clients.reduce(
      (s, c) => s + (submissionMap.get(c.clientId)?.count5d ?? 0),
      0
    );
    const totalB = b[1].clients.reduce(
      (s, c) => s + (submissionMap.get(c.clientId)?.count5d ?? 0),
      0
    );
    return totalB - totalA;
  });

  let rank = 1;
  for (const [spcName, group] of sortedSpcGroups) {
    const total1d = group.clients.reduce(
      (s, c) => s + (submissionMap.get(c.clientId)?.count1d ?? 0),
      0
    );
    const total5d = group.clients.reduce(
      (s, c) => s + (submissionMap.get(c.clientId)?.count5d ?? 0),
      0
    );
    const tag = await tagPC(group.spcEmail, spcName);

    lines.push(
      `:bust_in_silhouette: *${rank++}.* ${tag}  |  Total Applications *1d:* ${total1d}  *5d:* ${total5d}`
    );

    const sortedClients = [...group.clients].sort((a, b) =>
      a.clientName.localeCompare(b.clientName)
    );
    for (const c of sortedClients) {
      const s = submissionMap.get(c.clientId)!;
      lines.push(
        `    • *${c.clientName}*  Applied 1d: ${s.count1d}  |  5d: ${s.count5d}  |  Unattended: ${s.unattended}`
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}

async function buildBacklogSection(
  clients: ClientRow[],
  unattendedBacklog: Array<{
    clientId: string;
    count: number;
    oldestDate: Date;
  }>,
  vettedNotSubmitted: Array<{
    clientId: string;
    count: number;
    oldestDate: Date;
  }>
): Promise<string> {
  const DIV = '─────────────────────────────────────────────────';
  const clientMap = new Map(clients.map((c) => [c.clientId, c]));

  const lines: string[] = [
    DIV,
    '*:warning: BACKLOG SNAPSHOT (right now)*',
    DIV,
  ];

  // ── Unattended >24h ──
  const totalUnattended = unattendedBacklog.reduce((s, r) => s + r.count, 0);
  lines.push(
    `*Unattended >24h:* ${totalUnattended} jobs across ${unattendedBacklog.length} client(s)`
  );

  const topUnattended = unattendedBacklog.slice(0, 5);
  for (const row of topUnattended) {
    const c = clientMap.get(row.clientId);
    const name = c?.clientName ?? `Client ${row.clientId}`;
    const dpcTag = await tagPC(c?.dpcEmail ?? null, c?.dpcName ?? null);
    const vpcTag = await tagPC(c?.vpcEmail ?? null, c?.vpcName ?? null);
    lines.push(
      `  • *${name}* — ${row.count} stuck  |  oldest: ${formatDate(row.oldestDate)}  |  DPC: ${dpcTag}  /  VPC: ${vpcTag}`
    );
  }

  lines.push('');

  // ── Vetted but not submitted >24h ──
  const totalVettedNotSub = vettedNotSubmitted.reduce((s, r) => s + r.count, 0);
  lines.push(
    `*Vetted but not Submitted >24h:* ${totalVettedNotSub} jobs across ${vettedNotSubmitted.length} client(s)`
  );

  const topVettedNotSub = vettedNotSubmitted.slice(0, 5);
  for (const row of topVettedNotSub) {
    const c = clientMap.get(row.clientId);
    const name = c?.clientName ?? `Client ${row.clientId}`;
    const vpcTag = await tagPC(c?.vpcEmail ?? null, c?.vpcName ?? null);
    const spcTag = await tagPC(c?.spcEmail ?? null, c?.spcName ?? null);
    lines.push(
      `  • *${name}* — ${row.count} stuck  |  oldest: ${formatDate(row.oldestDate)}  |  VPC: ${vpcTag}  /  SPC: ${spcTag}`
    );
  }

  lines.push('');
  return lines.join('\n');
}

async function buildMissingPCSection(clients: ClientRow[]): Promise<string> {
  const DIV = '─────────────────────────────────────────────────';
  const lines: string[] = [
    DIV,
    '*:rotating_light: CLIENTS MISSING PC ASSIGNMENT (with active pipeline)*',
    DIV,
  ];

  const flagged = clients
    .filter((c) => !c.dpcName || !c.vpcName || !c.spcName)
    .sort((a, b) => a.clientName.localeCompare(b.clientName));

  if (flagged.length === 0) {
    lines.push('_✅ All active clients have full PC assignments._');
    return lines.join('\n');
  }

  for (const c of flagged) {
    const missing: string[] = [];
    if (!c.dpcName) missing.push('DPC');
    if (!c.vpcName) missing.push('VPC');
    if (!c.spcName) missing.push('SPC');
    lines.push(`• *${c.clientName}* — missing: _${missing.join(', ')}_`);
  }

  return lines.join('\n');
}

// ─── Main job logic ───────────────────────────────────────────────────────────

export async function runPlacPipelineOpsReportJob() {
  logger.info('📊 Running PlacPipeline Ops Report job...');

  const since1d = getDaysAgoDate(1);
  const since5d = getDaysAgoDate(5);

  const clients = await fetchAllActiveClients();

  if (clients.length === 0) {
    logger.info('No active clients found, skipping ops report.');
    return;
  }

  const clientIds = clients.map((c) => c.clientId);

  const [
    discoveryMap,
    vettingMap,
    submissionMap,
    unattendedBacklog,
    vettedNotSub,
  ] = await Promise.all([
    fetchDiscoveryStats(clientIds, since1d, since5d),
    fetchVettingStats(clientIds, since1d, since5d),
    fetchSubmissionStats(clientIds, since1d, since5d),
    fetchUnattendedBacklog(),
    fetchVettedNotSubmittedBacklog(),
  ]);

  logger.info(
    `Clients loaded: ${clients.length} | Unattended backlog: ${unattendedBacklog.length} | Vetted-not-submitted: ${vettedNotSub.length}`
  );

  // Build sections sequentially (each awaits Slack tag lookups internally)
  const discoverySection = await buildDiscoverySection(clients, discoveryMap);
  const vettingSection = await buildVettingSection(clients, vettingMap);
  const submissionSection = await buildSubmissionSection(
    clients,
    submissionMap
  );
  const backlogSection = await buildBacklogSection(
    clients,
    unattendedBacklog,
    vettedNotSub
  );
  const missingSection = await buildMissingPCSection(clients);

  const DIV = '─────────────────────────────────────────────────';

  const body = [
    `${DIV}`,
    `:bar_chart: *PlacPipeline Ops Report — ${getTodayLabel()} (Africa/Lagos)*`,
    `${DIV}`,
    '',
    discoverySection,
    vettingSection,
    submissionSection,
    backlogSection,
    missingSection,
    '',
    `_Automated check · ${new Date().toISOString()}_`,
  ].join('\n');

  await SlackService.notify({
    location: getEnvironmentFromHost(process.env.CLIENT_APP_DOMAIN),
    host: process.env.CLIENT_APP_DOMAIN,
    node: SlackNode.BACKGROUND_JOB,
    provider: SlackProvider.SYSTEM,
    severity: SlackSeverity.INFO,
    trigger: 'PlacPipeline Ops Report (System Job)',
    type: SlackEventType.SYSTEM_JOB,
    channel: SlackChannel.VA,
    body,
  });

  logger.info('✅ PlacPipeline Ops Report sent successfully');
}

/**
 * Cron job: runs every Saturday at 12:10 AM WAT (Africa/Lagos timezone).
 */
export function createPlacPipelineOpsReportJob() {
  return cron.schedule(
    '10 0 * * 6',
    async () => {
      try {
        await runPlacPipelineOpsReportJob();
      } catch (error: any) {
        logger.error(`❌ PlacPipeline Ops Report job failed: ${error.message}`);
      }
    },
    {
      scheduled: false,
      timezone: 'Africa/Lagos',
    } as any
  );
}
