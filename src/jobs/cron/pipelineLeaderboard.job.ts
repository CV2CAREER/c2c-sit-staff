import cron from 'node-cron';
import { Op } from 'sequelize';
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

const logger = getServiceLogger('pipeline-leaderboard-job');

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getYesterdayRange(): { start: Date; end: Date } {
  const now = new Date();

  // Yesterday 12:00:00.000 AM
  const start = new Date(now);
  start.setDate(start.getDate() - 1);
  start.setHours(0, 0, 0, 0);

  // Yesterday 11:59:59.999 PM
  const end = new Date(now);
  end.setDate(end.getDate() - 1);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function getYesterdayLabel(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Lagos',
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClientInfo {
  clientId: string;
  clientName: string;
  dpcName: string | null;
  dpcEmail: string | null;
  vpcName: string | null;
  vpcEmail: string | null;
  spcName: string | null;
  spcEmail: string | null;
}

interface QualityCount {
  count: number;
  high: number;
  med: number;
  low: number;
}

interface PCEntry {
  pcName: string;
  pcEmail: string | null;
  total: number;
  high: number;
  med: number;
  low: number;
  unattended: number;
  // clientId → stats
  clients: Map<
    string,
    {
      clientName: string;
      unattended: number;
    } & QualityCount
  >;
}

// ─── Fetch active clients from Credentials + User join ────────────────────────

async function fetchUnattendedCounts(
  clientIds: string[],
  start: Date,
  end: Date
): Promise<Map<string, number>> {
  const rows = await ManualApplication.findAll({
    where: {
      client_id: {
        [Op.in]: clientIds,
      },
      isDeleted: false,
      Status: 'UNATTENDED',
      DiscoveryDate: {
        [Op.gte]: start,
        [Op.lt]: end,
      },
    },
    attributes: [
      'client_id',
      [
        ManualApplication.sequelize!.fn(
          'COUNT',
          ManualApplication.sequelize!.col('id')
        ),
        'count',
      ],
    ],
    group: ['client_id'],
    raw: true,
  });

  const map = new Map<string, number>();

  for (const row of rows as any[]) {
    map.set(row.client_id, Number(row.count));
  }

  return map;
}

async function fetchAwaitingSubmissionCounts(
  clientIds: string[],
  start: Date,
  end: Date
): Promise<Map<string, number>> {
  const rows = await ManualApplication.findAll({
    where: {
      client_id: {
        [Op.in]: clientIds,
      },
      isDeleted: false,
      Status: 'VETTED',
      VettedDate: {
        [Op.gte]: start,
        [Op.lt]: end,
      },
    },
    attributes: [
      'client_id',
      [
        ManualApplication.sequelize!.fn(
          'COUNT',
          ManualApplication.sequelize!.col('id')
        ),
        'count',
      ],
    ],
    group: ['client_id'],
    raw: true,
  });

  const map = new Map<string, number>();

  for (const row of rows as any[]) {
    map.set(row.client_id, Number(row.count));
  }

  return map;
}

async function fetchAllActiveClients(): Promise<ClientInfo[]> {
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
      dpcName: cred.AssignedPCName || null,
      dpcEmail: cred.AssignedPCEmail || null,
      vpcName: cred.AssignedVetName || null,
      vpcEmail: cred.AssignedVetEmail || null,
      spcName: cred.AssignedCompletedName || null,
      spcEmail: cred.AssignedCompletedEmail || null,
    };
  });
}

// ─── Quality score bucketing ──────────────────────────────────────────────────

function bucketQuality(
  score: string | null | undefined
): 'high' | 'med' | 'low' {
  const s = (score || '').toUpperCase().trim();
  if (s === 'H' || s === 'HQA' || s === 'HIGH') return 'high';
  if (s === 'M' || s === 'MQA' || s === 'MEDIUM' || s === 'MED') return 'med';
  return 'low';
}

// ─── Fetch ManualApplication rows for yesterday ───────────────────────────────
// Three separate queries — one per action type — using createdAt as the
// reliable date anchor (the specific date columns may be null).
// Each query only returns rows where the relevant PC field is non-null/non-empty
// so aggregation never has to deal with blanks.

async function fetchDiscoveryRowsYesterday(
  clientIds: string[],
  start: Date,
  end: Date
): Promise<Array<{ client_id: string; DiscoveredBy: string }>> {
  const rows = await ManualApplication.findAll({
    where: {
      client_id: { [Op.in]: clientIds },
      isDeleted: false,
      DiscoveredBy: {
        [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }, { [Op.ne]: 'N/A' }],
      },
      [Op.or]: [
        { DiscoveryDate: { [Op.gte]: start, [Op.lt]: end } },
        {
          DiscoveryDate: null,
          createdAt: { [Op.gte]: start, [Op.lt]: end },
        },
      ],
    },
    attributes: ['client_id', 'DiscoveredBy'],
    raw: true,
  });
  return rows as any[];
}

async function fetchVettingRowsYesterday(
  clientIds: string[],
  start: Date,
  end: Date
): Promise<
  Array<{ client_id: string; VettedBy: string; QualityScore: string | null }>
> {
  const rows = await ManualApplication.findAll({
    where: {
      client_id: { [Op.in]: clientIds },
      isDeleted: false,
      VettedBy: {
        [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }, { [Op.ne]: 'N/A' }],
      },
      [Op.or]: [
        { VettedDate: { [Op.gte]: start, [Op.lt]: end } },
        {
          VettedDate: null,
          createdAt: { [Op.gte]: start, [Op.lt]: end },
        },
      ],
    },
    attributes: ['client_id', 'VettedBy', 'QualityScore'],
    raw: true,
  });
  return rows as any[];
}

async function fetchSubmissionRowsYesterday(
  clientIds: string[],
  start: Date,
  end: Date
): Promise<Array<{ client_id: string; ApplicationSubmittedBy: string }>> {
  const rows = await ManualApplication.findAll({
    where: {
      client_id: { [Op.in]: clientIds },
      isDeleted: false,
      ApplicationSubmittedBy: {
        [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }, { [Op.ne]: 'N/A' }],
      },
      [Op.or]: [
        { ApplicationSubmissionDate: { [Op.gte]: start, [Op.lt]: end } },
        {
          ApplicationSubmissionDate: null,
          createdAt: { [Op.gte]: start, [Op.lt]: end },
        },
      ],
    },
    attributes: ['client_id', 'ApplicationSubmittedBy'],
    raw: true,
  });
  return rows as any[];
}

// ─── Aggregate helpers ────────────────────────────────────────────────────────

function aggregateDiscovery(
  rows: Array<{ client_id: string; DiscoveredBy: string }>,
  clientMap: Map<string, ClientInfo>
): PCEntry[] {
  const pcMap = new Map<string, PCEntry>();

  for (const row of rows) {
    const pcName = row.DiscoveredBy.trim();
    if (!pcName) continue;

    if (!pcMap.has(pcName)) {
      pcMap.set(pcName, {
        pcName,
        pcEmail: null,
        total: 0,
        high: 0,
        med: 0,
        low: 0,
        unattended: 0,
        clients: new Map(),
      });
    }
    const entry = pcMap.get(pcName)!;
    entry.total++;

    const clientId = row.client_id;
    const clientName =
      clientMap.get(clientId)?.clientName ?? `Client ${clientId}`;
    if (!entry.clients.has(clientId)) {
      entry.clients.set(clientId, {
        clientName,
        count: 0,
        high: 0,
        med: 0,
        low: 0,
      });
    }
    entry.clients.get(clientId)!.count++;
  }

  return [...pcMap.values()].sort((a, b) => b.total - a.total);
}

function aggregateVetting(
  rows: Array<{
    client_id: string;
    VettedBy: string;
    QualityScore: string | null;
  }>,
  clientMap: Map<string, ClientInfo>,
  unattendedMap: Map<string, number>
): PCEntry[] {
  const pcMap = new Map<string, PCEntry>();

  for (const row of rows) {
    const pcName = row.VettedBy.trim();
    if (!pcName) continue;

    if (!pcMap.has(pcName)) {
      pcMap.set(pcName, {
        pcName,
        pcEmail: null,
        total: 0,
        high: 0,
        med: 0,
        low: 0,
        unattended: 0,
        clients: new Map(),
      });
    }
    const entry = pcMap.get(pcName)!;
    entry.total++;

    const bucket = bucketQuality(row.QualityScore);
    if (bucket === 'high') entry.high++;
    else if (bucket === 'med') entry.med++;
    else entry.low++;

    const clientId = row.client_id;
    const clientName =
      clientMap.get(clientId)?.clientName ?? `Client ${clientId}`;
    if (!entry.clients.has(clientId)) {
      entry.clients.set(clientId, {
        clientName,
        count: 0,
        high: 0,
        med: 0,
        low: 0,
        unattended: unattendedMap.get(clientId) ?? 0,
      });
      entry.unattended += unattendedMap.get(clientId) ?? 0;
    }

    const c = entry.clients.get(clientId)!;
    c.count++;
    if (bucket === 'high') c.high++;
    else if (bucket === 'med') c.med++;
    else c.low++;
  }

  return [...pcMap.values()].sort((a, b) => b.total - a.total);
}

function aggregateSubmission(
  rows: Array<{ client_id: string; ApplicationSubmittedBy: string }>,
  clientMap: Map<string, ClientInfo>,
  unattendedMap: Map<string, number>
): PCEntry[] {
  const pcMap = new Map<string, PCEntry>();

  for (const row of rows) {
    const pcName = row.ApplicationSubmittedBy.trim();
    if (!pcName) continue;

    if (!pcMap.has(pcName)) {
      pcMap.set(pcName, {
        pcName,
        pcEmail: null,
        total: 0,
        high: 0,
        med: 0,
        low: 0,
        unattended: 0,
        clients: new Map(),
      });
    }
    const entry = pcMap.get(pcName)!;
    entry.total++;

    const clientId = row.client_id;
    const clientName =
      clientMap.get(clientId)?.clientName ?? `Client ${clientId}`;
    if (!entry.clients.has(clientId)) {
      entry.clients.set(clientId, {
        clientName,
        count: 0,
        high: 0,
        med: 0,
        low: 0,
        unattended: unattendedMap.get(clientId) ?? 0,
      });
      entry.unattended += unattendedMap.get(clientId) ?? 0;
    }

    entry.clients.get(clientId)!.count++;
  }

  return [...pcMap.values()].sort((a, b) => b.total - a.total);
}

// ─── Resolve PC email from Credentials (to tag on Slack) ─────────────────────

/**
 * Build a name→email lookup from active Credentials so we can resolve
 * the free-text DiscoveredBy / VettedBy / ApplicationSubmittedBy names
 * to an email for Slack tagging.
 */
async function buildPCEmailLookup(): Promise<Map<string, string>> {
  const creds = await Credentials.findAll({
    where: { Active: true, deletedAt: null },
    attributes: [
      'AssignedPCName',
      'AssignedPCEmail',
      'AssignedVetName',
      'AssignedVetEmail',
      'AssignedCompletedName',
      'AssignedCompletedEmail',
    ],
    raw: true,
  });

  const lookup = new Map<string, string>();

  for (const c of creds as any[]) {
    if (c.AssignedPCName && c.AssignedPCEmail)
      lookup.set(c.AssignedPCName.trim(), c.AssignedPCEmail.trim());
    if (c.AssignedVetName && c.AssignedVetEmail)
      lookup.set(c.AssignedVetName.trim(), c.AssignedVetEmail.trim());
    if (c.AssignedCompletedName && c.AssignedCompletedEmail)
      lookup.set(
        c.AssignedCompletedName.trim(),
        c.AssignedCompletedEmail.trim()
      );
  }

  return lookup;
}

// ─── Slack tag helper ─────────────────────────────────────────────────────────

async function tagPC(
  name: string,
  emailLookup: Map<string, string>
): Promise<string> {
  const email = emailLookup.get(name);
  if (email) return getSlackIdOrName(email);
  return name;
}

// ─── Section builders ─────────────────────────────────────────────────────────

async function buildDiscoverySection(
  entries: PCEntry[],
  emailLookup: Map<string, string>
): Promise<string> {
  const lines: string[] = [
    '─────────────────────────────────────────────────',
    '*:mag: DISCOVERY TEAM — Ranked Biggest to Smallest*',
    '─────────────────────────────────────────────────',
  ];

  if (entries.length === 0) {
    lines.push('_No discovery activity yesterday._');
    lines.push('');
    return lines.join('\n');
  }

  for (let i = 0; i < entries.length; i++) {
    const pc = entries[i];
    const tag = await tagPC(pc.pcName, emailLookup);
    lines.push(`*${i + 1}.* ${tag} — *${pc.total}* jobs discovered`);

    const sorted = [...pc.clients.values()].sort((a, b) => b.count - a.count);
    for (const c of sorted) {
      lines.push(`   • *${c.clientName}:* ${c.count}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

async function buildVettingSection(
  entries: PCEntry[],
  emailLookup: Map<string, string>
): Promise<string> {
  const lines: string[] = [
    '─────────────────────────────────────────────────',
    '*:white_check_mark: VETTING TEAM — Ranked Biggest to Smallest*',
    '─────────────────────────────────────────────────',
  ];

  if (entries.length === 0) {
    lines.push('_No vetting activity yesterday._');
    lines.push('');
    return lines.join('\n');
  }

  for (let i = 0; i < entries.length; i++) {
    const pc = entries[i];
    const tag = await tagPC(pc.pcName, emailLookup);
    lines.push(
      `*${i + 1}.* ${tag} — *${pc.total}* jobs vetted (${pc.high}H / ${pc.med}M / ${pc.low}L) • ${pc.unattended} Pending Vetting`
    );

    const sorted = [...pc.clients.values()].sort((a, b) => b.count - a.count);
    for (const c of sorted) {
      lines.push(
        `   • *${c.clientName}:* ${c.count} (H=${c.high} M=${c.med} L=${c.low}) • ${c.unattended} Pending Vetting`
      );
    }
  }

  lines.push('');
  return lines.join('\n');
}

async function buildSubmissionSection(
  entries: PCEntry[],
  emailLookup: Map<string, string>
): Promise<string> {
  const lines: string[] = [
    '─────────────────────────────────────────────────',
    '*:inbox_tray: SUBMISSION TEAM — Ranked Biggest to Smallest*',
    '─────────────────────────────────────────────────',
  ];

  if (entries.length === 0) {
    lines.push('_No submission activity yesterday._');
    lines.push('');
    return lines.join('\n');
  }

  for (let i = 0; i < entries.length; i++) {
    const pc = entries[i];
    const tag = await tagPC(pc.pcName, emailLookup);
    lines.push(
      `*${i + 1}.* ${tag} — *${pc.total}* jobs vetted• ${pc.unattended} Pending Submission`
    );

    const sorted = [...pc.clients.values()].sort((a, b) => b.count - a.count);
    for (const c of sorted) {
      lines.push(
        `   • *${c.clientName}:* ${c.count} • ${c.unattended} Pending Submission`
      );
    }
  }

  lines.push('');
  return lines.join('\n');
}

async function buildMissingPCSection(
  clients: ClientInfo[],
  emailLookup: Map<string, string>
): Promise<string> {
  const lines: string[] = [
    '─────────────────────────────────────────────────',
    '*:rotating_light: CLIENTS MISSING PC ASSIGNMENT*',
    '─────────────────────────────────────────────────',
  ];

  // Only flag clients missing at least one PC
  const flagged = [...clients]
    .filter((c) => !c.dpcName || !c.vpcName || !c.spcName)
    .sort((a, b) => a.clientName.localeCompare(b.clientName));

  if (flagged.length === 0) {
    lines.push('_✅ All active clients have full PC assignments._');
    lines.push('');
    return lines.join('\n');
  }

  for (const c of flagged) {
    lines.push(`\n:rotating_light: *${c.clientName}*`);

    // DPC line
    if (c.dpcName) {
      const tag = await tagPC(c.dpcName, emailLookup);
      lines.push(`   *DPC:* ${tag}`);
    } else {
      lines.push(`   *DPC:* _unassigned_`);
    }

    // VPC line
    if (c.vpcName) {
      const tag = await tagPC(c.vpcName, emailLookup);
      lines.push(`   *VPC:* ${tag}`);
    } else {
      lines.push(`   *VPC:* _unassigned_`);
    }

    // SPC line
    if (c.spcName) {
      const tag = await tagPC(c.spcName, emailLookup);
      lines.push(`   *SPC:* ${tag}`);
    } else {
      lines.push(`   *SPC:* _unassigned_`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

// ─── Main job logic ───────────────────────────────────────────────────────────

export async function runPipelineLeaderboardJob() {
  logger.info('🏆 Running Pipeline Performance Leaderboard job...');

  const { start, end } = getYesterdayRange();

  const [clients, emailLookup] = await Promise.all([
    fetchAllActiveClients(),
    buildPCEmailLookup(),
  ]);

  if (clients.length === 0) {
    logger.info('No active clients found, skipping leaderboard.');
    return;
  }

  const clientIds = clients.map((c) => c.clientId);
  const clientMap = new Map(clients.map((c) => [c.clientId, c]));

  // Three separate queries — each scoped to its own PC field and date column
  const [discoveryRows, vettingRows, submissionRows] = await Promise.all([
    fetchDiscoveryRowsYesterday(clientIds, start, end),
    fetchVettingRowsYesterday(clientIds, start, end),
    fetchSubmissionRowsYesterday(clientIds, start, end),
  ]);

  logger.info(
    `Fetched yesterday: discovery=${discoveryRows.length} vetting=${vettingRows.length} submission=${submissionRows.length}`
  );

  const unattendedMap = await fetchUnattendedCounts(clientIds, start, end);
  const vettedMap = await fetchAwaitingSubmissionCounts(clientIds, start, end);

  const discoveryEntries = aggregateDiscovery(discoveryRows, clientMap);
  const vettingEntries = aggregateVetting(
    vettingRows,
    clientMap,
    unattendedMap
  );
  const submissionEntries = aggregateSubmission(
    submissionRows,
    clientMap,
    vettedMap
  );

  console.table(discoveryEntries);
  console.table(vettingEntries);
  console.table(submissionEntries);

  const [discoverySection, vettingSection, submissionSection, missingSection] =
    await Promise.all([
      buildDiscoverySection(discoveryEntries, emailLookup),
      buildVettingSection(vettingEntries, emailLookup),
      buildSubmissionSection(submissionEntries, emailLookup),
      buildMissingPCSection(clients, emailLookup),
    ]);
  logger.info(
    `Built sections: discovery=${discoverySection.length} vetting=${vettingSection.length} submission=${submissionSection.length} missing=${missingSection.length}`
  );

  const body = [
    `:trophy: *Pipeline Performance Leaderboard — ${getYesterdayLabel()}*`,
    '',
    discoverySection,
    vettingSection,
    submissionSection,
    // missingSection,
    `_Automated check · ${new Date().toISOString()}_`,
  ].join('\n');

  await SlackService.notify({
    location: getEnvironmentFromHost(process.env.CLIENT_APP_DOMAIN),
    host: process.env.CLIENT_APP_DOMAIN,
    node: SlackNode.BACKGROUND_JOB,
    provider: SlackProvider.SYSTEM,
    severity: SlackSeverity.INFO,
    trigger: 'Pipeline Performance Leaderboard',
    type: SlackEventType.SYSTEM_JOB,
    channel: SlackChannel.JOB_PIPELINE,
    body,
  });

  logger.info('✅ Pipeline Performance Leaderboard sent successfully');
}

/**
 * Cron job: runs daily at 12:00 AM WAT (Africa/Lagos timezone).
 */
export function createPipelineLeaderboardJob() {
  return cron.schedule(
    '0 0 * * *',
    async () => {
      try {
        await runPipelineLeaderboardJob();
      } catch (error: any) {
        logger.error(`❌ Pipeline Leaderboard job failed: ${error.message}`);
      }
    },
    {
      scheduled: false,
      timezone: 'Africa/Lagos',
    } as any
  );
}
