import cron from 'node-cron';
import { Op } from 'sequelize';
import { AiVettingComparison } from '../../models/v1/ai-vetting-comparison.model';
import { getServiceLogger } from '../../utils/createLogger';
import { SlackService } from '../../services/slack.service';
import {
  getEnvironmentFromHost,
} from '../../utils/slack-helpers';
import {
  SlackChannel,
  SlackEventType,
  SlackNode,
  SlackProvider,
  SlackSeverity,
} from '../../utils/enum';

const logger = getServiceLogger('ai-vetting-learning-report-job');

const SCORES = ['HQA', 'MQA', 'LQA'] as const;
type Score = (typeof SCORES)[number];

function isScore(value: string | null | undefined): value is Score {
  return !!value && (SCORES as readonly string[]).includes(value);
}

function getLastWeekRange(): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 7);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function getWeekLabel(): string {
  return new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Lagos',
  });
}

interface LearningReport {
  total: number;
  agreed: number;
  agreementRate: number;
  matrix: Record<string, number>;
  perScoreAccuracy: Record<string, number>;
  byScoreCounts: Record<string, number>;
}

function computeReport(rows: AiVettingComparison[]): LearningReport {
  const matrix: Record<string, number> = {};
  const byScoreCounts: Record<string, number> = {};

  let agreed = 0;

  for (const row of rows) {
    const ai = isScore(row.ai_score) ? row.ai_score : '?';
    const human = isScore(row.human_score) ? row.human_score : '?';

    const key = `${ai}|${human}`;
    matrix[key] = (matrix[key] || 0) + 1;

    if (isScore(row.ai_score)) {
      byScoreCounts[row.ai_score] = (byScoreCounts[row.ai_score] || 0) + 1;
    }

    if (row.agreement) {
      agreed++;
    }
  }

  const perScoreAccuracy: Record<string, number> = {};
  for (const score of SCORES) {
    let totalForScore = 0;
    let agreedForScore = 0;
    for (const row of rows) {
      if (row.ai_score === score) {
        totalForScore++;
        if (row.human_score === score) {
          agreedForScore++;
        }
      }
    }
    perScoreAccuracy[score] =
      totalForScore > 0
        ? Math.round((agreedForScore / totalForScore) * 100)
        : 0;
  }

  return {
    total: rows.length,
    agreed,
    agreementRate:
      rows.length > 0 ? Math.round((agreed / rows.length) * 100) : 0,
    matrix,
    perScoreAccuracy,
    byScoreCounts,
  };
}

function buildBody(report: LearningReport): string {
  const lines: string[] = [
    ':brain: *AI Vetting — Weekly Learning Report*',
    '',
    `• *Period:* last 7 days (to ${getWeekLabel()})`,
    `• *Comparisons:* ${report.total}`,
    `• *Agreements:* ${report.agreed}`,
    `• *Agreement Rate:* *${report.agreementRate}%*`,
    '',
    '*Per-Score Accuracy (AI vs Human)*',
    ...SCORES.map(
      (s) =>
        `• *${s}:* ${report.perScoreAccuracy[s]}% (${report.byScoreCounts[s] || 0} AI classifications)`
    ),
    '',
    '*Confusion Matrix (AI → Human)*',
  ];

  const matrixKeys = Object.keys(report.matrix);
  if (matrixKeys.length === 0) {
    lines.push('_No comparisons recorded in the last 7 days._');
  } else {
    lines.push(
      ...matrixKeys
        .sort()
        .map((key) => `• \`${key}\`: ${report.matrix[key]}`)
    );
  }

  lines.push(
    '',
    `_Automated check · ${new Date().toISOString()}_`
  );

  return lines.join('\n');
}

export async function runAiVettingLearningReportJob() {
  logger.info('🧠 Running AI Vetting Learning Report job...');

  const { start, end } = getLastWeekRange();

  const rows = await AiVettingComparison.findAll({
    where: {
      human_vetted_at: { [Op.gte]: start, [Op.lte]: end },
    },
  });

  logger.info(
    `Found ${rows.length} AI vetting comparison(s) in the last 7 days`
  );

  const report = computeReport(rows);

  console.table({
    total: report.total,
    agreed: report.agreed,
    agreementRate: `${report.agreementRate}%`,
    ...report.perScoreAccuracy,
  });

  await SlackService.notify({
    location: getEnvironmentFromHost(process.env.CLIENT_APP_DOMAIN),
    host: process.env.CLIENT_APP_DOMAIN,
    node: SlackNode.BACKGROUND_JOB,
    provider: SlackProvider.SYSTEM,
    severity: SlackSeverity.INFO,
    trigger: 'AI Vetting Learning Report - (System Job)',
    type: SlackEventType.SYSTEM_JOB,
    channel: SlackChannel.VA,
    body: buildBody(report),
  });

  logger.info('✅ AI Vetting Learning Report sent successfully');
}

/**
 * Cron job: runs every Monday at 8:30 AM WAT (Africa/Lagos timezone).
 */
export function createAiVettingLearningReportJob() {
  return cron.schedule(
    '30 8 * * 1',
    async () => {
      try {
        await runAiVettingLearningReportJob();
      } catch (error: any) {
        logger.error(
          `❌ AI Vetting Learning Report job failed: ${error.message}`
        );
      }
    },
    {
      scheduled: false,
      timezone: 'Africa/Lagos',
    } as any
  );
}
