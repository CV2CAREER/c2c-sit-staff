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

const logger = getServiceLogger('unsatisfied-clients-job');

// ─── Date helpers ─────────────────────────────────────────────────────────────

// Africa/Lagos has no DST — it's fixed UTC+1 year-round — so "yesterday" is
// computed directly against that offset rather than via getDate()/setDate(),
// which operate in the server process's local timezone (UTC on this
// DigitalOcean droplet). This job fires at 00:05 WAT (= 23:05 UTC the day
// before), so at that instant the UTC calendar hasn't rolled over yet;
// server-local date math silently picks one day further back than intended.
function getYesterdayRange(): { start: Date; end: Date } {
  const lagosToday = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()); // 'YYYY-MM-DD', in WAT wall-clock terms

  const todayUTC = new Date(`${lagosToday}T00:00:00Z`);
  todayUTC.setUTCDate(todayUTC.getUTCDate() - 1);
  const yesterdayYMD = todayUTC.toISOString().slice(0, 10);

  const start = new Date(`${yesterdayYMD}T00:00:00.000+01:00`);
  const end = new Date(`${yesterdayYMD}T23:59:59.999+01:00`);

  return { start, end };
}

// Derived from the same `start` used for the query range, so the label
// shown on Slack can never disagree with the data actually fetched.
function getYesterdayLabel(start: Date): string {
  return start.toLocaleDateString('en-GB', {
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

/** A single client entry nested under a PC group. `count` is only meaningful
 *  for the vetting / submission backlog sections (it stays 0 for discovery,
 *  which is a pure yes/no flag per client). */
interface GroupedClient {
  clientId: string;
  clientName: string;
  count: number;
}

/** A PC (DPC/VPC/SPC) group — a name/email pair, or the "No Assigned" bucket. */
interface PCGroup {
  pcName: string; // e.g. "Precious N." or "No Assigned DPC"
  pcEmail: string | null;
  isUnassigned: boolean;
  totalClients: number; // number of clients in this group
  totalCount: number; // sum of each client's `count` (0 for the discovery section)
  clients: GroupedClient[];
}

// ─── Field validity helper ─────────────────────────────────────────────────────

function hasValidName(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.trim();
  if (!v) return false;
  if (v.toUpperCase() === 'N/A') return false;
  return true;
}

// ─── Fetch active clients (with DPC / VPC / SPC assignment) ──────────────────

async function fetchAllActiveClients(): Promise<ClientInfo[]> {
  const credentials = await Credentials.findAll({
    where: { Active: true, deletedAt: null, capitalized: 'FLIGHT' },
    include: [
      {
        model: User,
        as: 'client',
        attributes: ['id', 'firstName', 'lastName'],
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
      dpcName: hasValidName(cred.AssignedPCName)
        ? cred.AssignedPCName.trim()
        : null,
      dpcEmail: hasValidName(cred.AssignedPCEmail)
        ? cred.AssignedPCEmail.trim()
        : null,
      vpcName: hasValidName(cred.AssignedVetName)
        ? cred.AssignedVetName.trim()
        : null,
      vpcEmail: hasValidName(cred.AssignedVetEmail)
        ? cred.AssignedVetEmail.trim()
        : null,
      spcName: hasValidName(cred.AssignedCompletedName)
        ? cred.AssignedCompletedName.trim()
        : null,
      spcEmail: hasValidName(cred.AssignedCompletedEmail)
        ? cred.AssignedCompletedEmail.trim()
        : null,
    };
  });
}

// ─── Section 1: clients with 0 jobs discovered yesterday ──────────────────────
// A client "has" a discovered job yesterday if any (non-deleted) manual_application
// row for that client has a DiscoveryDate falling yesterday — or, when
// DiscoveryDate is blank, a createdAt falling yesterday. Anyone NOT in this
// set gets flagged for the discovery section.

async function fetchClientIdsWithDiscoveryYesterday(
  clientIds: string[],
  start: Date,
  end: Date
): Promise<Set<string>> {
  const rows = await ManualApplication.findAll({
    where: {
      client_id: { [Op.in]: clientIds },
      isDeleted: false,
      [Op.or]: [
        { DiscoveryDate: { [Op.gte]: start, [Op.lte]: end } },
        {
          DiscoveryDate: null,
          createdAt: { [Op.gte]: start, [Op.lte]: end },
        },
      ],
    },
    attributes: ['client_id'],
    group: ['client_id'],
    raw: true,
  });

  return new Set((rows as any[]).map((r) => r.client_id));
}

// ─── Section 2: clients with a vetting backlog (all-time, not date-scoped) ───
// A manual_application row counts as "not vetted" when Status === 'UNATTENDED'
// and it lacks a valid VettedBy name — a null VettedDate is used as a backup
// signal in case the VettedBy field itself is unreliable.

async function fetchUnvettedCountsByClient(
  clientIds: string[],
  start: Date,
  end: Date
): Promise<Map<string, number>> {
  const rows = await ManualApplication.findAll({
    where: {
      client_id: { [Op.in]: clientIds },
      isDeleted: false,
      Status: 'UNATTENDED',
      [Op.and]: [
        {
          [Op.or]: [
            { VettedBy: null },
            { VettedBy: '' },
            { VettedBy: 'N/A' },
            { VettedDate: null },
          ],
        },
        {
          [Op.or]: [
            { DiscoveryDate: { [Op.gte]: start, [Op.lte]: end } },
            {
              DiscoveryDate: null,
              createdAt: { [Op.gte]: start, [Op.lte]: end },
            },
          ],
        },
      ],
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

// ─── Section 3: clients with a submission backlog (all-time, not date-scoped) ─
// A manual_application row counts as "not submitted" when Status === 'VETTED'
// and it lacks a valid ApplicationSubmittedBy name — a null
// ApplicationSubmissionDate is used as a backup signal.

async function fetchUnsubmittedCountsByClient(
  clientIds: string[],
  start: Date,
  end: Date
): Promise<Map<string, number>> {
  const rows = await ManualApplication.findAll({
    where: {
      client_id: { [Op.in]: clientIds },
      isDeleted: false,
      Status: 'VETTED',
      [Op.or]: [
        { ApplicationSubmittedBy: null },
        { ApplicationSubmittedBy: '' },
        { ApplicationSubmittedBy: 'N/A' },
        { ApplicationSubmissionDate: null },
      ],
      VettedDate: { [Op.gte]: start, [Op.lte]: end },
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

// ─── Grouping helper ────────────────────────────────────────────────────────────
// Groups clients by their assigned PC (DPC/VPC/SPC), bucketing anyone with no
// valid name+email pair into a single "No Assigned ___" group.
//
// `countLookup` is optional:
//  - Omitted → every client passed in is included with count = 0 (discovery
//    section: a pure yes/no flag, the caller has already pre-filtered to
//    only the clients with zero discovery activity).
//  - Provided → each client's `count` comes from the lookup, and clients with
//    no entry (or a count of 0) are skipped entirely (vetting/submission
//    backlog sections: only clients who actually have outstanding jobs show up).

function groupClientsByPC(
  clients: ClientInfo[],
  pcNameKey: 'dpcName' | 'vpcName' | 'spcName',
  pcEmailKey: 'dpcEmail' | 'vpcEmail' | 'spcEmail',
  noAssignedLabel: string,
  countLookup?: Map<string, number>
): PCGroup[] {
  const groups = new Map<string, PCGroup>();
  const UNASSIGNED_KEY = '__UNASSIGNED__';

  for (const client of clients) {
    let count = 0;
    if (countLookup) {
      count = countLookup.get(client.clientId) ?? 0;
      if (count <= 0) continue; // no backlog for this client — skip
    }

    const name = client[pcNameKey];
    const email = client[pcEmailKey];
    const isUnassigned = !name && !email;
    const key = isUnassigned ? UNASSIGNED_KEY : name!;

    if (!groups.has(key)) {
      groups.set(key, {
        pcName: isUnassigned ? noAssignedLabel : name!,
        pcEmail: isUnassigned ? null : email,
        isUnassigned,
        totalClients: 0,
        totalCount: 0,
        clients: [],
      });
    }

    const group = groups.get(key)!;
    group.totalClients++;
    group.totalCount += count;
    group.clients.push({
      clientId: client.clientId,
      clientName: client.clientName,
      count,
    });
  }

  // Sort clients within each group alphabetically for stable, readable output
  for (const group of groups.values()) {
    group.clients.sort((a, b) => a.clientName.localeCompare(b.clientName));
  }

  // Named groups first (ranked biggest → smallest), "No Assigned" bucket last
  const named = [...groups.values()]
    .filter((g) => !g.isUnassigned)
    .sort((a, b) => b.totalClients - a.totalClients);
  const unassigned = [...groups.values()].filter((g) => g.isUnassigned);

  return [...named, ...unassigned];
}

// ─── Resolve PC name/email → Slack tag ────────────────────────────────────────

async function tagPC(name: string, email: string | null): Promise<string> {
  if (email) return getSlackIdOrName(email);
  return name;
}

// ─── Section builders ──────────────────────────────────────────────────────────

async function buildDiscoverySection(groups: PCGroup[]): Promise<string> {
  const totalClients = groups.reduce((sum, g) => sum + g.totalClients, 0);
  const lines: string[] = [
    '─────────────────────────────────────────────────',
    `:x: *Clients with 0 jobs discovered (Total Count: ${totalClients})*`,
  ];

  if (groups.length === 0) {
    lines.push(
      '_✅ Every active client had at least one job discovered yesterday._'
    );
    lines.push('');
    return lines.join('\n');
  }

  let rank = 1;
  for (const group of groups) {
    const tag = await tagPC(group.pcName, group.pcEmail);
    if (group.isUnassigned) {
      lines.push(`*${group.pcName}* | Total Count: ${group.totalClients}`);
    } else {
      lines.push(
        `:bust_in_silhouette: *${rank}.* ${tag} | Total Count: ${group.totalClients}`
      );
      rank++;
    }
    for (const c of group.clients) {
      lines.push(`• *${c.clientName}*`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

async function buildBacklogSection(groups: PCGroup[], title: string): Promise<string> {
  const totalJobs = groups.reduce((sum, g) => sum + g.totalCount, 0);
  const lines: string[] = [
    '─────────────────────────────────────────────────',
    `:x: *${title} (Total Count: ${totalJobs})*`,
  ];

  if (groups.length === 0) {
    lines.push('_✅ No backlog found for this stage._');
    lines.push('');
    return lines.join('\n');
  }

  let rank = 1;
  for (const group of groups) {
    const tag = await tagPC(group.pcName, group.pcEmail);
    if (group.isUnassigned) {
      lines.push(`*${group.pcName}* | Total Count: ${group.totalCount}`);
    } else {
      lines.push(
        `:bust_in_silhouette: *${rank}.* ${tag} | Total Count: ${group.totalCount}`
      );
      rank++;
    }
    for (const c of group.clients) {
      lines.push(`• *${c.clientName}*: ${c.count}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

// ─── Main job logic ─────────────────────────────────────────────────────────────

export async function runUnsatisfiedClientsJob() {
  logger.info('🚨 Running Unsatisfied Clients job...');

  const { start, end } = getYesterdayRange();

  const clients = await fetchAllActiveClients();

  if (clients.length === 0) {
    logger.info(
      'No active clients found, skipping unsatisfied clients report.'
    );
    return;
  }

  const clientIds = clients.map((c) => c.clientId);

  const [discoveredClientIds, unvettedMap, unsubmittedMap] = await Promise.all([
    fetchClientIdsWithDiscoveryYesterday(clientIds, start, end),
    fetchUnvettedCountsByClient(clientIds, start, end),
    fetchUnsubmittedCountsByClient(clientIds, start, end),
  ]);

  // Section 1: clients with NO discovery activity yesterday, grouped by DPC
  const clientsWithZeroDiscovery = clients.filter(
    (c) => !discoveredClientIds.has(c.clientId)
  );
  const discoveryGroups = groupClientsByPC(
    clientsWithZeroDiscovery,
    'dpcName',
    'dpcEmail',
    'No Assigned DPC'
  );

  // Section 2: clients with an unvetted backlog, grouped by VPC
  const vettingGroups = groupClientsByPC(
    clients,
    'vpcName',
    'vpcEmail',
    'No Assigned VPC',
    unvettedMap
  );

  // Section 3: clients with a vetted-but-unsubmitted backlog, grouped by SPC
  const submissionGroups = groupClientsByPC(
    clients,
    'spcName',
    'spcEmail',
    'No Assigned SPC',
    unsubmittedMap
  );

  logger.info(
    `Flagged: 0-discovery clients=${clientsWithZeroDiscovery.length} | vetting-groups=${vettingGroups.length} | submission-groups=${submissionGroups.length}`
  );

  console.table(
    discoveryGroups.map((g) => ({ pc: g.pcName, clients: g.totalClients }))
  );
  console.table(
    vettingGroups.map((g) => ({ pc: g.pcName, jobs: g.totalCount }))
  );
  console.table(
    submissionGroups.map((g) => ({ pc: g.pcName, jobs: g.totalCount }))
  );

  const discoverySection = await buildDiscoverySection(discoveryGroups);
  const vettingSection = await buildBacklogSection(
    vettingGroups,
    'Clients with 0 jobs vetted'
  );
  const submissionSection = await buildBacklogSection(
    submissionGroups,
    'Clients with 0 jobs submitted'
  );

  const body = [
    ':x: *Clients Without Application Activity*',
    '',
    discoverySection,
    vettingSection,
    submissionSection,
    `_Automated check · ${getYesterdayLabel(start)} · ${new Date().toISOString()}_`,
  ].join('\n');

  await SlackService.notify({
    location: getEnvironmentFromHost(process.env.CLIENT_APP_DOMAIN),
    host: process.env.CLIENT_APP_DOMAIN,
    node: SlackNode.BACKGROUND_JOB,
    provider: SlackProvider.SYSTEM,
    severity: SlackSeverity.INFO,
    trigger: 'Clients Without Application Activity - (System Job)',
    type: SlackEventType.SYSTEM_JOB,
    channel: SlackChannel.VA,
    body,
  });

  logger.info('✅ Unsatisfied Clients report sent successfully');
}

/**
 * Cron job: runs daily at 12:05 AM WAT (Africa/Lagos timezone).
 */
export function createUnsatisfiedClientsJob() {
  return cron.schedule(
    '5 0 * * *',
    async () => {
      try {
        await runUnsatisfiedClientsJob();
      } catch (error: any) {
        logger.error(`❌ Unsatisfied Clients job failed: ${error.message}`);
      }
    },
    {
      scheduled: false,
      timezone: 'Africa/Lagos',
    } as any
  );
}
